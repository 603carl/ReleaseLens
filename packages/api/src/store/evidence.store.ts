/**
 * Evidence Store
 * Persistence for Finding and Evidence entities.
 * Every finding must have at least one evidence record.
 */
import { v4 as uuidv4 } from 'uuid';
import { dbAll, dbGet, dbRun } from './db.js';
import type {
  Finding,
  Evidence,
  Severity,
  Status,
  FindingCategory,
  EvidenceType,
} from '../types/domain.js';

type DbRow = Record<string, unknown>;

// ─── Evidence ────────────────────────────────────────────────

function rowToEvidence(row: DbRow): Evidence {
  return {
    id: row.id as string,
    findingId: row.finding_id as string,
    type: row.type as EvidenceType,
    source: row.source as string,
    excerpt: row.excerpt as string,
    createdAt: row.created_at as string,
  };
}

export function createEvidence(data: {
  findingId: string;
  type: EvidenceType;
  source: string;
  excerpt: string;
}): Evidence {
  const id = uuidv4();
  const now = new Date().toISOString();
  dbRun(
    `INSERT INTO evidence (id, finding_id, type, source, excerpt, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.findingId, data.type, data.source, data.excerpt, now],
  );
  return {
    id,
    findingId: data.findingId,
    type: data.type,
    source: data.source,
    excerpt: data.excerpt,
    createdAt: now,
  };
}

export function getEvidenceByFinding(findingId: string): Evidence[] {
  return dbAll(
    `SELECT * FROM evidence WHERE finding_id = ? ORDER BY created_at`,
    [findingId],
  ).map(rowToEvidence);
}

// ─── Finding ─────────────────────────────────────────────────

function rowToFinding(row: DbRow, evidence: Evidence[]): Finding {
  return {
    id: row.id as string,
    releaseCandidateId: row.release_candidate_id as string,
    category: row.category as FindingCategory,
    severity: row.severity as Severity,
    status: row.status as Status,
    title: row.title as string,
    summary: row.summary as string,
    sourceCheckId: row.source_check_id as string,
    affectedAreas: JSON.parse((row.affected_areas as string) || '[]') as string[],
    evidence,
    createdAt: row.created_at as string,
  };
}

export function createFinding(data: {
  releaseCandidateId: string;
  category: FindingCategory;
  severity: Severity;
  status: Status;
  title: string;
  summary: string;
  sourceCheckId: string;
  affectedAreas?: string[];
}): Finding {
  const id = uuidv4();
  const now = new Date().toISOString();
  dbRun(
    `INSERT INTO findings
       (id, release_candidate_id, category, severity, status, title, summary, source_check_id, affected_areas, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.releaseCandidateId,
      data.category,
      data.severity,
      data.status,
      data.title,
      data.summary,
      data.sourceCheckId,
      JSON.stringify(data.affectedAreas ?? []),
      now,
    ],
  );
  return {
    id,
    releaseCandidateId: data.releaseCandidateId,
    category: data.category,
    severity: data.severity,
    status: data.status,
    title: data.title,
    summary: data.summary,
    sourceCheckId: data.sourceCheckId,
    affectedAreas: data.affectedAreas ?? [],
    evidence: [],
    createdAt: now,
  };
}

export function getFindingById(id: string): Finding | null {
  const row = dbGet(`SELECT * FROM findings WHERE id = ?`, [id]);
  if (!row) return null;
  const evidence = getEvidenceByFinding(id);
  return rowToFinding(row, evidence);
}

export function getFindingsByReleaseCandidate(releaseCandidateId: string): Finding[] {
  const rows = dbAll(
    `SELECT * FROM findings WHERE release_candidate_id = ?
     ORDER BY
       CASE severity
         WHEN 'CRITICAL' THEN 1
         WHEN 'HIGH'     THEN 2
         WHEN 'MEDIUM'   THEN 3
         WHEN 'LOW'      THEN 4
         WHEN 'INFO'     THEN 5
         ELSE 6
       END, created_at`,
    [releaseCandidateId],
  );
  return rows.map((row) => rowToFinding(row, getEvidenceByFinding(row.id as string)));
}

export function updateFindingStatus(id: string, status: Status): void {
  dbRun(`UPDATE findings SET status = ? WHERE id = ?`, [status, id]);
}

// ─── Dossier ─────────────────────────────────────────────────

import type { Dossier } from '../types/domain.js';

type DossierRow = DbRow;

function rowToDossier(row: DossierRow): Dossier {
  return {
    id: row.id as string,
    releaseCandidateId: row.release_candidate_id as string,
    generatedAt: row.generated_at as string,
    markdownContent: row.markdown_content as string,
    verificationStatus: row.verification_status as Status,
  };
}

export function upsertDossier(data: {
  releaseCandidateId: string;
  markdownContent: string;
  verificationStatus: Status;
}): Dossier {
  // Delete any existing dossier for this RC before inserting fresh
  dbRun(`DELETE FROM dossiers WHERE release_candidate_id = ?`, [data.releaseCandidateId]);

  const id = uuidv4();
  const now = new Date().toISOString();
  dbRun(
    `INSERT INTO dossiers (id, release_candidate_id, generated_at, markdown_content, verification_status)
     VALUES (?, ?, ?, ?, ?)`,
    [id, data.releaseCandidateId, now, data.markdownContent, data.verificationStatus],
  );
  return {
    id,
    releaseCandidateId: data.releaseCandidateId,
    generatedAt: now,
    markdownContent: data.markdownContent,
    verificationStatus: data.verificationStatus,
  };
}

export function getDossierByReleaseCandidate(releaseCandidateId: string): Dossier | null {
  const row = dbGet(
    `SELECT * FROM dossiers WHERE release_candidate_id = ? ORDER BY generated_at DESC LIMIT 1`,
    [releaseCandidateId],
  );
  return row ? rowToDossier(row) : null;
}
