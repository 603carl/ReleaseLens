import { Router } from 'express';
import { resetDb } from '../store/db.js';

export const demoRouter = Router();

/**
 * POST /api/demo/reset
 * Truncates all demo state so the controlled scenario can be re-run.
 * FR-09: Demo reset.
 */
demoRouter.post('/reset', (_req, res) => {
  try {
    resetDb();
    res.json({ data: { message: 'Demo state reset successfully.', timestamp: new Date().toISOString() } });
  } catch (err) {
    res.status(500).json({ error: { code: 'RESET_FAILED', message: (err as Error).message } });
  }
});
