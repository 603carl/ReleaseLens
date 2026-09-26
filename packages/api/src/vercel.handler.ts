import type { Request, Response } from 'express';
import { app } from './app.js';
import { initDb } from './store/db.js';

let initialization: ReturnType<typeof initDb> | undefined;

async function ensureInitialized(): Promise<void> {
  initialization ??= initDb().catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
  await initialization;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    await ensureInitialized();
    app(req, res);
  } catch (error) {
    console.error('[ReleaseLens API] Fatal serverless startup error:', error);
    res.status(500).json({
      error: { code: 'STARTUP_ERROR', message: 'The API could not initialize.' },
    });
  }
}