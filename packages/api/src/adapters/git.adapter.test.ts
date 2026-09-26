/**
 * Git Adapter Unit Tests
 * Tests deterministic functions that don't require a real git repo.
 */
import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  validateRepoPath,
  detectStack,
  formatDetectedStack,
} from './git.adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The workspace root is a valid git repo — use it for validation tests
const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

describe('validateRepoPath', () => {
  it('accepts a valid git repository path', () => {
    const result = validateRepoPath(WORKSPACE_ROOT);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects a non-existent path', () => {
    const result = validateRepoPath('/this/path/does/not/exist/at/all');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('does not exist');
  });

  it('rejects a path without a .git directory', () => {
    // Use a temp-like directory that exists but has no .git
    const result = validateRepoPath(path.join(WORKSPACE_ROOT, 'packages'));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('.git');
  });
});

describe('detectStack', () => {
  it('detects Node.js/TypeScript for the API package', () => {
    const apiDir = path.resolve(__dirname, '..', '..'); // packages/api
    const stack = detectStack(apiDir);
    expect(stack.primary).toContain('Node.js');
    expect(stack.primary).toContain('TypeScript');
    expect(stack.packageManager).toBe('npm');
  });

  it('detects Vitest as test framework for the API package', () => {
    const apiDir = path.resolve(__dirname, '..', '..');
    const stack = detectStack(apiDir);
    expect(stack.testFramework).toBe('Vitest');
  });

  it('returns Unknown for an empty directory (no package.json)', () => {
    // Use a directory we know has no package.json
    const stack = detectStack('/tmp');
    expect(stack.primary).toBe('Unknown');
  });
});

describe('formatDetectedStack', () => {
  it('formats stack with frameworks', () => {
    const formatted = formatDetectedStack({
      primary: 'Node.js / TypeScript',
      frameworks: ['React', 'Express'],
      testFramework: 'Vitest',
      packageManager: 'npm',
    });
    expect(formatted).toBe('Node.js / TypeScript + React, Express');
  });

  it('formats stack without frameworks', () => {
    const formatted = formatDetectedStack({
      primary: 'Node.js / TypeScript',
      frameworks: [],
      testFramework: 'Vitest',
      packageManager: 'npm',
    });
    expect(formatted).toBe('Node.js / TypeScript');
  });

  it('formats Python stack', () => {
    const formatted = formatDetectedStack({
      primary: 'Python',
      frameworks: [],
      testFramework: 'pytest',
      packageManager: 'pip',
    });
    expect(formatted).toBe('Python');
  });
});
