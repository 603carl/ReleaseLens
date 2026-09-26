/**
 * Impact Store
 * Persistence for ImpactItem entities.
 */
import { v4 as uuidv4 } from 'uuid';
import { dbAll, dbGet, dbRun } from './db.js';
import type { ImpactItem, ImpactType, Confidence } from '../types/domain.js';

type DbRow = Record<string, unknown>;

function rowToImpactItem(row: DbRow): ImpactItem {
  return {
    id: row.id as string,
    releaseCandidateId: row.release_candidate_id as string,
    changeId: row.change_id as string,
    path: row.path as string,
    type: row.type as ImpactType,
    reason: row.reason as string,
    confidence: row.confidence as Confidence,
    evidenceRefs: JSON.parse((row.evidence_refs as string) || '[]') as string[],
  };
}

export function createImpactItem(data: {
  releaseCandidateId: string;
  changeId: string;
  path: string;
  type: ImpactType;
  reason: string;
  confidence: Confidence;
  evidenceRefs?: string[];
}): ImpactItem {
  const id = uuidv4();
  dbRun(
    `INSERT INTO impact_items (id, release_candidate_id, change_id, path, type, reason, confidence, evidence_refs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.releaseCandidateId,
      data.changeId,
      data.path,
      data.type,
      data.reason,
      data.confidence,
      JSON.stringify(data.evidenceRefs ?? []),
    ],
  );
  return {
    id,
    releaseCandidateId: data.releaseCandidateId,
    changeId: data.changeId,
    path: data.path,
    type: data.type,
    reason: data.reason,
    confidence: data.confidence,
    evidenceRefs: data.evidenceRefs ?? [],
  };
}

export function getImpactItemsByReleaseCandidate(releaseCandidateId: string): ImpactItem[] {
  return dbAll(
    `SELECT * FROM impact_items WHERE release_candidate_id = ? ORDER BY confidence, path`,
    [releaseCandidateId],
  ).map(rowToImpactItem);
}

export function getImpactItemById(id: string): ImpactItem | null {
  const row = dbGet(`SELECT * FROM impact_items WHERE id = ?`, [id]);
  return row ? rowToImpactItem(row) : null;
}
