import assert from 'node:assert/strict'
import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, beforeEach, test } from 'node:test'
import {
  addDays,
  normalizeDataMode,
  rangeStartDay,
  snapshotGain24h,
  utcToday,
} from './metrics.ts'

const testDir = mkdtempSync(path.join(tmpdir(), 'reporace-test-'))
process.env.REPORACE_DB = path.join(testDir, 'test.db')

const { db, getDailyRows, getMeta, setDailyGain, setMeta, upsertRepo } = await import('./db.ts')
const { getLeaderboard, getRepoDetail, getStats } = await import('./velocity.ts')

const REPO_ID = 1

function seedRepo(stars = 160): void {
  upsertRepo({
    id: REPO_ID,
    owner: 'test',
    name: 'repo',
    fullName: 'test/repo',
    description: 'Test repository',
    language: 'TypeScript',
    stars,
    forks: 10,
    openIssues: 2,
    createdAt: '2024-01-01T00:00:00.000Z',
    pushedAt: '2026-01-01T00:00:00.000Z',
    avatarUrl: null,
    htmlUrl: 'https://github.com/test/repo',
    topics: ['test'],
    updatedAt: new Date().toISOString(),
  })
}

function insertSnapshot(stars: number, hoursAgo: number): void {
  const capturedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
  db.prepare(
    `INSERT OR REPLACE INTO snapshots (repo_id, captured_at, stars, forks)
     VALUES (?, ?, ?, ?)`,
  ).run(REPO_ID, capturedAt, stars, 10)
}

function makeRepo(id: number, fullName: string) {
  const [owner, name] = fullName.split('/')
  return {
    id,
    owner,
    name,
    fullName,
    description: null,
    language: null,
    stars: 100,
    forks: 0,
    openIssues: 0,
    createdAt: null,
    pushedAt: null,
    avatarUrl: null,
    htmlUrl: `https://github.com/${fullName}`,
    topics: [] as string[],
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

// Runs a script as its own node process against the shared throwaway database,
// so top-level script behavior (like demo generation) can be exercised as-is.
function runScript(script: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, ['--import', 'tsx', script], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: { ...process.env, REPORACE_DB: path.join(testDir, 'test.db') },
    encoding: 'utf8',
  })
}

beforeEach(() => {
  db.exec('DELETE FROM star_daily; DELETE FROM snapshots; DELETE FROM repos; DELETE FROM meta;')
})

after(() => {
  db.close()
  rmSync(testDir, { recursive: true, force: true })
})

test('range helpers use inclusive UTC windows', () => {
  assert.equal(rangeStartDay('2026-10-26', 7), '2026-10-20')
  assert.equal(rangeStartDay('2026-10-26', 30), '2026-09-27')
  assert.equal(addDays('2026-10-26', -1), '2026-10-25')
  assert.equal(normalizeDataMode('live'), 'live')
  assert.equal(normalizeDataMode('demo'), 'demo')
  assert.equal(normalizeDataMode(null), 'demo')
  assert.equal(normalizeDataMode('unexpected'), 'demo')
})

test('snapshotGain24h uses a baseline before the window', () => {
  const now = Date.now()
  const rows = [
    { captured_at: new Date(now - 30 * 60 * 60 * 1000).toISOString(), stars: 100 },
    { captured_at: new Date(now - 12 * 60 * 60 * 1000).toISOString(), stars: 130 },
    { captured_at: new Date(now).toISOString(), stars: 160 },
  ]

  assert.equal(snapshotGain24h(rows, 999), 60)
  assert.equal(snapshotGain24h(rows.slice(1), 999), 30)
  assert.equal(snapshotGain24h([], 7), 7)
  assert.equal(snapshotGain24h([{ captured_at: rows[2].captured_at, stars: 160 }], 7), 7)
})

test('7d totals include exactly seven UTC days', () => {
  seedRepo(1000)
  setMeta('data_mode', 'live')

  const today = utcToday()
  setDailyGain(REPO_ID, addDays(today, -7), 500)
  for (let offset = 0; offset < 7; offset += 1) {
    setDailyGain(REPO_ID, addDays(today, -offset), 1)
  }

  assert.equal(getStats().totalGained7d, 7)
  assert.equal(getLeaderboard({ range: '7d' }).repos[0]?.gained, 7)
  assert.equal(getRepoDetail('test/repo')?.stats.gained7d, 7)
})

