/**
 * Analysis Engine
 * Deterministic impact analysis — never invents relationships.
 * Every impact item is traceable to a file path, import, or naming convention.
 * UNKNOWN confidence is preserved and never silently upgraded.
 */
import path from 'path';
import fs from 'fs';
import { readFileSafe } from '../adapters/git.adapter.js';
import type { Change, ImpactType, Confidence } from '../types/domain.js';

// ─── Analysis Result (pre-persistence) ──────────────────────

export interface AnalysisImpactItem {
  releaseCandidateId: string;
  changeId: string;
  path: string;
  type: ImpactType;
  reason: string;
  confidence: Confidence;
  evidenceRefs: string[];
}

// ─── Path Classification Rules ───────────────────────────────

/**
 * Classify a file path into a domain type using naming conventions.
 * Returns deterministic classification based on path patterns only.
 */
export function classifyPath(filePath: string): ImpactType {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();

  // Contract tests — highest sensitivity
  if (normalized.includes('/contracts/') || normalized.includes('contract.test') || normalized.includes('contract.spec')) {
    return 'CONTRACT_TEST';
  }

  // Test files
  if (
    normalized.includes('.test.') ||
    normalized.includes('.spec.') ||
    normalized.includes('/tests/') ||
    normalized.includes('/__tests__/') ||
    normalized.includes('/test/')
  ) {
    return 'TEST';
  }

  // Configuration files
  if (
    normalized.endsWith('.config.ts') ||
    normalized.endsWith('.config.js') ||
    normalized.endsWith('.config.mjs') ||
    normalized.includes('/config/') ||
    normalized === 'package.json' ||
    normalized === 'tsconfig.json' ||
    normalized.endsWith('.env') ||
    normalized.startsWith('.env')
  ) {
    return 'CONFIG';
  }

  // Shared utilities
  if (
    normalized.includes('/shared/') ||
    normalized.includes('/common/') ||
    normalized.includes('/utils/') ||
    normalized.includes('/helpers/') ||
    normalized.includes('/lib/')
  ) {
    return 'SHARED';
  }

  // Source modules — default for src/ files
  if (normalized.startsWith('src/') || normalized.includes('/src/')) {
    return 'MODULE';
  }

  return 'UNKNOWN';
}

/**
 * Determine the module directory from a file path.
 * e.g. src/orders/pricing.ts → src/orders/
 */
export function getModuleDirectory(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const dir = normalized.split('/').slice(0, -1).join('/');
  return dir ? dir + '/' : '';
}

/**
 * Find test files that correspond to a source file by naming convention.
 * e.g. src/orders/pricing.ts → tests/orders/pricing.test.ts
 */
