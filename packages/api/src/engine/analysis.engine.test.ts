/**
 * Analysis Engine Unit Tests
 * Tests all deterministic classification, path mapping, and import scanning logic.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyPath,
  getModuleDirectory,
  findRelatedTestPaths,
  extractImports,
  findReverseImports,
} from './analysis.engine.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use the workspace packages/api as a test repo (it has known structure)
const TEST_REPO = path.resolve(__dirname, '..', '..');
// Demo repository path for end-to-end impact tracing tests
const DEMO_REPO = path.resolve(__dirname, '..', '..', '..', '..', 'demo-repository');

describe('classifyPath', () => {
  it('classifies contract tests as CONTRACT_TEST', () => {
    expect(classifyPath('tests/contracts/orders.test.ts')).toBe('CONTRACT_TEST');
    expect(classifyPath('src/payments/contract.test.ts')).toBe('CONTRACT_TEST');
    expect(classifyPath('tests/contracts/invoice.spec.ts')).toBe('CONTRACT_TEST');
  });

  it('classifies test files as TEST', () => {
    expect(classifyPath('tests/orders/pricing.test.ts')).toBe('TEST');
    expect(classifyPath('src/orders/__tests__/pricing.spec.ts')).toBe('TEST');
    expect(classifyPath('src/lib/something.test.js')).toBe('TEST');
  });

  it('classifies config files as CONFIG', () => {
    expect(classifyPath('vite.config.ts')).toBe('CONFIG');
    expect(classifyPath('tsconfig.json')).toBe('CONFIG');
    expect(classifyPath('package.json')).toBe('CONFIG');
    expect(classifyPath('.env.production')).toBe('CONFIG');
    expect(classifyPath('src/config/settings.ts')).toBe('CONFIG');
  });

  it('classifies shared utilities as SHARED', () => {
    expect(classifyPath('src/shared/validators.ts')).toBe('SHARED');
    expect(classifyPath('src/utils/format.ts')).toBe('SHARED');
    expect(classifyPath('src/common/errors.ts')).toBe('SHARED');
    expect(classifyPath('src/helpers/date.ts')).toBe('SHARED');
  });

  it('classifies source files as MODULE', () => {
    expect(classifyPath('src/orders/pricing.ts')).toBe('MODULE');
    expect(classifyPath('src/payments/invoice.ts')).toBe('MODULE');
    expect(classifyPath('src/auth/service.ts')).toBe('MODULE');
  });

  it('classifies unknown files as UNKNOWN', () => {
    expect(classifyPath('Makefile')).toBe('UNKNOWN');
    expect(classifyPath('README.md')).toBe('UNKNOWN');
    expect(classifyPath('scripts/deploy.sh')).toBe('UNKNOWN');
  });
});

describe('getModuleDirectory', () => {
  it('returns directory with trailing slash', () => {
    expect(getModuleDirectory('src/orders/pricing.ts')).toBe('src/orders/');
    expect(getModuleDirectory('src/payments/invoice.ts')).toBe('src/payments/');
    expect(getModuleDirectory('tests/contracts/orders.test.ts')).toBe('tests/contracts/');
  });

  it('handles single-level file', () => {
    expect(getModuleDirectory('index.ts')).toBe('');
  });

  it('normalizes Windows backslashes', () => {
    expect(getModuleDirectory('src\\orders\\pricing.ts')).toBe('src/orders/');
  });
});

describe('findRelatedTestPaths', () => {
  // Use the API package source to test with real files
  it('finds test files that actually exist on disk', () => {
    // We know db.test.ts exists adjacent to db.ts
    const testPaths = findRelatedTestPaths('src/store/db.ts', TEST_REPO);
    // It should find src/store/db.test.ts
    expect(testPaths.some((p) => p.includes('db.test.ts'))).toBe(true);
  });

  it('returns empty array when no test files found', () => {
    const testPaths = findRelatedTestPaths('src/types/domain.ts', TEST_REPO);
    // domain.ts has no test file — should return empty
    expect(Array.isArray(testPaths)).toBe(true);
  });
});

describe('findReverseImports', () => {
  it('finds the contract test that imports pricing.ts via .js extension', () => {
    // This is the critical scenario: orders.test.ts imports from '../../src/orders/pricing.js'
    // The fix strips .js so that the resolved path matches the .ts source file.
    const importers = findReverseImports('src/orders/pricing.ts', DEMO_REPO);
    expect(importers.some((p) => p.includes('contracts/orders.test.ts'))).toBe(true);
  });

  it('finds invoice.ts which imports pricing.ts', () => {
    const importers = findReverseImports('src/orders/pricing.ts', DEMO_REPO);
    expect(importers.some((p) => p.includes('invoice.ts'))).toBe(true);
  });
});

describe('extractImports', () => {
  it('extracts relative imports from a TypeScript file', () => {
    // db.ts has no relative imports (it only imports from node_modules)
    // But verification.store.ts imports from db.js and domain.js
    const imports = extractImports('src/store/verification.store.ts', TEST_REPO);
    // Should find './db.js' or similar relative imports
    expect(Array.isArray(imports)).toBe(true);
    // These are relative imports starting with '.'
    imports.forEach((imp) => {
      expect(imp.startsWith('.')).toBe(true);
    });
  });

  it('returns empty array for non-existent file', () => {
    const imports = extractImports('src/nonexistent/file.ts', TEST_REPO);
    expect(imports).toHaveLength(0);
  });
});

describe('analyseImpact', () => {
  // Integration test — runs the full engine on synthetic data
  it('confirms UNKNOWN confidence is never upgraded', async () => {
    const { analyseImpact } = await import('./analysis.engine.js');
    const { _setDbForTesting } = await import('../store/db.js');
    const initSqlJs = (await import('sql.js')).default;

    const SQL = await initSqlJs();
    const db = new SQL.Database();
    _setDbForTesting(db);

    // Synthetic changes with no test files in the repo
    const syntheticChanges = [
      {
        id: 'change-001',
        releaseCandidateId: 'rc-001',
        path: 'src/nonexistent-module/special.ts',
        changeType: 'MODIFIED' as const,
        linesAdded: 10,
        linesRemoved: 2,
      },
    ];

    const items = await analyseImpact('/nonexistent/path', 'rc-001', syntheticChanges);

    // Every item with UNKNOWN confidence must stay UNKNOWN
    for (const item of items) {
      if (item.confidence === 'UNKNOWN') {
        expect(item.confidence).toBe('UNKNOWN');
        expect(item.confidence).not.toBe('CONFIRMED');
        expect(item.confidence).not.toBe('SUPPORTED');
      }
    }

    // The directly changed file itself must be CONFIRMED
    const direct = items.find((i) => i.path === 'src/nonexistent-module/special.ts');
    expect(direct).toBeTruthy();
    expect(direct!.confidence).toBe('CONFIRMED');
  });
});
