export interface UploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'assembling' | 'completed' | 'error' | 'cancelled';
  progress: number; // 0 - 100
  uploadedBytes: number;
  speed: number; // bytes per second
  eta: number; // seconds remaining
  error?: string;
  result?: UploadedFile;
  abortController?: AbortController;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  checksum: string;
  createdAt: number;
}

export interface ShareFileSummary {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
}

export interface ShareData {
  id: string;
  token: string;
  title: string;
  description?: string;
  files: ShareFileSummary[];
  isPasswordProtected: boolean;
  isUnlocked?: boolean;
  expiresAt: number | null;
  maxDownloads: number | null;
  downloadCount: number;
  status: 'active' | 'disabled' | 'expired';
  isBundle: boolean;
  fileCount?: number;
  totalSize?: number;
  createdAt: number;
  shareUrl?: string;
  isExpired?: boolean;
  isLimitReached?: boolean;
  isDisabled?: boolean;
}

export interface CreateSharePayload {
  fileIds: string[];
  title?: string;
  description?: string;
  password?: string;
  expiration: 'never' | '1h' | '6h' | '24h' | '3d' | '7d' | string;
  maxDownloads?: number | null;
  isIndividual?: boolean;
}

export interface DashboardStats {
  totalShares: number;
  activeSharesCount: number;
  expiredSharesCount: number;
  protectedSharesCount: number;
  totalDownloads: number;
  totalEventsLogged: number;
  storageUsedBytes: number;
  storageFilesCount: number;
  maxFileSizeBytes: number;
  chunkSizeBytes: number;
  platform: {
    streamingArchitecture: string;
    supportsUpTo: string;
    rangeRequestsSupported: boolean;
    zipStreamingSupported: boolean;
  };
}

export type ThemeMode = 'dark' | 'light' | 'system';