export function findRelatedTestPaths(filePath: string, repoPath: string): string[] {
  const normalized = filePath.replace(/\\/g, '/');
  const ext = path.extname(normalized);
  const base = path.basename(normalized, ext);
  const dir = path.dirname(normalized).replace(/\\/g, '/');

  // Derive module-relative dir (strip src/ prefix)
  const moduleDir = dir.replace(/^src\//, '').replace(/^src$/, '');

  const candidates: string[] = [
    // Co-located test
    `${dir}/${base}.test${ext}`,
    `${dir}/${base}.spec${ext}`,
    // tests/ mirror
    `tests/${moduleDir}/${base}.test${ext}`.replace('//', '/'),
    `tests/${moduleDir}/${base}.spec${ext}`.replace('//', '/'),
    // __tests__ mirror
    `${dir}/__tests__/${base}.test${ext}`,
  ];

  return candidates.filter((p) => fs.existsSync(path.join(repoPath, p)));
}

// ─── Import Scanner ──────────────────────────────────────────

/**
 * Scan a TypeScript/JavaScript file and extract import paths.
 * Returns only same-project relative imports (not node_modules).
 */
export function extractImports(filePath: string, repoPath: string): string[] {
  const content = readFileSafe(path.join(repoPath, filePath));
  if (!content) return [];

  const imports: string[] = [];

  // Match: import ... from '...'; and require('...')
  const importRegex = /(?:import|from)\s+['"](\.[^'"]+)['"]/g;
  const requireRegex = /require\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Find files in the repository that import from a given source file.
 * Scans all TypeScript/JavaScript files deterministically.
 * Limited to 500 files to stay fast.
 */
export function findReverseImports(changedFile: string, repoPath: string): string[] {
  const allSourceFiles = findSourceFiles(repoPath, 500);
  const base = changedFile.replace(/\\/g, '/');
  const baseName = path.basename(base, path.extname(base));
  const baseDir = path.dirname(base).replace(/\\/g, '/');

  const importers: string[] = [];

  for (const sourceFile of allSourceFiles) {
    const imports = extractImports(sourceFile, repoPath);
    for (const imp of imports) {
      // Resolve the import relative to the source file's location
      const sourceDir = path.dirname(sourceFile).replace(/\\/g, '/');
      const resolved = resolveRelativeImport(sourceDir, imp);

      if (
        resolved === base ||
        resolved === base.replace(path.extname(base), '') ||
        resolved.endsWith('/' + baseName) ||
        resolved === baseDir + '/' + baseName
      ) {
        importers.push(sourceFile);
        break;
      }
    }
  }

  return importers;
}

// ─── Main Analysis Entry Point ───────────────────────────────

/**
 * Run the full deterministic impact analysis for a set of changes.
 * Returns impact items without persisting them (persistence is handled by the route).
 */
export async function analyseImpact(
  repoPath: string,
  releaseCandidateId: string,
  changes: Change[],
): Promise<AnalysisImpactItem[]> {
  const results: AnalysisImpactItem[] = [];
  const seen = new Set<string>(); // deduplicate paths

  for (const change of changes) {
    const filePath = change.path;
    const fileType = classifyPath(filePath);

    // 1. Direct impact — the changed file itself
    const directItem: AnalysisImpactItem = {
      releaseCandidateId,
      changeId: change.id,
      path: filePath,
      type: fileType,
      reason: `File directly changed (${change.changeType})`,
      confidence: 'CONFIRMED',
      evidenceRefs: [`change:${change.id}`],
    };
    addUnique(results, seen, directItem);

    // 2. Module-level impact
    const moduleDir = getModuleDirectory(filePath);
    if (moduleDir && fileType === 'MODULE') {
      const moduleItem: AnalysisImpactItem = {
        releaseCandidateId,
        changeId: change.id,
        path: moduleDir,
        type: 'MODULE',
        reason: `Module directory contains changed file: ${filePath}`,
        confidence: 'CONFIRMED',
        evidenceRefs: [`change:${change.id}`],
      };
      addUnique(results, seen, moduleItem);
    }

    // 3. Test file discovery — find related tests
    if (fileType === 'MODULE' || fileType === 'SHARED') {
      const testPaths = findRelatedTestPaths(filePath, repoPath);
      for (const testPath of testPaths) {
        const testType: ImpactType = classifyPath(testPath);
        const testItem: AnalysisImpactItem = {
          releaseCandidateId,
          changeId: change.id,
          path: testPath,
          type: testType,
          reason: `Test file matches changed source: ${filePath}`,
          confidence: 'SUPPORTED',
          evidenceRefs: [`change:${change.id}`, `path-match:${filePath}`],
        };
        addUnique(results, seen, testItem);
      }
    }

    // 4. Reverse import detection — find files that import the changed file
    if (fileType === 'MODULE' || fileType === 'SHARED') {
      const importers = findReverseImports(filePath, repoPath);
      for (const importer of importers.slice(0, 10)) { // cap at 10
        const importerType = classifyPath(importer);
        const importerItem: AnalysisImpactItem = {
          releaseCandidateId,
          changeId: change.id,
          path: importer,
          type: importerType,
          reason: `Imports changed file: ${filePath}`,
          confidence: 'CONFIRMED',
          evidenceRefs: [`change:${change.id}`, `import-trace:${filePath}`],
        };
        addUnique(results, seen, importerItem);
      }
    }

    // 5. UNKNOWN — if no related tests found for a source file
    if ((fileType === 'MODULE' || fileType === 'SHARED') && !hasTestCoverage(filePath, results)) {
      const unknownItem: AnalysisImpactItem = {
        releaseCandidateId,
        changeId: change.id,
        path: `${getModuleDirectory(filePath)}[no test found]`,
        type: 'UNKNOWN',
        reason: `No test mapping found for changed file: ${filePath}`,
        confidence: 'UNKNOWN',
        evidenceRefs: [`change:${change.id}`],
      };
      // Only add if no test was already found for this change
      const alreadyHasTest = results.some(
        (r) => r.changeId === change.id && (r.type === 'TEST' || r.type === 'CONTRACT_TEST'),
      );
      if (!alreadyHasTest) {
        addUnique(results, seen, unknownItem);
      }
    }
  }

  return results;
}

// ─── Private Helpers ─────────────────────────────────────────

function addUnique(
  results: AnalysisImpactItem[],
  seen: Set<string>,
  item: AnalysisImpactItem,
): void {
  const key = `${item.changeId}:${item.path}:${item.confidence}`;
  if (!seen.has(key)) {
    seen.add(key);
    results.push(item);
  }
}

function hasTestCoverage(filePath: string, results: AnalysisImpactItem[]): boolean {
  return results.some((r) =>
    (r.type === 'TEST' || r.type === 'CONTRACT_TEST') &&
    r.reason.includes(filePath),
  );
}

function findSourceFiles(repoPath: string, limit: number): string[] {
  const files: string[] = [];
  const dirs = ['src', 'tests', 'lib'];

  for (const dir of dirs) {
    const dirPath = path.join(repoPath, dir);
    if (fs.existsSync(dirPath)) {
      walkDir(dirPath, repoPath, files, limit);
    }
    if (files.length >= limit) break;
  }

  return files;
}

function walkDir(dirPath: string, rootPath: string, files: string[], limit: number): void {
  if (files.length >= limit) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (files.length >= limit) break;
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, rootPath, files, limit);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      // Store as relative path from repo root
      files.push(path.relative(rootPath, fullPath).replace(/\\/g, '/'));
    }
  }
}

function resolveRelativeImport(fromDir: string, importPath: string): string {
  // Simple resolution: join and normalize
  const joined = path.posix.join(fromDir, importPath);
  // Strip extension so .js imports match .ts source files (TypeScript ESM convention)
  return joined.replace(/\.(js|jsx|mjs)$/, '').replace(/\\/g, '/');
}
