import express, { Request, Response } from 'express';
import * as archiverModule from 'archiver';
const archiver: any = (archiverModule as any).default || archiverModule;
import QRCode from 'qrcode';
import { db } from '../db/database.js';
import { storage } from '../storage/StorageProvider.js';
import {
  generateSecureToken,
  generateId,
  hashPassword,
  verifyPassword,
  createUnlockToken,
  verifyUnlockToken,
} from '../security/crypto.js';
import { Share, ShareFile, DownloadEvent } from '../types.js';

const router = express.Router();

function calculateExpiration(option: string): number | null {
  const now = Date.now();
  switch (option) {
    case '1h':
      return now + 1 * 3600 * 1000;
    case '6h':
      return now + 6 * 3600 * 1000;
    case '24h':
      return now + 24 * 3600 * 1000;
    case '3d':
      return now + 3 * 24 * 3600 * 1000;
    case '7d':
      return now + 7 * 24 * 3600 * 1000;
    case 'never':
      return null;
    default:
      // Custom timestamp or default 24h
      const parsed = parseInt(option, 10);
      return !isNaN(parsed) && parsed > now ? parsed : now + 24 * 3600 * 1000;
  }
}

/**
 * 1. Create a new Share (Single or Bundle)
 * POST /api/shares or POST /api/shares/create
 */
router.post(['/', '/create'], async (req: Request, res: Response) => {
  try {
    const {
      fileIds,
      title,
      description,
      password,
      expiration = '24h',
      maxDownloads = null,
      isIndividual = false,
    } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'At least one fileId is required to create a share' });
    }

    // Resolve files
    const shareFiles: ShareFile[] = [];
    for (const id of fileIds) {
      const file = await db.getFile(id);
      if (file) {
        shareFiles.push({
          fileId: file.id,
          fileName: file.originalName,
          fileSize: file.size,
          mimeType: file.mimeType,
          checksum: file.checksum,
        });
      }
    }

    if (shareFiles.length === 0) {
      return res.status(404).json({ error: 'No valid files found for the provided file IDs' });
    }

    // If individual shares requested for multiple files, create separate shares
    if (isIndividual && shareFiles.length > 1) {
      const createdShares: any[] = [];
      for (const singleFile of shareFiles) {
        const token = generateSecureToken();
        const shareId = generateId();

        let passwordHash: string | undefined;
        let passwordSalt: string | undefined;
        const isPasswordProtected = !!(password && password.trim().length > 0);

        if (isPasswordProtected) {
          const hashed = hashPassword(password.trim());
          passwordHash = hashed.hash;
          passwordSalt = hashed.salt;
        }

        const share: Share = {
          id: shareId,
          token,
          title: singleFile.fileName,
          description: description || undefined,
          files: [singleFile],
          isPasswordProtected,
          passwordHash,
          passwordSalt,
          expiresAt: calculateExpiration(expiration),
          maxDownloads: typeof maxDownloads === 'number' && maxDownloads > 0 ? maxDownloads : null,
          downloadCount: 0,
          status: 'active',
          isBundle: false,
          createdAt: Date.now(),
        };

        await db.createShare(share);
        createdShares.push(share);
      }

      return res.json({
        success: true,
        isMultiple: true,
        shares: createdShares,
      });
    }

    // Create a bundle or single share
    const token = generateSecureToken();
    const shareId = generateId();

    let passwordHash: string | undefined;
    let passwordSalt: string | undefined;
    const isPasswordProtected = !!(password && password.trim().length > 0);

    if (isPasswordProtected) {
      const hashed = hashPassword(password.trim());
      passwordHash = hashed.hash;
      passwordSalt = hashed.salt;
    }

    const defaultTitle =
      shareFiles.length === 1
        ? shareFiles[0].fileName
        : `Air Loom Bundle (${shareFiles.length} files)`;

    const share: Share = {
      id: shareId,
      token,
      title: title && title.trim() ? title.trim() : defaultTitle,
      description: description || undefined,
      files: shareFiles,
      isPasswordProtected,
      passwordHash,
      passwordSalt,
      expiresAt: calculateExpiration(expiration),
      maxDownloads: typeof maxDownloads === 'number' && maxDownloads > 0 ? maxDownloads : null,
      downloadCount: 0,
      status: 'active',
      isBundle: shareFiles.length > 1,
      createdAt: Date.now(),
    };

    await db.createShare(share);

    return res.json({
      success: true,
      share: {
        id: share.id,
        token: share.token,
        title: share.title,
        description: share.description,
        files: share.files,
        isPasswordProtected: share.isPasswordProtected,
        expiresAt: share.expiresAt,
        maxDownloads: share.maxDownloads,
        downloadCount: share.downloadCount,
        status: share.status,
        isBundle: share.isBundle,
        createdAt: share.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Create share error:', err);
    return res.status(500).json({ error: 'Failed to create file share' });
  }
});

