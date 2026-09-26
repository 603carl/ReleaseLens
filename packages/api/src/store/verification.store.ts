/**
 * Verification Store
 * Persistence for VerificationPlan, VerificationItem, and CheckRun entities.
 */
import { v4 as uuidv4 } from 'uuid';
import { dbAll, dbGet, dbRun } from './db.js';
import type {
  VerificationPlan,
  VerificationItem,
  CheckRun,
  Status,
} from '../types/domain.js';

type DbRow = Record<string, unknown>;

// ─── VerificationPlan ────────────────────────────────────────

function rowToVerificationItem(row: DbRow): VerificationItem {
  return {
    id: row.id as string,
    planId: row.plan_id as string,
    name: row.name as string,
    reason: row.reason as string,
    command: row.command as string,
    expectedOutcome: row.expected_outcome as string,
    status: row.status as Status,
  };
}

export function createVerificationPlan(releaseCandidateId: string): VerificationPlan {
  const id = uuidv4();
  const now = new Date().toISOString();
  dbRun(
    `INSERT INTO verification_plans (id, release_candidate_id, created_at) VALUES (?, ?, ?)`,
    [id, releaseCandidateId, now],
  );
  return {
    id,
    releaseCandidateId,
    createdAt: now,
    items: [],
  };
}

export function getVerificationPlanByReleaseCandidate(
  releaseCandidateId: string,
): VerificationPlan | null {
  const planRow = dbGet(
    `SELECT * FROM verification_plans WHERE release_candidate_id = ? ORDER BY created_at DESC LIMIT 1`,
    [releaseCandidateId],
  );
  if (!planRow) return null;

  const items = dbAll(
    `SELECT * FROM verification_items WHERE plan_id = ? ORDER BY rowid`,
    [planRow.id as string],
  ).map(rowToVerificationItem);

  return {
    id: planRow.id as string,
    releaseCandidateId: planRow.release_candidate_id as string,
    createdAt: planRow.created_at as string,
    items,
  };
}

// ─── VerificationItem ────────────────────────────────────────

export function createVerificationItem(data: {
  planId: string;
  name: string;
  reason: string;
  command: string;
  expectedOutcome: string;
}): VerificationItem {
  const id = uuidv4();
  dbRun(
    `INSERT INTO verification_items (id, plan_id, name, reason, command, expected_outcome, status)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
    [id, data.planId, data.name, data.reason, data.command, data.expectedOutcome],
  );
  return {
    id,
    planId: data.planId,
    name: data.name,
    reason: data.reason,
    command: data.command,
    expectedOutcome: data.expectedOutcome,
    status: 'PENDING',
  };
}

export function updateVerificationItemStatus(id: string, status: Status): void {
  dbRun(`UPDATE verification_items SET status = ? WHERE id = ?`, [status, id]);
}

export function getVerificationItemById(id: string): VerificationItem | null {
  const row = dbGet(`SELECT * FROM verification_items WHERE id = ?`, [id]);
  return row ? rowToVerificationItem(row) : null;
}

// ─── CheckRun ────────────────────────────────────────────────

function rowToCheckRun(row: DbRow): CheckRun {
  return {
    id: row.id as string,
    verificationItemId: row.verification_item_id as string,
    status: row.status as Status,
    exitCode: row.exit_code as number | null,
    stdout: row.stdout as string,
    stderr: row.stderr as string,
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string | null,
  };
}

export function createCheckRun(verificationItemId: string): CheckRun {
  const id = uuidv4();
  const now = new Date().toISOString();
  dbRun(
    `INSERT INTO check_runs (id, verification_item_id, status, stdout, stderr, started_at)
     VALUES (?, ?, 'RUNNING', '', '', ?)`,
    [id, verificationItemId, now],
  );
  // Mark the parent item as RUNNING
  updateVerificationItemStatus(verificationItemId, 'RUNNING');
  return {
    id,
    verificationItemId,
    status: 'RUNNING',
    exitCode: null,
    stdout: '',
    stderr: '',
    startedAt: now,
    completedAt: null,
  };
}

export function completeCheckRun(
  id: string,
  result: { exitCode: number; stdout: string; stderr: string },
): CheckRun {
  const status: Status = result.exitCode === 0 ? 'PASSED' : 'FAILED';
  const now = new Date().toISOString();

  dbRun(
    `UPDATE check_runs SET status = ?, exit_code = ?, stdout = ?, stderr = ?, completed_at = ? WHERE id = ?`,
    [status, result.exitCode, result.stdout, result.stderr, now, id],
  );

  // Retrieve the run to get verificationItemId and update parent
  const run = getCheckRunById(id);
  if (run) {
    updateVerificationItemStatus(run.verificationItemId, status);
  }

  return {
    ...(run ?? { id, verificationItemId: '', startedAt: now }),
    status,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    completedAt: now,
  } as CheckRun;
}

export function getCheckRunById(id: string): CheckRun | null {
  const row = dbGet(`SELECT * FROM check_runs WHERE id = ?`, [id]);
  return row ? rowToCheckRun(row) : null;
}

export function getCheckRunsByVerificationItem(verificationItemId: string): CheckRun[] {
  return dbAll(
    `SELECT * FROM check_runs WHERE verification_item_id = ? ORDER BY started_at`,
    [verificationItemId],
  ).map(rowToCheckRun);
}

export function getCheckRunsByPlan(planId: string): CheckRun[] {
  return dbAll(
    `SELECT cr.* FROM check_runs cr
     JOIN verification_items vi ON vi.id = cr.verification_item_id
     WHERE vi.plan_id = ?
     ORDER BY cr.started_at`,
    [planId],
  ).map(rowToCheckRun);
}
