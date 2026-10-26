import assert from 'node:assert/strict'
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

const { db, setDailyGain, setMeta, upsertRepo } = await import('./db.ts')
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
