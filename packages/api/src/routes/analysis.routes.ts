import { Router, type Request, type Response } from 'express';
import {
  getChangedFiles,
  getWorkingTreeChanges,
  getDiffPatch,
} from '../adapters/git.adapter.js';
import {
  getReleaseCandidateById,
  getChangesByReleaseCandidate,
  bulkCreateChanges,
} from '../store/release-candidate.store.js';
import { getRepositoryById } from '../store/repository.store.js';
import { getImpactItemsByReleaseCandidate, createImpactItem } from '../store/impact.store.js';
import { getVerificationPlanByReleaseCandidate } from '../store/verification.store.js';
import { analyseImpact } from '../engine/analysis.engine.js';
import { DEMO_CHANGED_FILE, DEMO_CHANGE_DIFF, isVercelDemoRepository } from '../engine/demo-fixture.js';

export const analysisRouter = Router();

// ─── GET /api/release-candidates/:id/changes ────────────────
// FR-02: Returns (or generates) the change inventory for a release candidate.

analysisRouter.get('/release-candidates/:id/changes', async (req: Request, res: Response) => {
  try {
    const rc = getReleaseCandidateById(req.params.id);
    if (!rc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Release candidate ${req.params.id} not found` } });
    }

    // Return cached changes if already computed
    const existing = getChangesByReleaseCandidate(rc.id);
    if (existing.length > 0) {
      return res.json({ data: existing });
    }

    // Compute fresh changes via Git
    const repo = getRepositoryById(rc.repositoryId);
    if (!repo) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
    }

    let diffStats;
    if (isVercelDemoRepository(repo.path)) {
      diffStats = [{ path: DEMO_CHANGED_FILE, changeType: 'MODIFIED' as const, linesAdded: 1, linesRemoved: 1 }];
    } else if (rc.targetRef === 'HEAD' && rc.baseRef) {
      // Try git diff, fall back to working tree
      try {
        diffStats = await getChangedFiles(repo.path, rc.baseRef, rc.targetRef);
      } catch {
        diffStats = await getWorkingTreeChanges(repo.path);
      }
    } else {
      diffStats = await getChangedFiles(repo.path, rc.baseRef, rc.targetRef);
    }

    if (diffStats.length === 0) {
      return res.json({ data: [] });
    }

    // Persist changes
    const changes = bulkCreateChanges(
      diffStats.map((d) => ({
        releaseCandidateId: rc.id,
        path: d.path,
        changeType: d.changeType,
        linesAdded: d.linesAdded,
        linesRemoved: d.linesRemoved,
      })),
    );

    return res.json({ data: changes });
  } catch (err) {
    return res.status(500).json({ error: { code: 'GIT_ERROR', message: (err as Error).message } });
  }
});

// ─── GET /api/release-candidates/:id/diff ───────────────────
// Returns the unified diff patch for a release candidate, optionally filtered by file path.

analysisRouter.get('/release-candidates/:id/diff', async (req: Request, res: Response) => {
  try {
    const rc = getReleaseCandidateById(req.params.id);
    if (!rc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Release candidate ${req.params.id} not found` } });
    }

    const repo = getRepositoryById(rc.repositoryId);
    if (!repo) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
    }

    const filePath = typeof req.query.path === 'string' && req.query.path.trim().length > 0
      ? req.query.path.trim()
      : undefined;

    if (isVercelDemoRepository(repo.path)) {
      return res.json({ data: { diff: !filePath || filePath === DEMO_CHANGED_FILE ? DEMO_CHANGE_DIFF : '' } });
    }

    const diff = await getDiffPatch(repo.path, rc.baseRef, rc.targetRef, filePath);
    return res.json({ data: { diff } });
  } catch (err) {
    return res.status(500).json({ error: { code: 'DIFF_ERROR', message: (err as Error).message } });
  }
});

// ─── GET /api/release-candidates/:id/impact ─────────────────
// FR-03: Returns (or generates) the impact analysis for a release candidate.

analysisRouter.get('/release-candidates/:id/impact', async (req: Request, res: Response) => {
  try {
    const rc = getReleaseCandidateById(req.params.id);
    if (!rc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Release candidate ${req.params.id} not found` } });
    }

    // Return cached impact if already computed
    const existingImpact = getImpactItemsByReleaseCandidate(rc.id);
    if (existingImpact.length > 0) {
      return res.json({ data: existingImpact });
    }

    // Require changes to be computed first
    const changes = getChangesByReleaseCandidate(rc.id);
    if (changes.length === 0) {
      return res.status(422).json({
        error: { code: 'CHANGES_REQUIRED', message: 'Fetch changes before running impact analysis' },
      });
    }

    const repo = getRepositoryById(rc.repositoryId);
    if (!repo) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
    }

    // Run deterministic analysis engine
    const impactItems = await analyseImpact(repo.path, rc.id, changes);

    // Persist impact items
    const stored = impactItems.map((item) =>
      createImpactItem({
        releaseCandidateId: item.releaseCandidateId,
        changeId: item.changeId,
        path: item.path,
        type: item.type,
        reason: item.reason,
        confidence: item.confidence,
        evidenceRefs: item.evidenceRefs,
      }),
    );

    return res.json({ data: stored });
  } catch (err) {
    return res.status(500).json({ error: { code: 'ANALYSIS_ERROR', message: (err as Error).message } });
  }
});

// ─── GET /api/release-candidates/:id/plan ───────────────────
// FR-04: Returns the verification plan for a release candidate.

analysisRouter.get('/release-candidates/:id/plan', (req: Request, res: Response) => {
  try {
    const rc = getReleaseCandidateById(req.params.id);
    if (!rc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Release candidate ${req.params.id} not found` } });
    }

    const plan = getVerificationPlanByReleaseCandidate(rc.id);
    return res.json({ data: plan });
  } catch (err) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: (err as Error).message } });
  }
});

// ─── POST /api/release-candidates ───────────────────────────

analysisRouter.post('/release-candidates', (_req: Request, res: Response) => {
  res.status(400).json({
    error: { code: 'USE_REPOSITORY_ROUTE', message: 'Create release candidates via POST /api/repositories/:id/release-candidates' },
  });
});
