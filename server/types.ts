export interface StoredFile {
  id: string;
  originalName: string;
  sanitizedName: string;
  storageKey: string;
  size: number;
  mimeType: string;
  checksum: string;
  createdAt: number;
}

export interface ShareFile {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
}

export interface Share {
  id: string;
  token: string;
  title: string;
  description?: string;
  files: ShareFile[];
  isPasswordProtected: boolean;
  passwordHash?: string;
  passwordSalt?: string;
  expiresAt: number | null; // null = never
  maxDownloads: number | null; // null = unlimited
  downloadCount: number;
  status: 'active' | 'disabled' | 'expired';
  isBundle: boolean;
  createdAt: number;
  createdBy?: string; // user id or 'anonymous'
}

export interface DownloadEvent {
  id: string;
  shareId: string;
  fileId?: string;
  downloadedAt: number;
  ip?: string;
  userAgent?: string;
  isZipBundle: boolean;
}

export interface UploadSession {
  sessionId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  createdAt: number;
  expiresAt: number;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: number;
}

export interface DatabaseSchema {
  shares: Share[];
  files: StoredFile[];
  sessions: UploadSession[];
  downloadEvents: DownloadEvent[];
  users: User[];
}
