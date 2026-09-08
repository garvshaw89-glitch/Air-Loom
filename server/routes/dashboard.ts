import express, { Request, Response } from 'express';
import { db } from '../db/database.js';
import { storage } from '../storage/StorageProvider.js';
import { MAX_UPLOAD_BYTES } from './upload.js';

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Overview analytics for dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const shares = await db.getAllShares();
    const storageStats = await storage.getStorageUsage();
    const downloadEventsCount = await db.getDownloadEventsCount();

    const activeShares = shares.filter((s) => s.status === 'active');
    const expiredShares = shares.filter((s) => s.status === 'expired');
    const protectedShares = shares.filter((s) => s.isPasswordProtected);

    const totalDownloads = shares.reduce((sum, s) => sum + s.downloadCount, 0);

    return res.json({
      totalShares: shares.length,
      activeSharesCount: activeShares.length,
      expiredSharesCount: expiredShares.length,
      protectedSharesCount: protectedShares.length,
      totalDownloads,
      totalEventsLogged: downloadEventsCount,
      storageUsedBytes: storageStats.totalBytes,
      storageFilesCount: storageStats.fileCount,
      maxFileSizeBytes: MAX_UPLOAD_BYTES,
      chunkSizeBytes: 5 * 1024 * 1024,
      platform: {
        streamingArchitecture: 'Chunked multi-part streaming (RAM safe)',
        supportsUpTo: `${(MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB`,
        rangeRequestsSupported: true,
        zipStreamingSupported: true,
      },
    });
  } catch (err: any) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve dashboard stats' });
  }
});

/**
 * GET /api/dashboard/shares
 * Retrieve all shares with enriched file and status data
 */
router.get('/shares', async (req: Request, res: Response) => {
  try {
    const shares = await db.getAllShares();
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL')
      ? process.env.APP_URL
      : `${protocol}://${host}`;

    const enriched = shares.map((s) => {
      const totalSize = s.files.reduce((acc, f) => acc + f.fileSize, 0);
      const shareUrl = `${appUrl.replace(/\/$/, '')}/share/${s.token}`;
      return {
        id: s.id,
        token: s.token,
        title: s.title,
        description: s.description,
        fileCount: s.files.length,
        totalSize,
        files: s.files,
        isPasswordProtected: s.isPasswordProtected,
        expiresAt: s.expiresAt,
        maxDownloads: s.maxDownloads,
        downloadCount: s.downloadCount,
        status: s.status,
        isBundle: s.isBundle,
        createdAt: s.createdAt,
        shareUrl,
      };
    });

    return res.json({ shares: enriched });
  } catch (err: any) {
    console.error('Dashboard shares error:', err);
    return res.status(500).json({ error: 'Failed to retrieve shares' });
  }
});

/**
 * POST /api/dashboard/cleanup
 * Clean expired files and temporary chunks
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const result = await db.cleanupExpired();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: 'Cleanup failed' });
  }
});

export default router;
