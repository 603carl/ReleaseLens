/**
 * Release Candidate Store
 * Persistence for ReleaseCandidate and Change entities.
 */
import { v4 as uuidv4 } from 'uuid';
import { dbAll, dbGet, dbRun } from './db.js';
import type { ReleaseCandidate, Change, ChangeType, Status } from '../types/domain.js';

type DbRow = Record<string, unknown>;

// ─── ReleaseCandidate ────────────────────────────────────────

function rowToReleaseCandidate(row: DbRow): ReleaseCandidate {
  return {
    id: row.id as string,
    repositoryId: row.repository_id as string,
    baseRef: row.base_ref as string,
    targetRef: row.target_ref as string,
    label: row.label as string,
    status: row.status as Status,
    createdAt: row.created_at as string,
  };
}

export function createReleaseCandidate(data: {
  repositoryId: string;
  baseRef: string;
  targetRef: string;
  label: string;
}): ReleaseCandidate {
  const id = uuidv4();
  const now = new Date().toISOString();
  dbRun(
    `INSERT INTO release_candidates (id, repository_id, base_ref, target_ref, label, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
    [id, data.repositoryId, data.baseRef, data.targetRef, data.label, now],
  );
  return {
    id,
    repositoryId: data.repositoryId,
    baseRef: data.baseRef,
    targetRef: data.targetRef,
    label: data.label,
    status: 'PENDING',
    createdAt: now,
  };
}

export function getReleaseCandidateById(id: string): ReleaseCandidate | null {
  const row = dbGet(`SELECT * FROM release_candidates WHERE id = ?`, [id]);
  return row ? rowToReleaseCandidate(row) : null;
}

export function getReleaseCandidatesByRepository(repositoryId: string): ReleaseCandidate[] {
  return dbAll(
    `SELECT * FROM release_candidates WHERE repository_id = ? ORDER BY created_at DESC`,
    [repositoryId],
  ).map(rowToReleaseCandidate);
}

export function updateReleaseCandidateStatus(id: string, status: Status): void {
  dbRun(`UPDATE release_candidates SET status = ? WHERE id = ?`, [status, id]);
}

// ─── Change ──────────────────────────────────────────────────

function rowToChange(row: DbRow): Change {
  return {
    id: row.id as string,
    releaseCandidateId: row.release_candidate_id as string,
    path: row.path as string,
    changeType: row.change_type as ChangeType,
    linesAdded: row.lines_added as number,
    linesRemoved: row.lines_removed as number,
  };
}

export function createChange(data: {
  releaseCandidateId: string;
  path: string;
  changeType: ChangeType;
  linesAdded?: number;
  linesRemoved?: number;
}): Change {
  const id = uuidv4();
  dbRun(
    `INSERT INTO changes (id, release_candidate_id, path, change_type, lines_added, lines_removed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.releaseCandidateId,
      data.path,
      data.changeType,
      data.linesAdded ?? 0,
      data.linesRemoved ?? 0,
    ],
  );
  return {
    id,
    releaseCandidateId: data.releaseCandidateId,
    path: data.path,
    changeType: data.changeType,
    linesAdded: data.linesAdded ?? 0,
    linesRemoved: data.linesRemoved ?? 0,
  };
}

export function getChangesByReleaseCandidate(releaseCandidateId: string): Change[] {
  return dbAll(
    `SELECT * FROM changes WHERE release_candidate_id = ? ORDER BY path`,
    [releaseCandidateId],
  ).map(rowToChange);
}

export function bulkCreateChanges(changes: Omit<Change, 'id'>[]): Change[] {
  return changes.map((c) =>
    createChange({
      releaseCandidateId: c.releaseCandidateId,
      path: c.path,
      changeType: c.changeType,
      linesAdded: c.linesAdded,
      linesRemoved: c.linesRemoved,
    }),
  );
}
