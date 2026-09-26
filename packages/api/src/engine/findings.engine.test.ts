/**
 * Findings Engine + Dossier Generator Unit Tests
 */
import { describe, it, expect } from 'vitest';
import {
  classifySeverity,
  classifyCategory,
  buildFindingTitle,
  findAffectedAreas,
} from './findings.engine.js';
import {
  computeVerificationStatus,
  generateDossierMarkdown,
} from './dossier.generator.js';
import type { ImpactItem, CheckRun, Finding, Repository, ReleaseCandidate } from '../types/domain.js';

// ─── Findings Engine Tests ───────────────────────────────────

describe('classifySeverity', () => {
  it('classifies contract test failures as CRITICAL', () => {
    expect(classifySeverity('npm test -- --reporter=verbose')).toBe('CRITICAL');
  });

  it('classifies unit test failures as HIGH', () => {
    expect(classifySeverity('npm test')).toBe('HIGH');
  });

  it('classifies typecheck failures as HIGH', () => {
    expect(classifySeverity('npm run typecheck')).toBe('HIGH');
  });

  it('classifies build failures as HIGH', () => {
    expect(classifySeverity('npm run build')).toBe('HIGH');
  });

  it('classifies lint failures as MEDIUM', () => {
    expect(classifySeverity('npm run lint')).toBe('MEDIUM');
  });
});

describe('classifyCategory', () => {
  it('classifies contract test failures as CONTRACT_FAILURE', () => {
    expect(classifyCategory('npm test -- --reporter=verbose')).toBe('CONTRACT_FAILURE');
  });

  it('classifies unit test failures as TEST_FAILURE', () => {
    expect(classifyCategory('npm test')).toBe('TEST_FAILURE');
  });

  it('classifies typecheck failures as TYPE_ERROR', () => {
    expect(classifyCategory('npm run typecheck')).toBe('TYPE_ERROR');
  });

  it('classifies lint failures as LINT_VIOLATION', () => {
    expect(classifyCategory('npm run lint')).toBe('LINT_VIOLATION');
  });
});

describe('buildFindingTitle', () => {
  it('includes exit code in title', () => {
    const title = buildFindingTitle('npm test', 1);
    expect(title).toContain('1');
    expect(title.toLowerCase()).toContain('test');
  });

  it('distinguishes contract test failures in title', () => {
    const title = buildFindingTitle('npm test -- --reporter=verbose', 1);
    expect(title.toLowerCase()).toContain('contract');
  });

  it('produces lint title for lint failures', () => {
    const title = buildFindingTitle('npm run lint', 1);
    expect(title.toLowerCase()).toContain('lint');
  });
});

describe('findAffectedAreas', () => {
  const impactItems: ImpactItem[] = [
    {
      id: '1', releaseCandidateId: 'rc', changeId: 'c1',
      path: 'src/orders/pricing.ts', type: 'MODULE',
      reason: 'test', confidence: 'CONFIRMED', evidenceRefs: [],
    },
    {
      id: '2', releaseCandidateId: 'rc', changeId: 'c1',
      path: 'tests/contracts/orders.test.ts', type: 'CONTRACT_TEST',
      reason: 'test', confidence: 'SUPPORTED', evidenceRefs: [],
    },
    {
      id: '3', releaseCandidateId: 'rc', changeId: 'c2',
      path: 'src/shared/validators.ts', type: 'UNKNOWN',
      reason: 'test', confidence: 'UNKNOWN', evidenceRefs: [],
    },
  ];

  it('returns module and test areas for test failures', () => {
    const areas = findAffectedAreas('npm test', impactItems);
    expect(areas).toContain('src/orders/pricing.ts');
    expect(areas).toContain('tests/contracts/orders.test.ts');
  });

  it('returns only CONFIRMED areas for lint failures', () => {
    const areas = findAffectedAreas('npm run lint', impactItems);
    expect(areas).toContain('src/orders/pricing.ts');
    expect(areas).not.toContain('src/shared/validators.ts'); // UNKNOWN — not CONFIRMED
  });
});

// ─── Dossier Generator Tests ─────────────────────────────────

