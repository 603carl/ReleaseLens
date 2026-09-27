import { Router } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRepoPath, getRepoMetadata, detectStack, formatDetectedStack } from '../adapters/git.adapter.js';
import { resetDb } from '../store/db.js';
import { createRepository, deleteRepository, getAllRepositories } from '../store/repository.store.js';
import { createReleaseCandidate } from '../store/release-candidate.store.js';

export const demoRouter = Router();

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const DEMO_REPO_PATH = path.resolve(currentDirectory, '../../../../demo-repository');
const DEMO_BASE_REF = 'HEAD~1';
const DEMO_TARGET_REF = 'HEAD';
const DEMO_LABEL = 'RC-pricing-discount-v1.0.1';

/**
 * POST /api/demo/launch
 * Replaces only the controlled demo repository state and creates a fresh candidate.
 */
demoRouter.post('/launch', async (_req, res) => {
  try {
    const validation = validateRepoPath(DEMO_REPO_PATH);
    if (!validation.valid) {
      return res.status(422).json({ error: { code: 'INVALID_DEMO_REPO', message: validation.error } });
    }

    const existingDemoRepositories = getAllRepositories().filter(
      (item) => path.resolve(item.path) === DEMO_REPO_PATH,
    );
    for (const existing of existingDemoRepositories) {
      deleteRepository(existing.id);
    }

    const [metadata, stack] = await Promise.all([
      getRepoMetadata(DEMO_REPO_PATH),
      Promise.resolve(detectStack(DEMO_REPO_PATH)),
    ]);
    const repo = createRepository({
      name: path.basename(DEMO_REPO_PATH),
      path: DEMO_REPO_PATH,
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

    return res.json({ data: { repository: repo, releaseCandidate } });
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
