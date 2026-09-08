import fs from 'fs';
import path from 'path';
import { DatabaseSchema, Share, StoredFile, UploadSession, DownloadEvent, User } from '../types.js';
import { storage } from '../storage/StorageProvider.js';

class Database {
  private dbPath: string;
  private data: DatabaseSchema = {
    shares: [],
    files: [],
    sessions: [],
    downloadEvents: [],
    users: [],
  };
  private isLoaded = false;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    const dataDir = process.env.DATABASE_DIR || path.join(process.cwd(), 'data');
    this.dbPath = path.join(dataDir, 'airloom.db.json');
  }

  async init(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    await fs.promises.mkdir(dir, { recursive: true });

    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = await fs.promises.readFile(this.dbPath, 'utf8');
        this.data = JSON.parse(raw);
        // Ensure array structures
        this.data.shares = this.data.shares || [];
        this.data.files = this.data.files || [];
        this.data.sessions = this.data.sessions || [];
        this.data.downloadEvents = this.data.downloadEvents || [];
        this.data.users = this.data.users || [];
      } else {
        await this.persistImmediately();
      }
      this.isLoaded = true;
      // Run initial expiration sweep
      await this.cleanupExpired();
    } catch (err) {
      console.error('Error initializing database file, falling back to empty store:', err);
      this.isLoaded = true;
    }
  }

  private async persistImmediately(): Promise<void> {
    const tempPath = `${this.dbPath}.${Date.now()}.tmp`;
    const json = JSON.stringify(this.data, null, 2);
    await fs.promises.writeFile(tempPath, json, 'utf8');
    await fs.promises.rename(tempPath, this.dbPath);
  }

  private scheduleSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.persistImmediately().catch((err) => {
        console.error('Failed to persist database:', err);
      });
    }, 150);
  }

  // --- Files ---
  async addFile(file: StoredFile): Promise<StoredFile> {
    this.data.files.push(file);
    this.scheduleSave();
    return file;
  }

  async getFile(id: string): Promise<StoredFile | undefined> {
    return this.data.files.find((f) => f.id === id);
  }

  async deleteFile(id: string): Promise<void> {
    const idx = this.data.files.findIndex((f) => f.id === id);
    if (idx !== -1) {
      const [removed] = this.data.files.splice(idx, 1);
      await storage.delete(removed.storageKey);
      this.scheduleSave();
    }
  }

  // --- Upload Sessions ---
  async createSession(session: UploadSession): Promise<UploadSession> {
    this.data.sessions = this.data.sessions.filter((s) => s.sessionId !== session.sessionId);
    this.data.sessions.push(session);
    this.scheduleSave();
    return session;
  }

  async getSession(sessionId: string): Promise<UploadSession | undefined> {
    return this.data.sessions.find((s) => s.sessionId === sessionId);
  }

  async recordChunkUploaded(sessionId: string, chunkIndex: number): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      if (!session.uploadedChunks.includes(chunkIndex)) {
        session.uploadedChunks.push(chunkIndex);
        this.scheduleSave();
      }
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.data.sessions = this.data.sessions.filter((s) => s.sessionId !== sessionId);
    await storage.cleanChunks(sessionId);
    this.scheduleSave();
  }

  // --- Shares ---
  async createShare(share: Share): Promise<Share> {
    this.data.shares.unshift(share);
    this.scheduleSave();
    return share;
  }

  async getShareByToken(token: string): Promise<Share | undefined> {
    const share = this.data.shares.find((s) => s.token === token);
    if (!share) return undefined;

    // Check expiration dynamically
    if (share.expiresAt && Date.now() > share.expiresAt) {
      share.status = 'expired';
      this.scheduleSave();
    }
    return share;
  }

  async getShareById(id: string): Promise<Share | undefined> {
    return this.data.shares.find((s) => s.id === id);
  }

  async getAllShares(): Promise<Share[]> {
    const now = Date.now();
    for (const share of this.data.shares) {
      if (share.expiresAt && now > share.expiresAt && share.status !== 'expired') {
        share.status = 'expired';
      }
    }
    return this.data.shares;
  }

  async incrementShareDownloads(shareId: string): Promise<void> {
    const share = this.data.shares.find((s) => s.id === shareId);
    if (share) {
      share.downloadCount += 1;
      if (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) {
        share.status = 'disabled';
      }
      this.scheduleSave();
    }
  }

  async updateShare(id: string, updates: Partial<Share>): Promise<Share | undefined> {
    const share = this.data.shares.find((s) => s.id === id);
    if (!share) return undefined;
    Object.assign(share, updates);
    this.scheduleSave();
    return share;
  }

  async deleteShare(id: string): Promise<boolean> {
    const idx = this.data.shares.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    const [deletedShare] = this.data.shares.splice(idx, 1);

    // Check if files are referenced by other shares before deleting storage
    for (const fileItem of deletedShare.files) {
      const isReferencedElsewhere = this.data.shares.some((s) =>
        s.files.some((f) => f.fileId === fileItem.fileId)
      );
      if (!isReferencedElsewhere) {
        await this.deleteFile(fileItem.fileId);
      }
    }

    this.scheduleSave();
    return true;
  }

  // --- Download Events ---
  async logDownloadEvent(event: DownloadEvent): Promise<void> {
    this.data.downloadEvents.push(event);
    if (this.data.downloadEvents.length > 5000) {
      this.data.downloadEvents.splice(0, 1000); // cap log size
    }
    this.scheduleSave();
  }

  async getDownloadEventsCount(): Promise<number> {
    return this.data.downloadEvents.length;
  }

  // --- Users (Optional Auth) ---
  async createUser(user: User): Promise<User> {
    this.data.users.push(user);
    this.scheduleSave();
    return user;
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  async findUserById(id: string): Promise<User | undefined> {
    return this.data.users.find((u) => u.id === id);
  }

  // --- Cleanup Expired Shares and Stale Sessions ---
  async cleanupExpired(): Promise<{ expiredSharesCount: number; cleanedSessionsCount: number }> {
    const now = Date.now();
    let expiredSharesCount = 0;
    let cleanedSessionsCount = 0;

    // Clean stale upload sessions older than 6 hours
    const validSessions: UploadSession[] = [];
    for (const session of this.data.sessions) {
      if (now > session.expiresAt || (now - session.createdAt > 6 * 3600 * 1000)) {
        await storage.cleanChunks(session.sessionId);
        cleanedSessionsCount++;
      } else {
        validSessions.push(session);
      }
    }
    this.data.sessions = validSessions;

    // Mark shares expired and optionally clean unreferenced files
    for (const share of this.data.shares) {
      if (share.expiresAt && now > share.expiresAt && share.status !== 'expired') {
        share.status = 'expired';
        expiredSharesCount++;
      }
    }

    if (expiredSharesCount > 0 || cleanedSessionsCount > 0) {
      this.scheduleSave();
    }

    return { expiredSharesCount, cleanedSessionsCount };
  }
}

export const db = new Database();
