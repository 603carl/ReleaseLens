import { Router, Request, Response } from 'express';
import { getReleaseCandidateById } from '../store/release-candidate.store.js';
import { triageFailures } from '../engine/findings.engine.js';

export const findingsRouter = Router();

// ─── GET /api/findings/:releaseCandidateId ───────────────────
// FR-06: Return (or generate) findings for a release candidate.

findingsRouter.get('/:releaseCandidateId', async (req: Request, res: Response) => {
  try {
    const rc = getReleaseCandidateById(req.params.releaseCandidateId);
    if (!rc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Release candidate ${req.params.releaseCandidateId} not found` } });
    }

    // Triage (idempotent — returns existing findings if already computed)
    const findings = await triageFailures(rc.id);

    return res.json({ data: findings });
  } catch (err) {
    return res.status(500).json({ error: { code: 'TRIAGE_ERROR', message: (err as Error).message } });
  }
});