test('30d totals include exactly thirty UTC days', () => {
  seedRepo(1000)
  setMeta('data_mode', 'live')

  const today = utcToday()
  setDailyGain(REPO_ID, addDays(today, -30), 500)
  for (let offset = 0; offset < 30; offset += 1) {
    setDailyGain(REPO_ID, addDays(today, -offset), 1)
  }

  assert.equal(getLeaderboard({ range: '30d' }).repos[0]?.gained, 30)
  assert.equal(getRepoDetail('test/repo')?.stats.gained30d, 30)
})

test('live 24h gain uses a snapshot at least 24 hours old', () => {
  seedRepo(160)
  setMeta('data_mode', 'live')
  insertSnapshot(100, 30)
  insertSnapshot(130, 12)
  insertSnapshot(160, 0)
  setDailyGain(REPO_ID, utcToday(), 999)

  assert.equal(getLeaderboard({ range: '24h' }).repos[0]?.gained, 60)
  assert.equal(getRepoDetail('test/repo')?.stats.gained24h, 60)
})

test('demo 24h gain never mixes in live snapshots', () => {
  seedRepo(160)
  setMeta('data_mode', 'demo')
  insertSnapshot(100, 30)
  insertSnapshot(160, 0)
  setDailyGain(REPO_ID, utcToday(), 7)

  const leaderboard = getLeaderboard({ range: '24h' })
  assert.equal(leaderboard.dataMode, 'demo')
  assert.equal(leaderboard.repos[0]?.gained, 7)
  assert.equal(getRepoDetail('test/repo')?.stats.gained24h, 7)
})

test('a missing data mode is reported as demo, never live', () => {
  seedRepo()
  assert.equal(getLeaderboard({}).dataMode, 'demo')
  assert.equal(getStats().dataMode, 'demo')

  setMeta('data_mode', 'something-else')
  assert.equal(getLeaderboard({}).dataMode, 'demo')
  assert.equal(getStats().dataMode, 'demo')
})

test('demo generation commits rows and demo labels together in one transaction', () => {
  seedRepo(160)

  const run = runScript('scripts/demo-data.ts')
  assert.equal(run.status, 0, run.stderr ?? '')

  // Labels and rows are observable together or not at all — there is no
  // window where demo rows exist while the mode still reads as live.
  assert.equal(getMeta('data_mode'), 'demo')
  assert.ok(getMeta('demo_seeded_at'))
  assert.equal(getMeta('tracking_since'), addDays(utcToday(), -29))

  const rows = db
    .prepare('SELECT count(*) AS count FROM star_daily WHERE repo_id = ?')
    .get(REPO_ID) as { count: number }
  assert.equal(rows.count, 30)
})

test('a demo run that fails mid-transaction rolls back rows and labels', () => {
  seedRepo(160)
  setMeta('data_mode', 'live')
  setMeta('tracking_since', '2026-01-01')
  setDailyGain(REPO_ID, '2026-01-01', 5)

  // Sabotage generation part-way through: the first insert for repo 1 aborts.
  db.exec(`
    CREATE TRIGGER fail_demo BEFORE INSERT ON star_daily
    WHEN NEW.repo_id = 1
    BEGIN
      SELECT RAISE(ABORT, 'injected failure');
    END;
  `)

  try {
    const run = runScript('scripts/demo-data.ts')
    assert.notEqual(run.status, 0)
    assert.match(run.stderr ?? '', /injected failure/)

    // The wipe, the generated rows, and the demo labels all rolled back.
    assert.equal(getMeta('data_mode'), 'live')
    assert.equal(getMeta('tracking_since'), '2026-01-01')
    const rows = getDailyRows('2026-01-01')
    assert.equal(rows.length, 1)
    assert.deepEqual({ ...rows[0] }, { repo_id: 1, day: '2026-01-01', gained: 5 })
  } finally {
    db.exec('DROP TRIGGER fail_demo')
  }
})

test('upsertRepo reports a clear error when a rename collides with another tracked name', () => {
  upsertRepo(makeRepo(1, 'o/n'))
  upsertRepo(makeRepo(2, 'o/old'))

  assert.throws(() => upsertRepo(makeRepo(2, 'o/n')), (error: unknown) => {
    assert.ok(error instanceof Error)
    assert.match(error.message, /o\/n/)
    assert.match(error.message, /o\/old/)
    assert.match(error.message, /seed-repos\.json/)
    return true
  })

  // The failed statement wrote nothing.
  const row = db.prepare('SELECT full_name FROM repos WHERE id = 2').get() as {
    full_name: string
  }
  assert.equal(row.full_name, 'o/old')
})
