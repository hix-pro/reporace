import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const dataDir = path.resolve(process.cwd(), 'data')
mkdirSync(dataDir, { recursive: true })

const dbPath = process.env.REPORACE_DB ?? path.join(dataDir, 'reporace.db')

export const db = new DatabaseSync(dbPath)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS repos (
    id INTEGER PRIMARY KEY,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL UNIQUE,
    description TEXT,
    language TEXT,
    stars INTEGER NOT NULL DEFAULT 0,
    forks INTEGER NOT NULL DEFAULT 0,
    open_issues INTEGER NOT NULL DEFAULT 0,
    created_at TEXT,
    pushed_at TEXT,
    avatar_url TEXT,
    html_url TEXT,
    topics TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    captured_at TEXT NOT NULL,
    stars INTEGER NOT NULL,
    forks INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (repo_id, captured_at)
  );

  CREATE TABLE IF NOT EXISTS star_daily (
    repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    gained INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (repo_id, day)
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_snapshots_repo_time
    ON snapshots(repo_id, captured_at DESC);

  CREATE INDEX IF NOT EXISTS idx_star_daily_day
    ON star_daily(day);
`)

export interface RepoRecord {
  id: number
  owner: string
  name: string
  fullName: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  openIssues: number
  createdAt: string | null
  pushedAt: string | null
  avatarUrl: string | null
  htmlUrl: string
  topics: string[]
  updatedAt: string
}

export interface RepoRow {
  id: number
  owner: string
  name: string
  full_name: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  open_issues: number
  created_at: string | null
  pushed_at: string | null
  avatar_url: string | null
  html_url: string
  topics: string
  updated_at: string
}

export interface DailyRow {
  repo_id: number
  day: string
  gained: number
}

export interface SnapshotRow {
  repo_id: number
  captured_at: string
  stars: number
  forks: number
}

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function utcDay(value: Date | string = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toISOString().slice(0, 10)
}

export function utcStamp(value: Date = new Date()): string {
  return value.toISOString()
}

export function getMeta(key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setMeta(key: string, value: string): void {
  db.prepare(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value)
}

export function upsertRepo(repo: RepoRecord): void {
  db.prepare(
    `INSERT INTO repos (
       id, owner, name, full_name, description, language, stars, forks,
       open_issues, created_at, pushed_at, avatar_url, html_url, topics, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       owner = excluded.owner,
       name = excluded.name,
       full_name = excluded.full_name,
       description = excluded.description,
       language = excluded.language,
       stars = excluded.stars,
       forks = excluded.forks,
       open_issues = excluded.open_issues,
       created_at = excluded.created_at,
       pushed_at = excluded.pushed_at,
       avatar_url = excluded.avatar_url,
       html_url = excluded.html_url,
       topics = excluded.topics,
       updated_at = excluded.updated_at`,
  ).run(
    repo.id,
    repo.owner,
    repo.name,
    repo.fullName,
    repo.description,
    repo.language,
    repo.stars,
    repo.forks,
    repo.openIssues,
    repo.createdAt,
    repo.pushedAt,
    repo.avatarUrl,
    repo.htmlUrl,
    JSON.stringify(repo.topics),
    repo.updatedAt,
  )
}

export function addDailyGain(repoId: number, day: string, delta: number): void {
  if (!delta) return
  db.prepare(
    `INSERT INTO star_daily (repo_id, day, gained) VALUES (?, ?, ?)
     ON CONFLICT(repo_id, day) DO UPDATE SET gained = star_daily.gained + excluded.gained`,
  ).run(repoId, day, delta)
}

export function setDailyGain(repoId: number, day: string, gained: number): void {
  db.prepare(
    `INSERT INTO star_daily (repo_id, day, gained) VALUES (?, ?, ?)
     ON CONFLICT(repo_id, day) DO UPDATE SET gained = excluded.gained`,
  ).run(repoId, day, gained)
}

export function recordSnapshot(
  repoId: number,
  stars: number,
  forks: number,
  capturedAt: string = utcStamp(),
): void {
  const previous = db
    .prepare(
      'SELECT stars FROM snapshots WHERE repo_id = ? ORDER BY captured_at DESC LIMIT 1',
    )
    .get(repoId) as { stars: number } | undefined

  if (previous) {
    addDailyGain(repoId, utcDay(capturedAt), stars - previous.stars)
  }

  db.prepare(
    `INSERT OR REPLACE INTO snapshots (repo_id, captured_at, stars, forks)
     VALUES (?, ?, ?, ?)`,
  ).run(repoId, capturedAt, stars, forks)

  db.prepare(
    'UPDATE repos SET stars = ?, forks = ?, updated_at = ? WHERE id = ?',
  ).run(stars, forks, capturedAt, repoId)
}

export function getTrackedRepos(): RepoRow[] {
  return db
    .prepare('SELECT * FROM repos ORDER BY full_name COLLATE NOCASE')
    .all() as unknown as RepoRow[]
}

export function getRepoByFullName(fullName: string): RepoRow | null {
  const row = db
    .prepare('SELECT * FROM repos WHERE full_name = ? COLLATE NOCASE')
    .get(fullName) as RepoRow | undefined
  return row ?? null
}

export function getDailyRows(sinceDay: string): DailyRow[] {
  return db
    .prepare('SELECT repo_id, day, gained FROM star_daily WHERE day >= ? ORDER BY day ASC')
    .all(sinceDay) as unknown as DailyRow[]
}

export function getSnapshotsSince(sinceIso: string): SnapshotRow[] {
  return db
    .prepare(
      `SELECT repo_id, captured_at, stars, forks
       FROM snapshots WHERE captured_at >= ? ORDER BY captured_at ASC`,
    )
    .all(sinceIso) as unknown as SnapshotRow[]
}

export function getLatestSnapshot(): { captured_at: string } | null {
  const row = db
    .prepare('SELECT captured_at FROM snapshots ORDER BY captured_at DESC LIMIT 1')
    .get() as { captured_at: string } | undefined
  return row ?? null
}

export function clearDailyGains(): void {
  db.exec('DELETE FROM star_daily')
}

export function countRepos(): number {
  const row = db.prepare('SELECT count(*) AS count FROM repos').get() as {
    count: number
  }
  return row.count
}