/**
 * Helper to verify unlock authentication for protected share
 */
function isShareUnlocked(share: Share, req: Request): boolean {
  if (!share.isPasswordProtected) return true;
  const unlockToken = (req.headers['x-airloom-unlock'] as string) || (req.query.unlock as string);
  if (!unlockToken) return false;
  return verifyUnlockToken(share.id, unlockToken);
}

/**
 * 2. Get share metadata by secure token
 * GET /api/shares/:token
 */
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const share = await db.getShareByToken(token);

    if (!share) {
      return res.status(404).json({ error: 'Share not found or link has expired' });
    }

    const now = Date.now();
    const isExpired = !!(share.expiresAt && now > share.expiresAt) || share.status === 'expired';
    const isLimitReached = !!(share.maxDownloads !== null && share.downloadCount >= share.maxDownloads);
    const isDisabled = share.status === 'disabled';

    const totalSize = share.files.reduce((acc, f) => acc + f.fileSize, 0);
    const unlocked = isShareUnlocked(share, req);

    const publicData: any = {
      id: share.id,
      token: share.token,
      title: share.title,
      description: share.description,
      isPasswordProtected: share.isPasswordProtected,
      isUnlocked: unlocked,
      isBundle: share.isBundle,
      fileCount: share.files.length,
      totalSize,
      expiresAt: share.expiresAt,
      maxDownloads: share.maxDownloads,
      downloadCount: share.downloadCount,
      status: share.status,
      isExpired,
      isLimitReached,
      isDisabled,
      createdAt: share.createdAt,
    };

    // Only provide files list if unlocked or public
    if (!share.isPasswordProtected || unlocked) {
      publicData.files = share.files;
    }

    return res.json(publicData);
  } catch (err: any) {
    console.error('Get share error:', err);
    return res.status(500).json({ error: 'Internal server error fetching share' });
  }
});

/**
 * 3. Unlock a password-protected share
 * POST /api/shares/:token/unlock
 */
router.post('/:token/unlock', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const share = await db.getShareByToken(token);
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    if (!share.isPasswordProtected) {
      return res.json({
        success: true,
        unlockToken: 'public',
        files: share.files,
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const isValid = verifyPassword(password, share.passwordHash || '', share.passwordSalt || '');
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const unlockToken = createUnlockToken(share.id);

    return res.json({
      success: true,
      unlockToken,
      files: share.files,
    });
  } catch (err: any) {
    console.error('Unlock share error:', err);
    return res.status(500).json({ error: 'Failed to verify password' });
  }
});

/**
 * 4. Download a single file from share with HTTP Range support
 * GET /api/shares/:token/download/:fileId
 */
router.get('/:token/download/:fileId', async (req: Request, res: Response) => {
  try {
    const { token, fileId } = req.params;
    const share = await db.getShareByToken(token);

    if (!share) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    // Check expiration
    if (share.expiresAt && Date.now() > share.expiresAt) {
      return res.status(410).json({ error: 'This Air Loom share has expired.' });
    }

    // Check download limit
    if (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) {
      return res.status(403).json({ error: 'Download limit reached for this share.' });
    }

    if (share.status === 'disabled') {
      return res.status(403).json({ error: 'This share has been disabled by the owner.' });
    }

    // Check password protection
    if (share.isPasswordProtected && !isShareUnlocked(share, req)) {
      return res.status(401).json({ error: 'Password unlock required to download files.' });
    }

    const shareFile = share.files.find((f) => f.fileId === fileId);
    if (!shareFile) {
      return res.status(404).json({ error: 'File not found in this share' });
    }

    const storedFile = await db.getFile(fileId);
    if (!storedFile) {
      return res.status(404).json({ error: 'File storage record not found' });
    }

    const exists = await storage.exists(storedFile.storageKey);
    if (!exists) {
      return res.status(404).json({ error: 'Physical storage file missing' });
    }

    const fileSize = storedFile.size;
    const rangeHeader = req.headers.range;

    // Record download event & increment count
    await db.incrementShareDownloads(share.id);
    await db.logDownloadEvent({
      id: generateId(),
      shareId: share.id,
      fileId: storedFile.id,
      downloadedAt: Date.now(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      isZipBundle: false,
    });

    const safeFilename = encodeURIComponent(storedFile.originalName).replace(/['()]/g, escape);
    res.setHeader('Content-Type', storedFile.mimeType || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${storedFile.sanitizedName}"; filename*=UTF-8''${safeFilename}`
    );

    // Handle HTTP Range for resumable downloads & media streaming
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).end();
      }

      const chunkLength = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkLength);

      const stream = storage.createReadStream(storedFile.storageKey, { start, end });
      return stream.pipe(res);
    } else {
      res.setHeader('Content-Length', fileSize);
      const stream = storage.createReadStream(storedFile.storageKey);
      return stream.pipe(res);
    }
  } catch (err: any) {
    console.error('File download error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'File download failed' });
    }
  }
});

