import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';

// In-memory sql.js database for tests — no file I/O, no native compilation
let db: SqlJsDatabase;

function applySchema(database: SqlJsDatabase): void {
  database.run(`PRAGMA foreign_keys = ON`);
  database.run(`CREATE TABLE IF NOT EXISTS repositories (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT '', commit_hash TEXT NOT NULL DEFAULT '',
    detected_stack TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
  )`);
  database.run(`CREATE TABLE IF NOT EXISTS release_candidates (
    id TEXT PRIMARY KEY, repository_id TEXT NOT NULL REFERENCES repositories(id),
    base_ref TEXT NOT NULL, target_ref TEXT NOT NULL, label TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL
  )`);
  database.run(`CREATE TABLE IF NOT EXISTS changes (
    id TEXT PRIMARY KEY, release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id),
    path TEXT NOT NULL, change_type TEXT NOT NULL,
    lines_added INTEGER NOT NULL DEFAULT 0, lines_removed INTEGER NOT NULL DEFAULT 0
  )`);
  database.run(`CREATE TABLE IF NOT EXISTS impact_items (
    id TEXT PRIMARY KEY, release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id),
    change_id TEXT NOT NULL REFERENCES changes(id), path TEXT NOT NULL,
    type TEXT NOT NULL, reason TEXT NOT NULL, confidence TEXT NOT NULL,
    evidence_refs TEXT NOT NULL DEFAULT '[]'
  )`);
  database.run(`CREATE TABLE IF NOT EXISTS verification_plans (
    id TEXT PRIMARY KEY, release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id),
    created_at TEXT NOT NULL
  )`);
  database.run(`CREATE TABLE IF NOT EXISTS verification_items (
    id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES verification_plans(id),
    name TEXT NOT NULL, reason TEXT NOT NULL, command TEXT NOT NULL,
    expected_outcome TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING'
  )`);
  database.run(`CREATE TABLE IF NOT EXISTS check_runs (
    id TEXT PRIMARY KEY, verification_item_id TEXT NOT NULL REFERENCES verification_items(id),
    status TEXT NOT NULL DEFAULT 'PENDING', exit_code INTEGER,
    stdout TEXT NOT NULL DEFAULT '', stderr TEXT NOT NULL DEFAULT '',
    started_at TEXT NOT NULL, completed_at TEXT
  )`);
  database.run(`CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY, release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id),
    category TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'FAILED',
    title TEXT NOT NULL, summary TEXT NOT NULL, source_check_id TEXT NOT NULL,
    affected_areas TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
  )`);
  database.run(`CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY, finding_id TEXT NOT NULL REFERENCES findings(id),
    type TEXT NOT NULL, source TEXT NOT NULL, excerpt TEXT NOT NULL, created_at TEXT NOT NULL
  )`);
  database.run(`CREATE TABLE IF NOT EXISTS dossiers (
    id TEXT PRIMARY KEY, release_candidate_id TEXT NOT NULL REFERENCES release_candidates(id),
    generated_at TEXT NOT NULL, markdown_content TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'NOT_VERIFIED'
  )`);
}

function getRows<T>(database: SqlJsDatabase, sql: string): T[] {
  const stmt = database.prepare(sql);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

function getRow<T>(database: SqlJsDatabase, sql: string, params: (string | number | null)[] = []): T | null {
  const stmt = database.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject() as T;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

beforeAll(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  applySchema(db);
});

afterAll(() => {
  db.close();
});

describe('Database schema', () => {
  it('creates all required tables', () => {
    const tables = getRows<{ name: string }>(
      db,
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
    );
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('repositories');
    expect(tableNames).toContain('release_candidates');
    expect(tableNames).toContain('changes');
    expect(tableNames).toContain('impact_items');
    expect(tableNames).toContain('verification_plans');
    expect(tableNames).toContain('verification_items');
    expect(tableNames).toContain('check_runs');
    expect(tableNames).toContain('findings');
    expect(tableNames).toContain('evidence');
    expect(tableNames).toContain('dossiers');
  });

  it('inserts and retrieves a repository', () => {
    db.run(
      `INSERT INTO repositories (id, name, path, branch, commit_hash, detected_stack, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['repo-test-1', 'demo', '/demo', 'main', 'abc123', 'Node.js', '2024-01-01T00:00:00Z'],
    );
    const repo = getRow<{ id: string; name: string }>(
      db,
      `SELECT id, name FROM repositories WHERE id = ?`,
      ['repo-test-1'],
    );
    expect(repo).not.toBeNull();
    expect(repo!.id).toBe('repo-test-1');
    expect(repo!.name).toBe('demo');
  });

  it('inserts a release candidate linked to a repository', () => {
    db.run(
      `INSERT INTO release_candidates (id, repository_id, base_ref, target_ref, label, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['rc-test-1', 'repo-test-1', 'main', 'HEAD', 'v1.0.0', '2024-01-01T00:00:00Z'],
    );
    const rc = getRow<{ id: string; label: string }>(
      db,
      `SELECT id, label FROM release_candidates WHERE id = ?`,
      ['rc-test-1'],
    );
    expect(rc).not.toBeNull();
    expect(rc!.label).toBe('v1.0.0');
  });

  it('correctly resets all tables', () => {
    // Verify something exists
    const before = getRow<{ count: number }>(
      db,
      `SELECT COUNT(*) as count FROM repositories`,
    );
    expect(before!.count).toBeGreaterThan(0);

    // Reset in dependency order
    db.run(`DELETE FROM evidence`);
    db.run(`DELETE FROM findings`);
    db.run(`DELETE FROM check_runs`);
    db.run(`DELETE FROM verification_items`);
    db.run(`DELETE FROM verification_plans`);
    db.run(`DELETE FROM impact_items`);
    db.run(`DELETE FROM changes`);
    db.run(`DELETE FROM release_candidates`);
    db.run(`DELETE FROM dossiers`);
    db.run(`DELETE FROM repositories`);

    const after = getRow<{ count: number }>(db, `SELECT COUNT(*) as count FROM repositories`);
    expect(after!.count).toBe(0);
  });

  it('verifies all status values are stored as text', () => {
    db.run(
      `INSERT INTO repositories (id, name, path, created_at)
       VALUES (?, ?, ?, ?)`,
      ['repo-status-test', 'test', '/test', '2024-01-01T00:00:00Z'],
    );
    db.run(
      `INSERT INTO release_candidates (id, repository_id, base_ref, target_ref, label, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['rc-status-1', 'repo-status-test', 'main', 'HEAD', 'v1', 'PENDING', '2024-01-01T00:00:00Z'],
    );
    const rc = getRow<{ status: string }>(
      db,
      `SELECT status FROM release_candidates WHERE id = ?`,
      ['rc-status-1'],
    );
    expect(rc!.status).toBe('PENDING');
  });
});
