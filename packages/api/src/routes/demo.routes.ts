import { Router } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRepoPath, getRepoMetadata, detectStack, formatDetectedStack } from '../adapters/git.adapter.js';
import { simpleGit } from 'simple-git';
import { resetDb } from '../store/db.js';
import { createRepository, deleteRepository, getAllRepositories } from '../store/repository.store.js';
import { createReleaseCandidate } from '../store/release-candidate.store.js';

export const demoRouter = Router();

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DEMO_REPO_PATH = path.resolve(currentDirectory, '../../../../demo-repository');
const PACKAGED_DEMO_PATH = path.resolve(process.cwd(), 'demo-repository');
const VERCEL_DEMO_REPO_PATH = path.join(os.tmpdir(), 'releaselens-demo-repository');
const DEMO_BASE_REF = 'HEAD~1';
const DEMO_TARGET_REF = 'HEAD';
const DEMO_LABEL = 'RC-pricing-discount-v1.0.1';

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

  const pricingPath = path.join(VERCEL_DEMO_REPO_PATH, 'src', 'orders', 'pricing.ts');
  const currentPricing = fs.readFileSync(pricingPath, 'utf8');
  const basePricing = fs.readFileSync(
    path.join(PACKAGED_DEMO_PATH, 'demo-fixtures', 'pricing.base.ts'),
    'utf8',
  );
  fs.writeFileSync(path.join(VERCEL_DEMO_REPO_PATH, '.gitignore'), 'node_modules/\ndist/\n');

  const git = simpleGit(VERCEL_DEMO_REPO_PATH);
  await git.init();
  await git.addConfig('user.name', 'ReleaseLens Demo');
  await git.addConfig('user.email', 'demo@releaselens.local');
  fs.writeFileSync(pricingPath, basePricing);
  await git.add('.');
  await git.commit('feat: initial order management API');
  await git.checkoutLocalBranch('feature/discount-logic');
  fs.writeFileSync(pricingPath, currentPricing);
  await git.add('src/orders/pricing.ts');
  await git.commit('feat: add promotional discount support');

  return VERCEL_DEMO_REPO_PATH;
}

/**
 * POST /api/demo/launch
 * Replaces only the controlled demo repository state and creates a fresh candidate.
 */
demoRouter.post('/launch', async (_req, res) => {
  try {
    const demoRepoPath = await getDemoRepositoryPath();
    const validation = validateRepoPath(demoRepoPath);
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
      getRepoMetadata(demoRepoPath),
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
