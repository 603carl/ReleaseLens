import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRepoPath, getRepoMetadata, detectStack, formatDetectedStack } from '../adapters/git.adapter.js';
import { resetDb } from '../store/db.js';
import { createRepository, deleteRepository, getAllRepositories } from '../store/repository.store.js';
import {
  createReleaseCandidate,
  bulkCreateChanges,
  getReleaseCandidateById,
  updateReleaseCandidateStatus,
} from '../store/release-candidate.store.js';
import { createImpactItem, getImpactItemsByReleaseCandidate } from '../store/impact.store.js';
import {
  createVerificationPlan,
  createVerificationItem,
  createCheckRun,
  completeCheckRun,
  getVerificationPlanByReleaseCandidate,
  getCheckRunsByPlan,
} from '../store/verification.store.js';
import { upsertDossier } from '../store/evidence.store.js';
import { analyseImpact } from '../engine/analysis.engine.js';
import { generateVerificationPlan } from '../engine/verification.planner.js';
import { validateCommand, runCommand } from '../engine/check.runner.js';
import { triageFailures } from '../engine/findings.engine.js';
import { generateDossierMarkdown, computeVerificationStatus } from '../engine/dossier.generator.js';
import { DEMO_CHANGED_FILE, DEMO_CHANGE_DIFF } from '../engine/demo-fixture.js';
import { VERCEL_DEMO_REPO_PATH } from '../engine/demo-fixture.js';

export const demoRouter = Router();

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DEMO_REPO_PATH = path.resolve(currentDirectory, '../../../../demo-repository');
const PACKAGED_DEMO_PATH = path.resolve(process.cwd(), 'demo-repository');
const DEMO_BASE_REF = 'HEAD~1';
const DEMO_TARGET_REF = 'HEAD';
const DEMO_LABEL = 'RC-pricing-discount-v1.0.1';

async function prepareVercelWorkflow(repository: ReturnType<typeof createRepository>, releaseCandidateId: string) {
  const changes = bulkCreateChanges([{
    releaseCandidateId,
    path: DEMO_CHANGED_FILE,
    changeType: 'MODIFIED',
    linesAdded: 1,
    linesRemoved: 1,
  }]);

  const analyzedImpact = await analyseImpact(repository.path, releaseCandidateId, changes);
  for (const item of analyzedImpact) createImpactItem(item);
  const impactItems = getImpactItemsByReleaseCandidate(releaseCandidateId);

  const planSpec = generateVerificationPlan(impactItems);
  const planRecord = createVerificationPlan(releaseCandidateId);
  for (const item of planSpec) createVerificationItem({ planId: planRecord.id, ...item });
  const plan = getVerificationPlanByReleaseCandidate(releaseCandidateId)!;
  const results = [];

  updateReleaseCandidateStatus(releaseCandidateId, 'RUNNING');
  for (const item of plan.items) {
    const validation = validateCommand(item.command);
    if (!validation.valid) {
      results.push({ itemId: item.id, command: item.command, status: 'BLOCKED' as const, reason: validation.reason });
      continue;
    }
    const run = createCheckRun(item.id);
    const result = await runCommand(item.command, repository.path);
    const completed = completeCheckRun(run.id, result);
    results.push({
      itemId: item.id,
      runId: run.id,
      command: item.command,
      status: completed.status,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
    });
  }

  const allPassed = results.every((result) => result.status === 'PASSED');
  const anyFailed = results.some((result) => result.status === 'FAILED');
  updateReleaseCandidateStatus(releaseCandidateId, anyFailed ? 'FAILED' : allPassed ? 'PASSED' : 'UNKNOWN');
  const releaseCandidate = getReleaseCandidateById(releaseCandidateId)!;
  const findings = await triageFailures(releaseCandidateId);
  const checkRuns = getCheckRunsByPlan(plan.id);
  const dossier = upsertDossier({
    releaseCandidateId,
    markdownContent: generateDossierMarkdown({
      repository,
      releaseCandidate,
      changes,
      impactItems,
      plan: getVerificationPlanByReleaseCandidate(releaseCandidateId),
      checkRuns,
      findings,
    }),
    verificationStatus: computeVerificationStatus(findings, checkRuns),
  });

  return {
    changes,
    diff: { diff: DEMO_CHANGE_DIFF },
    impactItems,
    plan: getVerificationPlanByReleaseCandidate(releaseCandidateId),
    checks: {
      planId: plan.id,
      releaseCandidateId,
      results,
      overallStatus: anyFailed ? 'FAILED' : allPassed ? 'PASSED' : 'UNKNOWN',
    },
    findings,
    dossier,
  };
}

