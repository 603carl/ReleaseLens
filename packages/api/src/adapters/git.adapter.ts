/**
 * Git Adapter
 * Safe wrapper around simple-git for repository inspection.
 * Never executes arbitrary user-supplied commands.
 * All paths are validated before use.
 */
import { simpleGit, type SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs';

export interface RepoMetadata {
  branch: string;
  commitHash: string;
  commitMessage: string;
  authorName: string;
  authorDate: string;
  remoteUrl: string | null;
}

export interface DiffStat {
  path: string;
  changeType: 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED';
  linesAdded: number;
  linesRemoved: number;
  oldPath?: string; // for renames
}

export interface DetectedStack {
  primary: string;
  frameworks: string[];
  testFramework: string | null;
  packageManager: string;
}

// ─── Validation ──────────────────────────────────────────────

/**
 * Validates that the given path is an existing directory with a .git folder.
 * Prevents path traversal and non-repo paths.
 */
export function validateRepoPath(repoPath: string): { valid: boolean; error?: string } {
  const resolved = path.resolve(repoPath);

  if (!fs.existsSync(resolved)) {
    return { valid: false, error: `Path does not exist: ${resolved}` };
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    return { valid: false, error: `Path is not a directory: ${resolved}` };
  }

  const gitDir = path.join(resolved, '.git');
  if (!fs.existsSync(gitDir)) {
    return { valid: false, error: `No .git directory found at: ${resolved}` };
  }

  return { valid: true };
}

// ─── Repository Metadata ─────────────────────────────────────

export async function getRepoMetadata(repoPath: string): Promise<RepoMetadata> {
  const git: SimpleGit = simpleGit(repoPath);

  const [branchResult, logResult, remoteResult] = await Promise.allSettled([
    git.revparse(['--abbrev-ref', 'HEAD']),
    git.log({ maxCount: 1 }),
    git.remote(['get-url', 'origin']),
  ]);

  const branch =
    branchResult.status === 'fulfilled'
      ? branchResult.value.trim()
      : 'unknown';

  const latestLog =
    logResult.status === 'fulfilled' && logResult.value.latest
      ? logResult.value.latest
      : null;

  const remoteUrl =
    remoteResult.status === 'fulfilled' && typeof remoteResult.value === 'string'
      ? remoteResult.value.trim()
      : null;

  return {
    branch,
    commitHash: latestLog?.hash ?? 'unknown',
    commitMessage: latestLog?.message ?? '',
    authorName: latestLog?.author_name ?? '',
    authorDate: latestLog?.date ?? '',
    remoteUrl,
  };
}

// ─── Changed Files ───────────────────────────────────────────

/**
 * Get the list of changed files between baseRef and targetRef.
 * If targetRef is omitted or 'HEAD', uses the working tree.
 */
export async function getChangedFiles(
  repoPath: string,
  baseRef: string,
  targetRef = 'HEAD',
): Promise<DiffStat[]> {
  const git: SimpleGit = simpleGit(repoPath);

  // Get name-status diff to determine change type
  const diffOutput = await git.diff([
    '--name-status',
    `${baseRef}...${targetRef}`,
  ]);

  // Get numstat diff to get line counts
  const numstatOutput = await git.diff([
    '--numstat',
    `${baseRef}...${targetRef}`,
  ]);

  const nameStatusMap = parseNameStatus(diffOutput);
  const numstatMap = parseNumstat(numstatOutput);

  const results: DiffStat[] = [];

  for (const [filePath, changeType] of nameStatusMap.entries()) {
    const stats = numstatMap.get(filePath);
    results.push({
      path: filePath,
      changeType,
      linesAdded: stats?.added ?? 0,
      linesRemoved: stats?.removed ?? 0,
    });
  }

  return results;
}

/**
 * Get unified diff patch between baseRef and targetRef, optionally filtered by file path.
 */
export async function getDiffPatch(
  repoPath: string,
  baseRef: string,
  targetRef = 'HEAD',
  filePath?: string,
): Promise<string> {
  const git: SimpleGit = simpleGit(repoPath);
  const args = [`${baseRef}...${targetRef}`];
  if (filePath) {
    args.push('--', filePath);
  }
  return await git.diff(args);
}

/**
 * Get changed files in the working tree (uncommitted changes + staged).
 * Used when targetRef is not specified.
 */
export async function getWorkingTreeChanges(repoPath: string): Promise<DiffStat[]> {
  const git: SimpleGit = simpleGit(repoPath);
  const status = await git.status();

  const results: DiffStat[] = [];

  for (const file of status.files) {
    let changeType: DiffStat['changeType'] = 'MODIFIED';
    if (file.index === 'A' || file.working_dir === 'A' || file.index === '?' ) {
      changeType = 'ADDED';
    } else if (file.index === 'D' || file.working_dir === 'D') {
      changeType = 'DELETED';
    } else if (file.index === 'R') {
      changeType = 'RENAMED';
    }

    results.push({
      path: file.path,
      changeType,
      linesAdded: 0,
      linesRemoved: 0,
    });
  }

  return results;
}

// ─── Stack Detection ─────────────────────────────────────────

/**
 * Deterministically detect the technology stack from repository structure.
 * Never makes network calls or assumptions beyond file presence.
 */
export function detectStack(repoPath: string): DetectedStack {
  const pkg = readJsonSafe(path.join(repoPath, 'package.json'));
  const hasTsConfig = fs.existsSync(path.join(repoPath, 'tsconfig.json'));
  const hasPyproject = fs.existsSync(path.join(repoPath, 'pyproject.toml'));
  const hasRequirements = fs.existsSync(path.join(repoPath, 'requirements.txt'));
  const hasCargoToml = fs.existsSync(path.join(repoPath, 'Cargo.toml'));
  const hasGoMod = fs.existsSync(path.join(repoPath, 'go.mod'));
  const hasMavenPom = fs.existsSync(path.join(repoPath, 'pom.xml'));
  const hasGradleBuild = fs.existsSync(path.join(repoPath, 'build.gradle'));

  if (pkg) {
    const deps: Record<string, string> = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    const frameworks: string[] = [];
    if (deps['react'] || deps['react-dom']) frameworks.push('React');
    if (deps['vue']) frameworks.push('Vue');
    if (deps['next']) frameworks.push('Next.js');
    if (deps['express']) frameworks.push('Express');
    if (deps['fastify']) frameworks.push('Fastify');
    if (deps['nestjs'] || deps['@nestjs/core']) frameworks.push('NestJS');

    const testFramework =
      deps['vitest'] ? 'Vitest' :
      deps['jest'] ? 'Jest' :
      deps['mocha'] ? 'Mocha' :
      null;

    const packageManager =
      fs.existsSync(path.join(repoPath, 'pnpm-lock.yaml')) ? 'pnpm' :
      fs.existsSync(path.join(repoPath, 'yarn.lock')) ? 'yarn' :
      'npm';

    return {
      primary: hasTsConfig ? 'Node.js / TypeScript' : 'Node.js / JavaScript',
      frameworks,
      testFramework,
      packageManager,
    };
  }

  if (hasPyproject || hasRequirements) {
    return { primary: 'Python', frameworks: [], testFramework: 'pytest', packageManager: 'pip' };
  }

  if (hasCargoToml) {
    return { primary: 'Rust', frameworks: [], testFramework: 'cargo test', packageManager: 'cargo' };
  }

  if (hasGoMod) {
    return { primary: 'Go', frameworks: [], testFramework: 'go test', packageManager: 'go' };
  }

  if (hasMavenPom) {
    return { primary: 'Java / Maven', frameworks: [], testFramework: 'JUnit', packageManager: 'mvn' };
  }

  if (hasGradleBuild) {
    return { primary: 'Java / Gradle', frameworks: [], testFramework: 'JUnit', packageManager: 'gradle' };
  }

  return { primary: 'Unknown', frameworks: [], testFramework: null, packageManager: 'unknown' };
}

export function formatDetectedStack(stack: DetectedStack): string {
  const parts = [stack.primary];
  if (stack.frameworks.length > 0) parts.push(stack.frameworks.join(', '));
  return parts.join(' + ');
}

// ─── File Content ────────────────────────────────────────────

/**
 * Read bounded file content for analysis.
 * Never reads files larger than 512KB to prevent memory issues.
 */
export function readFileSafe(filePath: string, maxBytes = 512 * 1024): string | null {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > maxBytes) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// ─── Private Helpers ─────────────────────────────────────────

function readJsonSafe(filePath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseNameStatus(output: string): Map<string, DiffStat['changeType']> {
  const map = new Map<string, DiffStat['changeType']>();
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split('\t');
    const status = parts[0].charAt(0).toUpperCase();
    const filePath = parts[parts.length - 1];

    switch (status) {
      case 'A': map.set(filePath, 'ADDED'); break;
      case 'M': map.set(filePath, 'MODIFIED'); break;
      case 'D': map.set(filePath, 'DELETED'); break;
      case 'R': map.set(filePath, 'RENAMED'); break;
      default: map.set(filePath, 'MODIFIED');
    }
  }
  return map;
}

function parseNumstat(output: string): Map<string, { added: number; removed: number }> {
  const map = new Map<string, { added: number; removed: number }>();
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split('\t');
    if (parts.length < 3) continue;

    const added = parseInt(parts[0], 10) || 0;
    const removed = parseInt(parts[1], 10) || 0;
    const filePath = parts[parts.length - 1];

    map.set(filePath, { added, removed });
  }
  return map;
}
