/**
 * Repository Store
 * All persistence operations for the Repository entity.
 */
import { v4 as uuidv4 } from 'uuid';
import { dbAll, dbGet, dbRun } from './db.js';
import type { Repository } from '../types/domain.js';

type DbRow = Record<string, unknown>;

function rowToRepository(row: DbRow): Repository {
  return {
    id: row.id as string,
    name: row.name as string,
    path: row.path as string,
    branch: row.branch as string,
    commitHash: row.commit_hash as string,
    detectedStack: row.detected_stack as string,
    createdAt: row.created_at as string,
  };
}

export function createRepository(data: {
  name: string;
  path: string;
  branch?: string;
  commitHash?: string;
  detectedStack?: string;
}): Repository {
  const id = uuidv4();
  const now = new Date().toISOString();
  dbRun(
    `INSERT INTO repositories (id, name, path, branch, commit_hash, detected_stack, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.path,
      data.branch ?? '',
      data.commitHash ?? '',
      data.detectedStack ?? '',
      now,
    ],
  );
  return {
    id,
    name: data.name,
    path: data.path,
    branch: data.branch ?? '',
    commitHash: data.commitHash ?? '',
    detectedStack: data.detectedStack ?? '',
    createdAt: now,
  };
}

export function getRepositoryById(id: string): Repository | null {
  const row = dbGet(`SELECT * FROM repositories WHERE id = ?`, [id]);
  return row ? rowToRepository(row) : null;
}

export function getAllRepositories(): Repository[] {
  return dbAll(`SELECT * FROM repositories ORDER BY created_at DESC`).map(rowToRepository);
}

export function updateRepository(
  id: string,
  updates: Partial<Pick<Repository, 'branch' | 'commitHash' | 'detectedStack'>>,
): void {
  if (updates.branch !== undefined) {
    dbRun(`UPDATE repositories SET branch = ? WHERE id = ?`, [updates.branch, id]);
  }
  if (updates.commitHash !== undefined) {
    dbRun(`UPDATE repositories SET commit_hash = ? WHERE id = ?`, [updates.commitHash, id]);
  }
  if (updates.detectedStack !== undefined) {
    dbRun(`UPDATE repositories SET detected_stack = ? WHERE id = ?`, [updates.detectedStack, id]);
  }
}

export function deleteRepository(id: string): void {
  const rcs = dbAll(`SELECT id FROM release_candidates WHERE repository_id = ?`, [id]);
  for (const rc of rcs) {
    const rcId = rc.id as string;
    dbRun(`DELETE FROM evidence WHERE finding_id IN (SELECT id FROM findings WHERE release_candidate_id = ?)`, [rcId]);
    dbRun(`DELETE FROM findings WHERE release_candidate_id = ?`, [rcId]);
    dbRun(`DELETE FROM check_runs WHERE release_candidate_id = ?`, [rcId]);
    dbRun(`DELETE FROM verification_items WHERE verification_plan_id IN (SELECT id FROM verification_plans WHERE release_candidate_id = ?)`, [rcId]);
    dbRun(`DELETE FROM verification_plans WHERE release_candidate_id = ?`, [rcId]);
    dbRun(`DELETE FROM impact_items WHERE release_candidate_id = ?`, [rcId]);
    dbRun(`DELETE FROM changes WHERE release_candidate_id = ?`, [rcId]);
    dbRun(`DELETE FROM dossiers WHERE release_candidate_id = ?`, [rcId]);
    dbRun(`DELETE FROM release_candidates WHERE id = ?`, [rcId]);
  }
  dbRun(`DELETE FROM repositories WHERE id = ?`, [id]);
}

