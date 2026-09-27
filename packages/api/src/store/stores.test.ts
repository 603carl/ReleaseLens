/**
 * Store integration tests — uses a shared in-memory sql.js database
 * and exercises every store's CRUD operations + domain rules.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import initSqlJs from 'sql.js';
import { _setDbForTesting } from './db.js';

// ─── Shared schema builder (mirrors db.ts) ───────────────────

async function setupInMemoryDb() {
  const SQL = await initSqlJs();
  const database = new SQL.Database();
  database.run(`
    CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL,
      branch TEXT NOT NULL DEFAULT '', commit_hash TEXT NOT NULL DEFAULT '',
      detected_stack TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS release_candidates (
      id TEXT PRIMARY KEY, repository_id TEXT NOT NULL REFERENCES repositories(id),
      base_ref TEXT NOT NULL, target_ref TEXT NOT NULL, label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS changes (
      id TEXT PRIMARY KEY, release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id),
      path TEXT NOT NULL, change_type TEXT NOT NULL,
      lines_added INTEGER NOT NULL DEFAULT 0, lines_removed INTEGER NOT NULL DEFAULT 0
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS impact_items (
      id TEXT PRIMARY KEY, release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id),
      change_id TEXT NOT NULL REFERENCES changes(id), path TEXT NOT NULL,
      type TEXT NOT NULL, reason TEXT NOT NULL, confidence TEXT NOT NULL,
      evidence_refs TEXT NOT NULL DEFAULT '[]'
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS verification_plans (
      id TEXT PRIMARY KEY, release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id),
      created_at TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS verification_items (
      id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES verification_plans(id),
      name TEXT NOT NULL, reason TEXT NOT NULL, command TEXT NOT NULL,
      expected_outcome TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING'
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS check_runs (
      id TEXT PRIMARY KEY, verification_item_id TEXT NOT NULL REFERENCES verification_items(id),
      status TEXT NOT NULL DEFAULT 'PENDING', exit_code INTEGER,
      stdout TEXT NOT NULL DEFAULT '', stderr TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL, completed_at TEXT
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY, release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id),
      category TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'FAILED',
      title TEXT NOT NULL, summary TEXT NOT NULL, source_check_id TEXT NOT NULL,
      affected_areas TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY, finding_id TEXT NOT NULL REFERENCES findings(id),
      type TEXT NOT NULL, source TEXT NOT NULL, excerpt TEXT NOT NULL, created_at TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS dossiers (
      id TEXT PRIMARY KEY, release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id),
      generated_at TEXT NOT NULL, markdown_content TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'NOT_VERIFIED'
    )
  `);
  return database;
}

// ─── Stores (imported after db is patched) ───────────────────
import {
  createRepository,
  deleteRepository,
  getRepositoryById,
  getAllRepositories,
  updateRepository,
} from './repository.store.js';
import {
  createReleaseCandidate,
  getReleaseCandidateById,
  getReleaseCandidatesByRepository,
  updateReleaseCandidateStatus,
  createChange,
  getChangesByReleaseCandidate,
  bulkCreateChanges,
} from './release-candidate.store.js';
import {
  createImpactItem,
  getImpactItemsByReleaseCandidate,
} from './impact.store.js';
import {
  createVerificationPlan,
  getVerificationPlanByReleaseCandidate,
  createVerificationItem,
  updateVerificationItemStatus,
  createCheckRun,
  completeCheckRun,
  getCheckRunById,
} from './verification.store.js';
import {
  createFinding,
  getFindingsByReleaseCandidate,
  createEvidence,
  getEvidenceByFinding,
  upsertDossier,
  getDossierByReleaseCandidate,
} from './evidence.store.js';

// ─── Test Lifecycle ──────────────────────────────────────────

beforeAll(async () => {
  const database = await setupInMemoryDb();
  _setDbForTesting(database);
});

// Seed data created once per suite
let repoId: string;
let rcId: string;
let changeId: string;

// ─── Repository Store Tests ──────────────────────────────────

describe('repository.store', () => {
  it('creates a repository and returns full entity', () => {
    const repo = createRepository({
      name: 'demo-repo',
      path: '/projects/demo',
      branch: 'main',
      commitHash: 'abc123def456',
      detectedStack: 'Node.js / TypeScript',
    });

    expect(repo.id).toBeTruthy();
    expect(repo.name).toBe('demo-repo');
    expect(repo.path).toBe('/projects/demo');
    expect(repo.branch).toBe('main');
    expect(repo.commitHash).toBe('abc123def456');
    expect(repo.detectedStack).toBe('Node.js / TypeScript');
    expect(repo.createdAt).toBeTruthy();

    repoId = repo.id;
  });

  it('retrieves a repository by id', () => {
    const repo = getRepositoryById(repoId);
    expect(repo).not.toBeNull();
    expect(repo!.id).toBe(repoId);
    expect(repo!.name).toBe('demo-repo');
  });

  it('returns null for unknown repository id', () => {
    expect(getRepositoryById('nonexistent-id')).toBeNull();
  });

  it('lists all repositories', () => {
    const repos = getAllRepositories();
    expect(repos.length).toBeGreaterThan(0);
    expect(repos.some((r) => r.id === repoId)).toBe(true);
  });

  it('updates branch and commitHash', () => {
    updateRepository(repoId, { branch: 'feature/discount-logic', commitHash: 'xyz789' });
    const updated = getRepositoryById(repoId);
    expect(updated!.branch).toBe('feature/discount-logic');
    expect(updated!.commitHash).toBe('xyz789');
  });
});

// ─── Release Candidate Store Tests ──────────────────────────

describe('release-candidate.store', () => {
  it('creates a release candidate with PENDING status', () => {
    const rc = createReleaseCandidate({
      repositoryId: repoId,
      baseRef: 'main',
      targetRef: 'HEAD',
      label: 'v1.2.0-rc1',
    });

    expect(rc.id).toBeTruthy();
    expect(rc.status).toBe('PENDING');
    expect(rc.label).toBe('v1.2.0-rc1');
    expect(rc.repositoryId).toBe(repoId);

    rcId = rc.id;
  });

  it('retrieves a release candidate by id', () => {
    const rc = getReleaseCandidateById(rcId);
    expect(rc).not.toBeNull();
    expect(rc!.label).toBe('v1.2.0-rc1');
  });

  it('lists release candidates for a repository', () => {
    const rcs = getReleaseCandidatesByRepository(repoId);
    expect(rcs.some((r) => r.id === rcId)).toBe(true);
  });

  it('updates status from PENDING to RUNNING', () => {
    updateReleaseCandidateStatus(rcId, 'RUNNING');
    const rc = getReleaseCandidateById(rcId);
    expect(rc!.status).toBe('RUNNING');
  });

  it('creates a Change entity', () => {
    const change = createChange({
      releaseCandidateId: rcId,
      path: 'src/orders/pricing.ts',
      changeType: 'MODIFIED',
      linesAdded: 42,
      linesRemoved: 8,
    });

    expect(change.id).toBeTruthy();
    expect(change.path).toBe('src/orders/pricing.ts');
    expect(change.changeType).toBe('MODIFIED');
    expect(change.linesAdded).toBe(42);
    expect(change.linesRemoved).toBe(8);

    changeId = change.id;
  });

  it('retrieves changes for a release candidate', () => {
    const changes = getChangesByReleaseCandidate(rcId);
    expect(changes.some((c) => c.id === changeId)).toBe(true);
  });

  it('bulk-creates multiple changes', () => {
    const created = bulkCreateChanges([
      { releaseCandidateId: rcId, path: 'src/payments/invoice.ts', changeType: 'MODIFIED', linesAdded: 15, linesRemoved: 3 },
      { releaseCandidateId: rcId, path: 'src/shared/validators.ts', changeType: 'MODIFIED', linesAdded: 5, linesRemoved: 1 },
    ]);
    expect(created).toHaveLength(2);
    const all = getChangesByReleaseCandidate(rcId);
    expect(all.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── Impact Store Tests ──────────────────────────────────────

describe('impact.store', () => {
  it('creates an impact item with CONFIRMED confidence', () => {
    const item = createImpactItem({
      releaseCandidateId: rcId,
      changeId: changeId,
      path: 'src/orders/',
      type: 'MODULE',
      reason: 'Direct modification of pricing.ts in orders module',
      confidence: 'CONFIRMED',
      evidenceRefs: ['change-import-trace-001'],
    });

    expect(item.id).toBeTruthy();
    expect(item.confidence).toBe('CONFIRMED');
    expect(item.type).toBe('MODULE');
    expect(item.evidenceRefs).toContain('change-import-trace-001');
  });

  it('creates an UNKNOWN confidence impact item', () => {
    const item = createImpactItem({
      releaseCandidateId: rcId,
      changeId: changeId,
      path: 'src/shared/validators.ts',
      type: 'UNKNOWN',
      reason: 'No test mapping found for changed file',
      confidence: 'UNKNOWN',
    });
    expect(item.confidence).toBe('UNKNOWN');
    // UNKNOWN must never be silently upgraded
    const retrieved = getImpactItemsByReleaseCandidate(rcId);
    const found = retrieved.find((i) => i.id === item.id);
    expect(found!.confidence).toBe('UNKNOWN');
  });

  it('lists all impact items for a release candidate', () => {
    const items = getImpactItemsByReleaseCandidate(rcId);
    expect(items.length).toBeGreaterThanOrEqual(2);
    // UNKNOWN items must appear in list
    expect(items.some((i) => i.confidence === 'UNKNOWN')).toBe(true);
  });
});

// ─── Verification Store Tests ────────────────────────────────

let planId: string;
let itemId: string;
let checkRunId: string;

describe('verification.store', () => {
  it('creates a verification plan', () => {
    const plan = createVerificationPlan(rcId);
    expect(plan.id).toBeTruthy();
    expect(plan.releaseCandidateId).toBe(rcId);
    expect(plan.items).toHaveLength(0);
    planId = plan.id;
  });

  it('retrieves a verification plan by release candidate', () => {
    const plan = getVerificationPlanByReleaseCandidate(rcId);
    expect(plan).not.toBeNull();
    expect(plan!.id).toBe(planId);
  });

  it('creates a verification item inside the plan', () => {
    const item = createVerificationItem({
      planId,
      name: 'Contract tests',
      reason: 'orders module contract test impacted by pricing change',
      command: 'npm test -- contracts',
      expectedOutcome: 'All contract tests pass',
    });

    expect(item.id).toBeTruthy();
    expect(item.status).toBe('PENDING');
    expect(item.command).toBe('npm test -- contracts');

    itemId = item.id;
  });

  it('retrieves plan with its items', () => {
    const plan = getVerificationPlanByReleaseCandidate(rcId);
    expect(plan!.items.some((i) => i.id === itemId)).toBe(true);
  });

  it('updates verification item status', () => {
    updateVerificationItemStatus(itemId, 'RUNNING');
    const plan = getVerificationPlanByReleaseCandidate(rcId);
    const item = plan!.items.find((i) => i.id === itemId);
    expect(item!.status).toBe('RUNNING');
  });

  it('creates a check run in RUNNING state', () => {
    const run = createCheckRun(itemId);
    expect(run.id).toBeTruthy();
    expect(run.status).toBe('RUNNING');
    expect(run.exitCode).toBeNull();
    checkRunId = run.id;
  });

  it('completes a check run with exitCode=1 → FAILED', () => {
    const run = completeCheckRun(checkRunId, {
      exitCode: 1,
      stdout: 'FAIL: orders.test.ts — expected 100 received 90',
      stderr: '',
    });
    expect(run.status).toBe('FAILED');
    expect(run.exitCode).toBe(1);
    expect(run.stdout).toContain('expected 100 received 90');
    expect(run.completedAt).toBeTruthy();
  });

  it('completes a check run with exitCode=0 → PASSED', () => {
    const item2 = createVerificationItem({
      planId,
      name: 'Lint',
      reason: 'Check changed files for lint violations',
      command: 'npm run lint',
      expectedOutcome: 'No lint errors',
    });
    const run2 = createCheckRun(item2.id);
    const completed = completeCheckRun(run2.id, { exitCode: 0, stdout: '', stderr: '' });
    expect(completed.status).toBe('PASSED');
  });

  it('retrieves a check run by id', () => {
    const run = getCheckRunById(checkRunId);
    expect(run).not.toBeNull();
    expect(run!.status).toBe('FAILED');
  });
});

// ─── Evidence & Finding Store Tests ─────────────────────────

let findingId: string;

describe('evidence.store — findings', () => {
  it('creates a CRITICAL finding', () => {
    const finding = createFinding({
      releaseCandidateId: rcId,
      category: 'CONTRACT_FAILURE',
      severity: 'CRITICAL',
      status: 'FAILED',
      title: 'Contract test failed: orders total mismatch',
      summary: 'The order total contract expectation failed after pricing logic change.',
      sourceCheckId: checkRunId,
      affectedAreas: ['src/orders/', 'tests/contracts/'],
    });

    expect(finding.id).toBeTruthy();
    expect(finding.severity).toBe('CRITICAL');
    expect(finding.category).toBe('CONTRACT_FAILURE');
    expect(finding.affectedAreas).toContain('src/orders/');

    findingId = finding.id;
  });

  it('creates evidence linked to the finding', () => {
    const ev = createEvidence({
      findingId,
      type: 'COMMAND_OUTPUT',
      source: 'npm test -- contracts',
      excerpt: 'FAIL: orders.test.ts:42\nExpected: 100\nReceived: 90',
    });

    expect(ev.id).toBeTruthy();
    expect(ev.type).toBe('COMMAND_OUTPUT');
    expect(ev.findingId).toBe(findingId);
  });

  it('retrieves evidence for a finding', () => {
    const evidence = getEvidenceByFinding(findingId);
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence[0].source).toBe('npm test -- contracts');
  });

  it('retrieves findings sorted by severity (CRITICAL first)', () => {
    // Add a lower severity finding
    createFinding({
      releaseCandidateId: rcId,
      category: 'LINT_VIOLATION',
      severity: 'MEDIUM',
      status: 'FAILED',
      title: 'Lint: no-unused-vars in invoice.ts',
      summary: 'Unused variable detected in invoice.ts',
      sourceCheckId: checkRunId,
    });

    const findings = getFindingsByReleaseCandidate(rcId);
    expect(findings[0].severity).toBe('CRITICAL');
    expect(findings.some((f) => f.severity === 'MEDIUM')).toBe(true);
  });

  it('findings include their evidence records', () => {
    const findings = getFindingsByReleaseCandidate(rcId);
    const critical = findings.find((f) => f.severity === 'CRITICAL')!;
    expect(critical.evidence.length).toBeGreaterThan(0);
  });
});

// ─── Dossier Store Tests ─────────────────────────────────────

describe('evidence.store — dossier', () => {
  it('creates a dossier for a release candidate', () => {
    const dossier = upsertDossier({
      releaseCandidateId: rcId,
      markdownContent: '# Release Dossier\n\nVerification status: NOT_VERIFIED',
      verificationStatus: 'NOT_VERIFIED',
    });

    expect(dossier.id).toBeTruthy();
    expect(dossier.verificationStatus).toBe('NOT_VERIFIED');
    expect(dossier.markdownContent).toContain('Release Dossier');
  });

  it('retrieves a dossier by release candidate', () => {
    const dossier = getDossierByReleaseCandidate(rcId);
    expect(dossier).not.toBeNull();
    expect(dossier!.verificationStatus).toBe('NOT_VERIFIED');
  });

  it('upserts a dossier (replaces old one)', () => {
    upsertDossier({
      releaseCandidateId: rcId,
      markdownContent: '# Updated Dossier',
      verificationStatus: 'NOT_VERIFIED',
    });
    const dossier = getDossierByReleaseCandidate(rcId);
    expect(dossier!.markdownContent).toBe('# Updated Dossier');
  });

  it('never stores "safe" as a verification status', () => {
    // "safe" is not a valid Status — TypeScript prevents it at compile time.
    // At runtime, we verify only valid values enter the store.
    const dossier = getDossierByReleaseCandidate(rcId);
    const validStatuses = ['PENDING','RUNNING','PASSED','FAILED','BLOCKED','UNKNOWN','NOT_VERIFIED'];
    expect(validStatuses).toContain(dossier!.verificationStatus);
  });
});

// ─── Status Model Tests ──────────────────────────────────────

describe('Status model integrity', () => {
  it('UNKNOWN confidence is preserved through full round-trip', () => {
    const changes = getChangesByReleaseCandidate(rcId);
    const unknownChange = createImpactItem({
      releaseCandidateId: rcId,
      changeId: changes[0].id,
      path: 'src/unknown-area/something.ts',
      type: 'UNKNOWN',
      reason: 'Cannot determine dependencies',
      confidence: 'UNKNOWN',
    });
    const retrieved = getImpactItemsByReleaseCandidate(rcId);
    const found = retrieved.find((i) => i.id === unknownChange.id);
    // Must remain UNKNOWN — never silently upgraded
    expect(found!.confidence).toBe('UNKNOWN');
    expect(found!.confidence).not.toBe('CONFIRMED');
    expect(found!.confidence).not.toBe('SUPPORTED');
  });
});

describe('repository.store deletion', () => {
  it('removes related check runs through their verification plan', () => {
    expect(() => deleteRepository(repoId)).not.toThrow();
    expect(getRepositoryById(repoId)).toBeNull();
    expect(getCheckRunById(checkRunId)).toBeNull();
  });
});