describe('computeVerificationStatus', () => {
  it('returns NOT_VERIFIED when no checks run', () => {
    expect(computeVerificationStatus([], [])).toBe('NOT_VERIFIED');
  });

  it('returns FAILED when any check failed', () => {
    const runs: Partial<CheckRun>[] = [{ status: 'FAILED', exitCode: 1, id: '1', verificationItemId: 'v1', stdout: '', stderr: '', startedAt: '', completedAt: '' }];
    expect(computeVerificationStatus([], runs as CheckRun[])).toBe('FAILED');
  });

  it('returns FAILED when CRITICAL finding exists', () => {
    const findings: Partial<Finding>[] = [{ severity: 'CRITICAL', status: 'FAILED' }];
    const runs: Partial<CheckRun>[] = [{ status: 'PASSED', exitCode: 0, id: '1', verificationItemId: 'v1', stdout: '', stderr: '', startedAt: '', completedAt: '' }];
    expect(computeVerificationStatus(findings as Finding[], runs as CheckRun[])).toBe('FAILED');
  });

  it('returns PASSED when all checks pass and no findings', () => {
    const runs: Partial<CheckRun>[] = [{ status: 'PASSED', exitCode: 0, id: '1', verificationItemId: 'v1', stdout: '', stderr: '', startedAt: '', completedAt: '' }];
    expect(computeVerificationStatus([], runs as CheckRun[])).toBe('PASSED');
  });

  it('NEVER returns "safe" as a status', () => {
    const result = computeVerificationStatus([], []);
    expect(result).not.toBe('safe');
    expect(result).not.toBe('SAFE');
    const valid = ['PASSED', 'FAILED', 'NOT_VERIFIED'];
    expect(valid).toContain(result);
  });
});

describe('generateDossierMarkdown', () => {
  const repo: Repository = {
    id: 'repo-1', name: 'demo-repo', path: '/demo',
    branch: 'feature/discount', commitHash: 'abc123',
    detectedStack: 'Node.js / TypeScript', createdAt: '2024-01-01T00:00:00Z',
  };

  const rc: ReleaseCandidate = {
    id: 'rc-1', repositoryId: 'repo-1', baseRef: 'main', targetRef: 'HEAD',
    label: 'v1.2.0-rc1', status: 'FAILED', createdAt: '2024-01-01T00:00:00Z',
  };

  it('generates a Markdown document', () => {
    const md = generateDossierMarkdown({
      repository: repo, releaseCandidate: rc,
      changes: [], impactItems: [], plan: null, checkRuns: [], findings: [],
    });
    expect(md).toContain('# Release Verification Dossier');
    expect(md).toContain('demo-repo');
  });

  it('contains all 11 required sections', () => {
    const md = generateDossierMarkdown({
      repository: repo, releaseCandidate: rc,
      changes: [], impactItems: [], plan: null, checkRuns: [], findings: [],
    });
    for (let i = 1; i <= 11; i++) {
      expect(md).toContain(`## ${i}.`);
    }
  });

  it('never declares a release safe', () => {
    const md = generateDossierMarkdown({
      repository: repo, releaseCandidate: rc,
      changes: [], impactItems: [], plan: null, checkRuns: [], findings: [],
    });
    // The word "safe" must never appear as a release declaration
    expect(md.toLowerCase()).not.toContain('release is safe');
    expect(md.toLowerCase()).not.toContain('zero risk');
    expect(md.toLowerCase()).not.toContain('guaranteed');
  });

  it('includes the evidence-over-assertion disclaimer', () => {
    const md = generateDossierMarkdown({
      repository: repo, releaseCandidate: rc,
      changes: [], impactItems: [], plan: null, checkRuns: [], findings: [],
    });
    expect(md).toContain('does not replace engineering judgment');
  });

  it('shows UNKNOWN impact areas in the dossier', () => {
    const unknownItem: ImpactItem = {
      id: 'u1', releaseCandidateId: 'rc-1', changeId: 'c1',
      path: 'src/unknown/file.ts', type: 'UNKNOWN',
      reason: 'No test mapping', confidence: 'UNKNOWN', evidenceRefs: [],
    };
    const md = generateDossierMarkdown({
      repository: repo, releaseCandidate: rc,
      changes: [], impactItems: [unknownItem], plan: null, checkRuns: [], findings: [],
    });
    expect(md).toContain('UNKNOWN');
    expect(md).toContain('src/unknown/file.ts');
  });
});
