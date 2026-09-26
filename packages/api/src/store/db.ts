import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'releaselens.db');

let db: SqlJsDatabase | null = null;

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

/** Test-only: inject a pre-built in-memory database instance */
export function _setDbForTesting(database: SqlJsDatabase): void {
  db = database;
}

export async function initDb(): Promise<SqlJsDatabase> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  // Load existing DB from disk if present
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  runMigrations(db);
  persistDb(db);
  console.log('[DB] SQLite (sql.js) initialized at', DB_PATH);
  return db;
}

/** Persist the in-memory sql.js database to disk */
export function persistDb(database?: SqlJsDatabase): void {
  const target = database ?? db;
  if (!target) return;
  const data = target.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function resetDb(): void {
  const database = getDb();
  database.run(`DELETE FROM evidence`);
  database.run(`DELETE FROM findings`);
  database.run(`DELETE FROM check_runs`);
  database.run(`DELETE FROM verification_items`);
  database.run(`DELETE FROM verification_plans`);
  database.run(`DELETE FROM impact_items`);
  database.run(`DELETE FROM changes`);
  database.run(`DELETE FROM release_candidates`);
  database.run(`DELETE FROM dossiers`);
  database.run(`DELETE FROM repositories`);
  persistDb(database);
  console.log('[DB] Demo state reset.');
}

function runMigrations(database: SqlJsDatabase): void {
  database.run(`PRAGMA foreign_keys = ON`);
  database.run(`
    CREATE TABLE IF NOT EXISTS repositories (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      path         TEXT NOT NULL,
      branch       TEXT NOT NULL DEFAULT '',
      commit_hash  TEXT NOT NULL DEFAULT '',
      detected_stack TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS release_candidates (
      id            TEXT PRIMARY KEY,
      repository_id TEXT NOT NULL REFERENCES repositories(id),
      base_ref      TEXT NOT NULL,
      target_ref    TEXT NOT NULL,
      label         TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'PENDING',
      created_at    TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS changes (
      id                    TEXT PRIMARY KEY,
      release_candidate_id  TEXT NOT NULL REFERENCES release_candidates(id),
      path                  TEXT NOT NULL,
      change_type           TEXT NOT NULL,
      lines_added           INTEGER NOT NULL DEFAULT 0,
      lines_removed         INTEGER NOT NULL DEFAULT 0
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS impact_items (
      id                    TEXT PRIMARY KEY,
      release_candidate_id  TEXT NOT NULL REFERENCES release_candidates(id),
      change_id             TEXT NOT NULL REFERENCES changes(id),
      path                  TEXT NOT NULL,
      type                  TEXT NOT NULL,
      reason                TEXT NOT NULL,
      confidence            TEXT NOT NULL,
      evidence_refs         TEXT NOT NULL DEFAULT '[]'
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS verification_plans (
      id                    TEXT PRIMARY KEY,
      release_candidate_id  TEXT NOT NULL REFERENCES release_candidates(id),
      created_at            TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS verification_items (
      id               TEXT PRIMARY KEY,
      plan_id          TEXT NOT NULL REFERENCES verification_plans(id),
      name             TEXT NOT NULL,
      reason           TEXT NOT NULL,
      command          TEXT NOT NULL,
      expected_outcome TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'PENDING'
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS check_runs (
      id                   TEXT PRIMARY KEY,
      verification_item_id TEXT NOT NULL REFERENCES verification_items(id),
      status               TEXT NOT NULL DEFAULT 'PENDING',
      exit_code            INTEGER,
      stdout               TEXT NOT NULL DEFAULT '',
      stderr               TEXT NOT NULL DEFAULT '',
      started_at           TEXT NOT NULL,
      completed_at         TEXT
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS findings (
      id                    TEXT PRIMARY KEY,
      release_candidate_id  TEXT NOT NULL REFERENCES release_candidates(id),
      category              TEXT NOT NULL,
      severity              TEXT NOT NULL,
      status                TEXT NOT NULL DEFAULT 'FAILED',
      title                 TEXT NOT NULL,
      summary               TEXT NOT NULL,
      source_check_id       TEXT NOT NULL,
      affected_areas        TEXT NOT NULL DEFAULT '[]',
      created_at            TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS evidence (
      id          TEXT PRIMARY KEY,
      finding_id  TEXT NOT NULL REFERENCES findings(id),
      type        TEXT NOT NULL,
      source      TEXT NOT NULL,
      excerpt     TEXT NOT NULL,
      created_at  TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS dossiers (
      id                    TEXT PRIMARY KEY,
      release_candidate_id  TEXT NOT NULL REFERENCES release_candidates(id),
      generated_at          TEXT NOT NULL,
      markdown_content      TEXT NOT NULL,
      verification_status   TEXT NOT NULL DEFAULT 'NOT_VERIFIED'
    )
  `);
}

// ─── Query Helpers ──────────────────────────────────────────

type Row = Record<string, unknown>;

/** Execute a SELECT query and return all rows as plain objects */
export function dbAll(sql: string, params: (string | number | null)[] = []): Row[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const rows: Row[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Row);
  }
  stmt.free();
  return rows;
}

/** Execute a SELECT query and return the first row or null */
export function dbGet(sql: string, params: (string | number | null)[] = []): Row | null {
  const rows = dbAll(sql, params);
  return rows[0] ?? null;
}

/** Execute a write statement (INSERT/UPDATE/DELETE) */
export function dbRun(sql: string, params: (string | number | null)[] = []): void {
  const database = getDb();
  database.run(sql, params);
  persistDb(database);
}
