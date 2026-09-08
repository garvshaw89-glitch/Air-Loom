import express, { Request, Response } from 'express';
import { db } from '../db/database.js';
import { storage } from '../storage/StorageProvider.js';
import { generateId, sanitizeFilename } from '../security/crypto.js';
import { StoredFile, UploadSession } from '../types.js';

const router = express.Router();

// Parse size string like "10GB", "500MB" to bytes
export function parseSizeToBytes(sizeStr?: string): number {
  if (!sizeStr) return 10 * 1024 * 1024 * 1024; // 10 GB default
  const clean = sizeStr.trim().toUpperCase();
  const match = clean.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B?)$/);
  if (!match) return 10 * 1024 * 1024 * 1024;
  const num = parseFloat(match[1]);
  const unit = match[2];
  if (unit.startsWith('T')) return num * 1024 * 1024 * 1024 * 1024;
  if (unit.startsWith('G')) return num * 1024 * 1024 * 1024;
  if (unit.startsWith('M')) return num * 1024 * 1024;
  if (unit.startsWith('K')) return num * 1024;
  return num;
}

export const MAX_UPLOAD_BYTES = parseSizeToBytes(process.env.MAX_FILE_SIZE || '10GB');

/**
 * 1. Initialize an upload session
 * POST /api/upload/init
 */
router.post('/init', async (req: Request, res: Response) => {
  try {
    const { fileName, fileSize, mimeType, chunkSize, totalChunks } = req.body;

    if (!fileName || typeof fileSize !== 'number' || fileSize <= 0) {
      return res.status(400).json({ error: 'Valid fileName and fileSize are required' });
    }

    if (fileSize > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        error: `File size exceeds the configured maximum limit of ${(MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)).toFixed(1)} GB.`,
      });
    }

    const calculatedChunkSize = chunkSize || (5 * 1024 * 1024); // default 5 MB chunks
    const calculatedTotalChunks = totalChunks || Math.ceil(fileSize / calculatedChunkSize);

    const sessionId = generateId();
    const session: UploadSession = {
      sessionId,
      fileName: sanitizeFilename(fileName),
      fileSize,
      mimeType: mimeType || 'application/octet-stream',
      chunkSize: calculatedChunkSize,
      totalChunks: calculatedTotalChunks,
      uploadedChunks: [],
      createdAt: Date.now(),
      expiresAt: Date.now() + 6 * 3600 * 1000, // 6h chunk session window
    };

    await db.createSession(session);

    return res.json({
      sessionId,
      chunkSize: calculatedChunkSize,
      totalChunks: calculatedTotalChunks,
      maxFileSizeBytes: MAX_UPLOAD_BYTES,
    });
  } catch (err: any) {
    console.error('Upload init error:', err);
    return res.status(500).json({ error: 'Failed to initialize upload session' });
  }
});

/**
 * 2. Upload a single chunk via raw octet-stream
 * POST /api/upload/chunk
 */
router.post(
  '/chunk',
  express.raw({ type: 'application/octet-stream', limit: '50mb' }),
  async (req: Request, res: Response) => {
    try {
      const sessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);
      const chunkIndexRaw = (req.headers['x-chunk-index'] as string) || (req.query.chunkIndex as string);

      if (!sessionId || chunkIndexRaw === undefined) {
        return res.status(400).json({ error: 'x-session-id and x-chunk-index headers are required' });
      }

      const chunkIndex = parseInt(chunkIndexRaw, 10);
      if (isNaN(chunkIndex) || chunkIndex < 0) {
        return res.status(400).json({ error: 'Invalid chunk index' });
      }

      const session = await db.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Upload session not found or expired' });
      }

      const buffer = req.body as Buffer;
      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: 'Empty chunk data received' });
      }

      // Save chunk to storage provider
      await storage.saveChunk(sessionId, chunkIndex, buffer);
      await db.recordChunkUploaded(sessionId, chunkIndex);

      return res.json({
        success: true,
        chunkIndex,
        receivedBytes: buffer.length,
        totalUploadedChunks: session.uploadedChunks.length,
      });
    } catch (err: any) {
      console.error('Chunk upload error:', err);
      return res.status(500).json({ error: 'Failed to save chunk' });
    }
  }
);

/**
 * 3. Complete and assemble all chunks
 * POST /api/upload/complete
 */
router.post('/complete', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found or expired' });
    }

    const fileId = generateId();
    const sanitizedName = sanitizeFilename(session.fileName);
    const storageKey = `${fileId}_${sanitizedName}`;

    // Assemble file streams sequentially & compute SHA-256
    const { size, checksum } = await storage.assembleFile(
      sessionId,
      session.totalChunks,
      storageKey
    );

    const storedFile: StoredFile = {
      id: fileId,
      originalName: session.fileName,
      sanitizedName,
      storageKey,
      size,
      mimeType: session.mimeType,
      checksum,
      createdAt: Date.now(),
    };

    await db.addFile(storedFile);
    await db.deleteSession(sessionId);

    return res.json({
      success: true,
      file: {
        id: storedFile.id,
        originalName: storedFile.originalName,
        size: storedFile.size,
        mimeType: storedFile.mimeType,
        checksum: storedFile.checksum,
        createdAt: storedFile.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Upload complete error:', err);
    return res.status(500).json({ error: err.message || 'Failed to assemble file' });
  }
});

/**
 * 4. Cancel an upload session
 * POST /api/upload/cancel
 */
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) {
      await db.deleteSession(sessionId);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to cancel upload session' });
  }
});

export default router;
