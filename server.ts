import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

import { db } from './server/db/database.js';
import { storage } from './server/storage/StorageProvider.js';
import uploadRouter from './server/routes/upload.js';
import sharesRouter from './server/routes/shares.js';
import dashboardRouter from './server/routes/dashboard.js';
import authRouter from './server/routes/auth.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize storage provider and database store
  await storage.init();
  await db.init();
  console.log('[Air Loom] Storage and database initialized successfully.');

  // Security headers & CORS
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Body parsers
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API Routes
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Air Loom File Transfer Engine',
      timestamp: Date.now(),
    });
  });

  app.use('/api/upload', uploadRouter);
  app.use('/api/shares', sharesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/auth', authRouter);

  // Background cleanup routine every 15 minutes
  setInterval(async () => {
    try {
      await db.cleanupExpired();
    } catch (err) {
      console.error('[Air Loom] Periodic cleanup failed:', err);
    }
  }, 15 * 60 * 1000);

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Air Loom Server Error]:', err);
    if (res.headersSent) {
      return next(err);
    }
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || 'An unexpected internal server error occurred',
    });
  });

  // Vite middleware in dev / Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Air Loom] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Air Loom] Fatal server startup error:', err);
  process.exit(1);
});
