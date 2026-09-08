import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';

export interface StorageMetadata {
  size: number;
  mtime: Date;
}

export interface StorageProvider {
  init(): Promise<void>;
  saveChunk(sessionId: string, chunkIndex: number, chunkBuffer: Buffer): Promise<void>;
  assembleFile(sessionId: string, totalChunks: number, targetKey: string): Promise<{ size: number; checksum: string }>;
  createReadStream(key: string, options?: { start?: number; end?: number }): fs.ReadStream;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<StorageMetadata>;
  cleanChunks(sessionId: string): Promise<void>;
  getStorageUsage(): Promise<{ totalBytes: number; fileCount: number }>;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private filesDir: string;
  private chunksDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.STORAGE_PATH || path.join(process.cwd(), 'data', 'storage');
    this.filesDir = path.join(this.baseDir, 'files');
    this.chunksDir = path.join(this.baseDir, 'chunks');
  }

  async init(): Promise<void> {
    await fs.promises.mkdir(this.filesDir, { recursive: true });
    await fs.promises.mkdir(this.chunksDir, { recursive: true });
  }

  private getSessionChunkDir(sessionId: string): string {
    // Prevent any directory traversal in session ID
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(this.chunksDir, safeSessionId);
  }

  private getFilePath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, '');
    return path.join(this.filesDir, safeKey);
  }

  async saveChunk(sessionId: string, chunkIndex: number, chunkBuffer: Buffer): Promise<void> {
    const sessionDir = this.getSessionChunkDir(sessionId);
    await fs.promises.mkdir(sessionDir, { recursive: true });
    const chunkPath = path.join(sessionDir, `${chunkIndex}.chunk`);
    await fs.promises.writeFile(chunkPath, chunkBuffer);
  }

  async assembleFile(sessionId: string, totalChunks: number, targetKey: string): Promise<{ size: number; checksum: string }> {
    const sessionDir = this.getSessionChunkDir(sessionId);
    const targetPath = this.getFilePath(targetKey);

    // Verify all chunks exist before writing
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(sessionDir, `${i}.chunk`);
      const exists = fs.existsSync(chunkPath);
      if (!exists) {
        throw new Error(`Missing chunk index ${i} of ${totalChunks}`);
      }
    }

    const hash = crypto.createHash('sha256');
    const writeStream = fs.createWriteStream(targetPath, { flags: 'w' });
    let totalBytes = 0;

    // Stream each chunk sequentially to prevent loading the file into memory
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(sessionDir, `${i}.chunk`);
      const chunkStream = fs.createReadStream(chunkPath);

      await new Promise<void>((resolve, reject) => {
        chunkStream.on('data', (data: Buffer) => {
          hash.update(data);
          totalBytes += data.length;
          writeStream.write(data);
        });
        chunkStream.on('end', () => resolve());
        chunkStream.on('error', (err) => reject(err));
      });
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.on('error', (err) => reject(err));
    });

    // Clean up chunks
    await this.cleanChunks(sessionId);

    return {
      size: totalBytes,
      checksum: hash.digest('hex'),
    };
  }

  createReadStream(key: string, options?: { start?: number; end?: number }): fs.ReadStream {
    const filePath = this.getFilePath(key);
    return fs.createReadStream(filePath, options);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.warn(`Could not delete storage key ${key}:`, err);
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<StorageMetadata> {
    const filePath = this.getFilePath(key);
    const stats = await fs.promises.stat(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime,
    };
  }

  async cleanChunks(sessionId: string): Promise<void> {
    const sessionDir = this.getSessionChunkDir(sessionId);
    try {
      if (fs.existsSync(sessionDir)) {
        await fs.promises.rm(sessionDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`Could not clean chunk directory for ${sessionId}:`, err);
    }
  }

  async getStorageUsage(): Promise<{ totalBytes: number; fileCount: number }> {
    try {
      const files = await fs.promises.readdir(this.filesDir);
      let totalBytes = 0;
      let fileCount = 0;
      for (const file of files) {
        const filePath = path.join(this.filesDir, file);
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.isFile()) {
            totalBytes += stats.size;
            fileCount++;
          }
        } catch {
          // ignore transient file stats errors
        }
      }
      return { totalBytes, fileCount };
    } catch {
      return { totalBytes: 0, fileCount: 0 };
    }
  }
}

export const storage = new LocalStorageProvider();