/**
 * 5. Download all files as a streaming ZIP bundle
 * GET /api/shares/:token/download-all
 */
router.get('/:token/download-all', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const share = await db.getShareByToken(token);

    if (!share) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    if (share.expiresAt && Date.now() > share.expiresAt) {
      return res.status(410).json({ error: 'This Air Loom share has expired.' });
    }

    if (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) {
      return res.status(403).json({ error: 'Download limit reached for this share.' });
    }

    if (share.status === 'disabled') {
      return res.status(403).json({ error: 'This share has been disabled by the owner.' });
    }

    if (share.isPasswordProtected && !isShareUnlocked(share, req)) {
      return res.status(401).json({ error: 'Password unlock required to download files.' });
    }

    // Increment download count and record event
    await db.incrementShareDownloads(share.id);
    await db.logDownloadEvent({
      id: generateId(),
      shareId: share.id,
      downloadedAt: Date.now(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      isZipBundle: true,
    });

    const zipFilename = `AirLoom_${share.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiver('zip', {
      zlib: { level: 5 }, // Balanced compression
    });

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    archive.pipe(res);

    // Stream each file directly into the archive without memory buffering
    for (const item of share.files) {
      const stored = await db.getFile(item.fileId);
      if (stored) {
        const stream = storage.createReadStream(stored.storageKey);
        archive.append(stream, { name: stored.originalName });
      }
    }

    await archive.finalize();
  } catch (err: any) {
    console.error('Download-all error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to create zip bundle' });
    }
  }
});

/**
 * 6. Generate server-side QR Code (PNG or SVG)
 * GET /api/shares/:token/qr
 */
router.get('/:token/qr', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const format = req.query.format === 'svg' ? 'svg' : 'png';
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const appUrl = process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL')
      ? process.env.APP_URL
      : `${protocol}://${host}`;

    const shareUrl = `${appUrl.replace(/\/$/, '')}/share/${token}`;

    if (format === 'svg') {
      const svg = await QRCode.toString(shareUrl, {
        type: 'svg',
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    } else {
      const buffer = await QRCode.toBuffer(shareUrl, {
        type: 'png',
        margin: 2,
        scale: 8,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      res.setHeader('Content-Type', 'image/png');
      return res.send(buffer);
    }
  } catch (err: any) {
    console.error('QR code generation error:', err);
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

/**
 * 7. Toggle share status (active/disabled)
 * POST /api/shares/:id/toggle
 */
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const share = await db.getShareById(id);
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    const newStatus = share.status === 'active' ? 'disabled' : 'active';
    await db.updateShare(id, { status: newStatus });
    return res.json({ success: true, status: newStatus });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update share' });
  }
});

/**
 * 8. Regenerate share token
 * POST /api/shares/:id/regenerate
 */
router.post('/:id/regenerate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const share = await db.getShareById(id);
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    const newToken = generateSecureToken();
    await db.updateShare(id, { token: newToken });
    return res.json({ success: true, token: newToken });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to regenerate share token' });
  }
});

/**
 * 9. Delete a share
 * DELETE /api/shares/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await db.deleteShare(id);
    if (!success) {
      return res.status(404).json({ error: 'Share not found' });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete share' });
  }
});

export default router;
