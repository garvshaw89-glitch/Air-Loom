import {
  UploadItem,
  UploadedFile,
  CreateSharePayload,
  ShareData,
  DashboardStats,
} from '../types';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

export interface ChunkProgressCallback {
  (params: {
    progress: number;
    uploadedBytes: number;
    speed: number;
    eta: number;
    status: 'uploading' | 'assembling';
  }): void;
}

/**
 * Real chunked streaming upload engine
 * Handles files up to 10 GB with memory-safe slices
 */
export async function uploadFileChunked(
  file: File,
  onProgress: ChunkProgressCallback,
  signal?: AbortSignal
): Promise<UploadedFile> {
  const totalSize = file.size;
  const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));

  // 1. Initialize upload session
  const initRes = await fetch('/api/upload/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: totalSize,
      mimeType: file.type || 'application/octet-stream',
      chunkSize: CHUNK_SIZE,
      totalChunks,
    }),
    signal,
  });

  if (!initRes.ok) {
    const errData = await initRes.json().catch(() => ({}));
    throw new Error(errData.error || `Upload failed with status ${initRes.status}`);
  }

  const { sessionId } = await initRes.json();

  let uploadedBytes = 0;
  const startTime = Date.now();

  // 2. Stream chunks sequentially
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    if (signal?.aborted) {
      // Cancel session on server
      await fetch('/api/upload/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
      throw new Error('Upload cancelled');
    }

    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkBlob = file.slice(start, end);
    const chunkArrayBuffer = await chunkBlob.arrayBuffer();

    const chunkUploadRes = await fetch('/api/upload/chunk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-session-id': sessionId,
        'x-chunk-index': chunkIndex.toString(),
      },
      body: chunkArrayBuffer,
      signal,
    });

    if (!chunkUploadRes.ok) {
      const err = await chunkUploadRes.json().catch(() => ({}));
      throw new Error(err.error || `Chunk ${chunkIndex} failed`);
    }

    uploadedBytes += chunkBlob.size;
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const speed = elapsedSeconds > 0 ? uploadedBytes / elapsedSeconds : 0;
    const remainingBytes = totalSize - uploadedBytes;
    const eta = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;
    const percent = Math.min(99, Math.round((uploadedBytes / totalSize) * 100));

    onProgress({
      progress: percent,
      uploadedBytes,
      speed,
      eta,
      status: 'uploading',
    });
  }

  // 3. Complete and assemble
  onProgress({
    progress: 100,
    uploadedBytes: totalSize,
    speed: 0,
    eta: 0,
    status: 'assembling',
  });

  const completeRes = await fetch('/api/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
    signal,
  });

  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}));
    throw new Error(err.error || 'Server file assembly failed');
  }

  const { file: assembledFile } = await completeRes.json();
  return assembledFile;
}

/**
 * Create share (bundle or individual)
 */
export async function createShare(payload: CreateSharePayload): Promise<{
  isMultiple?: boolean;
  share?: ShareData;
  shares?: ShareData[];
}> {
  const res = await fetch('/api/shares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create share');
  }

  return res.json();
}

/**
 * Fetch public or unlocked share data
 */
export async function getShare(token: string, unlockToken?: string): Promise<ShareData> {
  const headers: Record<string, string> = {};
  if (unlockToken) {
    headers['x-airloom-unlock'] = unlockToken;
  }

  const res = await fetch(`/api/shares/${token}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Share not found or expired');
  }

  return res.json();
}

/**
 * Unlock a password protected share
 */
export async function unlockShare(
  token: string,
  password: string
): Promise<{ success: boolean; unlockToken: string; files: any[] }> {
  const res = await fetch(`/api/shares/${token}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Incorrect password');
  }

  return res.json();
}

/**
 * Fetch dashboard shares
 */
export async function getDashboardShares(): Promise<ShareData[]> {
  const res = await fetch('/api/dashboard/shares');
  if (!res.ok) {
    throw new Error('Failed to load shares');
  }
  const data = await res.json();
  return data.shares || [];
}

/**
 * Fetch dashboard stats
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) {
    throw new Error('Failed to load stats');
  }
  return res.json();
}

/**
 * Toggle share status
 */
export async function toggleShareStatus(id: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`/api/shares/${id}/toggle`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle share');
  return res.json();
}

/**
 * Regenerate share token
 */
export async function regenerateShareToken(id: string): Promise<{ success: boolean; token: string }> {
  const res = await fetch(`/api/shares/${id}/regenerate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to regenerate token');
  return res.json();
}

/**
 * Delete share
 */
export async function deleteShare(id: string): Promise<boolean> {
  const res = await fetch(`/api/shares/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete share');
  return true;
}

/**
 * Trigger cleanup
 */
export async function triggerCleanup(): Promise<{ expiredSharesCount: number; cleanedSessionsCount: number }> {
  const res = await fetch('/api/dashboard/cleanup', { method: 'POST' });
  if (!res.ok) throw new Error('Cleanup failed');
  return res.json();
}

/**
 * Utility: Format bytes into human readable format (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Utility: Format speed (bytes/sec) into human readable speed
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '0 KB/s';
  return `${formatBytes(bytesPerSecond, 1)}/s`;
}

/**
 * Utility: Format ETA in seconds
 */
export function formatETA(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Done';
  if (seconds < 60) return `${seconds}s left`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s left`;
}
