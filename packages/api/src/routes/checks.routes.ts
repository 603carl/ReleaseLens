import { Router, Request, Response } from 'express';
import { getRepositoryById } from '../store/repository.store.js';
import { getReleaseCandidateById, updateReleaseCandidateStatus } from '../store/release-candidate.store.js';
import { getImpactItemsByReleaseCandidate } from '../store/impact.store.js';
import {
  createVerificationPlan,
  createVerificationItem,
  getVerificationPlanByReleaseCandidate,
  createCheckRun,
  completeCheckRun,
  getCheckRunById,
} from '../store/verification.store.js';
import { generateVerificationPlan } from '../engine/verification.planner.js';
import { validateCommand, runCommand } from '../engine/check.runner.js';

export const checksRouter = Router();

// ─── POST /api/checks/run ────────────────────────────────────
// FR-05: Execute verification plan checks against the release candidate.

checksRouter.post('/run', async (req: Request, res: Response) => {
  const { releaseCandidateId } = req.body as { releaseCandidateId: string };

  if (!releaseCandidateId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'releaseCandidateId is required' } });
  }

  const rc = getReleaseCandidateById(releaseCandidateId);
  if (!rc) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Release candidate ${releaseCandidateId} not found` } });
  }

  const repo = getRepositoryById(rc.repositoryId);
  if (!repo) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Repository not found' } });
  }

  try {
    // Get or create the verification plan
    let plan = getVerificationPlanByReleaseCandidate(rc.id);

    if (!plan) {
      // Generate plan from impact items
      const impactItems = getImpactItemsByReleaseCandidate(rc.id);
      const planItems = generateVerificationPlan(impactItems);

      plan = createVerificationPlan(rc.id);

      for (const item of planItems) {
        createVerificationItem({
          planId: plan.id,
          name: item.name,
          reason: item.reason,
          command: item.command,
          expectedOutcome: item.expectedOutcome,
        });
      }

      // Re-fetch with items
      plan = getVerificationPlanByReleaseCandidate(rc.id)!;
    }

    // Mark RC as RUNNING
    updateReleaseCandidateStatus(rc.id, 'RUNNING');

    // Execute all pending items sequentially (not parallel — safer, clearer output)
    const checkResults = [];

    for (const item of plan.items) {
      // Security: validate before executing
      const validation = validateCommand(item.command);
      if (!validation.valid) {
        console.warn(`[CheckRunner] Rejected command "${item.command}": ${validation.reason}`);
        checkResults.push({
          itemId: item.id,
          command: item.command,
          status: 'BLOCKED',
          reason: validation.reason,
        });
        continue;
      }

      const run = createCheckRun(item.id);

      console.log(`[CheckRunner] Running: ${item.command} in ${repo.path}`);
      const result = await runCommand(item.command, repo.path);

      const completed = completeCheckRun(run.id, {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      });

      checkResults.push({
        itemId: item.id,
        runId: run.id,
        command: item.command,
        status: completed.status,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
      });
    }

    // Determine overall RC status
    const allPassed = checkResults.every((r) => r.status === 'PASSED');
    const anyFailed = checkResults.some((r) => r.status === 'FAILED');
    updateReleaseCandidateStatus(rc.id, anyFailed ? 'FAILED' : allPassed ? 'PASSED' : 'UNKNOWN');

    return res.json({
      data: {
        planId: plan.id,
        releaseCandidateId: rc.id,
        results: checkResults,
        overallStatus: anyFailed ? 'FAILED' : allPassed ? 'PASSED' : 'UNKNOWN',
      },
    });
  } catch (err) {
    return res.status(500).json({ error: { code: 'RUNNER_ERROR', message: (err as Error).message } });
  }
});

// ─── GET /api/checks/:id ─────────────────────────────────────

checksRouter.get('/:id', (req: Request, res: Response) => {
  const run = getCheckRunById(req.params.id);
  if (!run) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Check run ${req.params.id} not found` } });
  }
  return res.json({ data: run });
});
