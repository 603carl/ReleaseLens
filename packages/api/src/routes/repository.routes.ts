import { Router, type Request, type Response } from 'express';
import path from 'path';
import {
  validateRepoPath,
  getRepoMetadata,
  detectStack,
  formatDetectedStack,
} from '../adapters/git.adapter.js';
import {
  createRepository,
  getRepositoryById,
  getAllRepositories,
  deleteRepository,
  updateRepository,
} from '../store/repository.store.js';
import {
  createReleaseCandidate,
  getReleaseCandidatesByRepository,
  getReleaseCandidateById,
} from '../store/release-candidate.store.js';
import type { CreateRepositoryRequest, CreateReleaseCandidateRequest } from '../types/domain.js';

export const repositoryRouter = Router();

// ─── GET /api/repositories ───────────────────────────────────

repositoryRouter.get('/', (_req: Request, res: Response) => {
  try {
    const repos = getAllRepositories();
    res.json({ data: repos });
  } catch (err) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: (err as Error).message } });
  }
});

// ─── GET /api/repositories/:id ───────────────────────────────

repositoryRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const repo = getRepositoryById(req.params.id);
    if (!repo) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Repository ${req.params.id} not found` } });
    }
    const releaseCandidates = getReleaseCandidatesByRepository(req.params.id);
    return res.json({ data: { ...repo, releaseCandidates } });
  } catch (err) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: (err as Error).message } });
  }
});

// ─── POST /api/repositories ──────────────────────────────────
// FR-01: Repository intake

repositoryRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body as CreateRepositoryRequest;

  if (!body.path) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'path is required' } });
  }

  // Normalize to absolute path
  const repoPath = path.resolve(body.path);

  // Security: validate before doing anything with the path
  const validation = validateRepoPath(repoPath);
  if (!validation.valid) {
    return res.status(422).json({ error: { code: 'INVALID_REPO', message: validation.error } });
  }

  try {
    // Gather metadata from git
    const [metadata, stack] = await Promise.all([
      getRepoMetadata(repoPath),
      Promise.resolve(detectStack(repoPath)),
    ]);

    const name =
      body.name ??
      path.basename(repoPath);

    const repo = createRepository({
      name,
      path: repoPath,
      branch: metadata.branch,
      commitHash: metadata.commitHash,
      detectedStack: formatDetectedStack(stack),
    });

    return res.status(201).json({
      data: {
        ...repo,
        metadata,
        stack,
        releaseCandidates: [],
      },
    });
  } catch (err) {
    return res.status(500).json({ error: { code: 'GIT_ERROR', message: (err as Error).message } });
  }
});

// ─── POST /api/repositories/:id/release-candidates ───────────

repositoryRouter.post('/:id/release-candidates', async (req: Request, res: Response) => {
  const repo = getRepositoryById(req.params.id);
  if (!repo) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Repository ${req.params.id} not found` } });
  }

  const body = req.body as Partial<CreateReleaseCandidateRequest>;

  if (!body.baseRef) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'baseRef is required' } });
  }

  try {
    // Refresh metadata to get current HEAD
    const metadata = await getRepoMetadata(repo.path);

    const rc = createReleaseCandidate({
      repositoryId: repo.id,
      baseRef: body.baseRef,
      targetRef: body.targetRef ?? 'HEAD',
      label: body.label ?? `RC-${new Date().toISOString().slice(0, 10)}`,
    });

    return res.status(201).json({
      data: {
        ...rc,
        currentCommit: metadata.commitHash,
        currentBranch: metadata.branch,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: { code: 'GIT_ERROR', message: (err as Error).message } });
  }
});

// ─── GET /api/repositories/:id/release-candidates ────────────

repositoryRouter.get('/:id/release-candidates', (req: Request, res: Response) => {
  const repo = getRepositoryById(req.params.id);
  if (!repo) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Repository ${req.params.id} not found` } });
  }
  const rcs = getReleaseCandidatesByRepository(req.params.id);
  return res.json({ data: rcs });
});

// ─── GET /api/release-candidates/:id ─────────────────────────

repositoryRouter.get('/release-candidates/:id', (req: Request, res: Response) => {
  const rc = getReleaseCandidateById(req.params.id);
  if (!rc) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Release candidate ${req.params.id} not found` } });
  }
  return res.json({ data: rc });
});

// ─── DELETE /api/repositories/:id ────────────────────────────
// Removes a repository and all associated analysis and candidates from DB.

repositoryRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const repo = getRepositoryById(req.params.id);
    if (!repo) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Repository ${req.params.id} not found` } });
    }
    deleteRepository(req.params.id);
    return res.json({ data: { success: true, message: `Repository ${repo.name} deleted` } });
  } catch (err) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: (err as Error).message } });
  }
});

// ─── POST /api/repositories/:id/sync ─────────────────────────
// Real-time Git sync: inspects latest commits, branches, and stack.

repositoryRouter.post('/:id/sync', async (req: Request, res: Response) => {
  try {
    const repo = getRepositoryById(req.params.id);
    if (!repo) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Repository ${req.params.id} not found` } });
    }
    const [metadata, stack] = await Promise.all([
      getRepoMetadata(repo.path),
      Promise.resolve(detectStack(repo.path)),
    ]);
    const detectedStack = formatDetectedStack(stack);
    updateRepository(repo.id, {
      branch: metadata.branch,
      commitHash: metadata.commitHash,
      detectedStack,
    });
    const updated = getRepositoryById(repo.id);
    return res.json({
      data: {
        ...updated,
        metadata,
        stack,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: { code: 'SYNC_ERROR', message: (err as Error).message } });
  }
});