async function getDemoRepositoryPath(): Promise<string> {
  if (!process.env.VERCEL) return LOCAL_DEMO_REPO_PATH;
  if (validateRepoPath(VERCEL_DEMO_REPO_PATH).valid) return VERCEL_DEMO_REPO_PATH;

  if (!fs.existsSync(PACKAGED_DEMO_PATH)) {
    throw new Error('The controlled demo repository was not included in this deployment.');
  }

  fs.rmSync(VERCEL_DEMO_REPO_PATH, { recursive: true, force: true });
  fs.cpSync(PACKAGED_DEMO_PATH, VERCEL_DEMO_REPO_PATH, {
    recursive: true,
    filter: (source) => !['.git', 'node_modules', 'dist'].includes(path.basename(source)),
  });

  const sourceModules = path.join(PACKAGED_DEMO_PATH, 'node_modules');
  if (!fs.existsSync(sourceModules)) {
    throw new Error('Demo verification tools are missing from this deployment.');
  }
  fs.symlinkSync(sourceModules, path.join(VERCEL_DEMO_REPO_PATH, 'node_modules'), 'dir');
  return VERCEL_DEMO_REPO_PATH;
}

/**
 * POST /api/demo/launch
 * Replaces only the controlled demo repository state and creates a fresh candidate.
 */
demoRouter.post('/launch', async (_req, res) => {
  try {
    const demoRepoPath = await getDemoRepositoryPath();
    const validation = process.env.VERCEL
      ? fs.existsSync(demoRepoPath)
        ? { valid: true }
        : { valid: false, error: `Path does not exist: ${demoRepoPath}` }
      : validateRepoPath(demoRepoPath);
    if (!validation.valid) {
      return res.status(422).json({ error: { code: 'INVALID_DEMO_REPO', message: validation.error } });
    }

    const existingDemoRepositories = getAllRepositories().filter(
      (item) => path.resolve(item.path) === demoRepoPath,
    );
    for (const existing of existingDemoRepositories) {
      deleteRepository(existing.id);
    }

    const [metadata, stack] = await Promise.all([
      process.env.VERCEL
        ? Promise.resolve({ branch: 'feature/discount-logic', commitHash: '5071658763e34f522ed0b8cf2f725b306dd86418' })
        : getRepoMetadata(demoRepoPath),
      Promise.resolve(detectStack(demoRepoPath)),
    ]);
    const repo = createRepository({
      name: path.basename(demoRepoPath),
      path: demoRepoPath,
      branch: metadata.branch,
      commitHash: metadata.commitHash,
      detectedStack: formatDetectedStack(stack),
    });
    const releaseCandidate = createReleaseCandidate({
      repositoryId: repo.id,
      baseRef: DEMO_BASE_REF,
      targetRef: DEMO_TARGET_REF,
      label: DEMO_LABEL,
    });

    const workflow = process.env.VERCEL
      ? await prepareVercelWorkflow(repo, releaseCandidate.id)
      : undefined;

    return res.json({ data: { repository: repo, releaseCandidate: workflow
      ? getReleaseCandidateById(releaseCandidate.id)!
      : releaseCandidate, workflow } });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'DEMO_LAUNCH_FAILED', message: (err as Error).message },
    });
  }
});

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
