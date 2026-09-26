import { Router, type Request, type Response } from 'express';
import { getReleaseCandidateById, getChangesByReleaseCandidate } from '../store/release-candidate.store.js';
import { getRepositoryById } from '../store/repository.store.js';
import { getImpactItemsByReleaseCandidate } from '../store/impact.store.js';
import { getVerificationPlanByReleaseCandidate, getCheckRunsByPlan } from '../store/verification.store.js';
import { getFindingsByReleaseCandidate, upsertDossier, getDossierByReleaseCandidate } from '../store/evidence.store.js';
import { triageFailures } from '../engine/findings.engine.js';
import { generateDossierMarkdown, computeVerificationStatus } from '../engine/dossier.generator.js';

export const dossierRouter = Router();

// ─── POST /api/dossier/:releaseCandidateId ───────────────────
// FR-08: Generate the release-verification dossier.

dossierRouter.post('/:releaseCandidateId', async (req: Request, res: Response) => {
  try {
    const rc = getReleaseCandidateById(req.params.releaseCandidateId);
    if (!rc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Release candidate ${req.params.releaseCandidateId} not found` } });
    }

    const repo = getRepositoryById(rc.repositoryId);
    if (!repo) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
    }

    // Gather all evidence
    const changes = getChangesByReleaseCandidate(rc.id);
    const impactItems = getImpactItemsByReleaseCandidate(rc.id);
    const plan = getVerificationPlanByReleaseCandidate(rc.id);

    const checkRuns = plan ? getCheckRunsByPlan(plan.id) : [];

    // Ensure findings are triaged
    await triageFailures(rc.id);
    const findings = getFindingsByReleaseCandidate(rc.id);

    // Generate Markdown
    const markdownContent = generateDossierMarkdown({
      repository: repo,
      releaseCandidate: rc,
      changes,
      impactItems,
      plan,
      checkRuns,
      findings,
    });

    const verificationStatus = computeVerificationStatus(findings, checkRuns);

    // Persist dossier (upsert)
    const dossier = upsertDossier({
      releaseCandidateId: rc.id,
      markdownContent,
      verificationStatus,
    });

    return res.status(201).json({ data: dossier });
  } catch (err) {
    return res.status(500).json({ error: { code: 'DOSSIER_ERROR', message: (err as Error).message } });
  }
});

// ─── GET /api/dossier/:releaseCandidateId ────────────────────

dossierRouter.get('/:releaseCandidateId', (req: Request, res: Response) => {
  try {
    const rc = getReleaseCandidateById(req.params.releaseCandidateId);
    if (!rc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Release candidate ${req.params.releaseCandidateId} not found` } });
    }

    const dossier = getDossierByReleaseCandidate(rc.id);
    if (!dossier) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Dossier not generated yet. POST to this endpoint first.' } });
    }

    return res.json({ data: dossier });
  } catch (err) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: (err as Error).message } });
  }
});
