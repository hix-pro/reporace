import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addDays, dayString, rangeStartDay, snapshotGain24h, sumRange, utcToday } from './metrics.ts'
import type { StarSnapshot } from './metrics.ts'

test('dayString always slices the UTC date, never local time', () => {
  assert.equal(dayString(new Date('2026-10-26T23:59:59.000Z')), '2026-10-26')
  assert.equal(dayString(new Date('2026-10-27T00:00:00.000Z')), '2026-10-27')
})

test('utcToday is the UTC day string for right now', () => {
  assert.match(utcToday(), /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(utcToday(), dayString(new Date()))
})

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
})

test('rangeStartDay is inclusive of the reference day', () => {
  assert.equal(rangeStartDay('2026-10-26', 1), '2026-10-26')
  assert.equal(rangeStartDay('2026-10-26', 2), '2026-10-25')
  assert.equal(rangeStartDay('2026-10-26', 30), '2026-09-27')
})

test('sumRange totals only the days on and after the cutoff', () => {
  const days = new Map<string, number>([
    ['2026-10-25', 10],
    ['2026-10-26', 5],
    ['2026-10-27', 3],
  ])

  assert.equal(sumRange(days, '2026-10-26'), 8)
  assert.equal(sumRange(days, '2026-10-27'), 3)
  assert.equal(sumRange(days, '2026-10-28'), 0)
})

test('sumRange over an empty window is zero, not NaN', () => {
  assert.equal(sumRange(new Map(), '2026-01-01'), 0)
})

test('snapshotGain24h ignores rows with unparseable timestamps', () => {
  const rows: StarSnapshot[] = [
    { captured_at: 'garbage', stars: 500 },
    { captured_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), stars: 110 },
  ]

  // One valid point, no parseable baseline: the caller's fallback wins.
  assert.equal(snapshotGain24h(rows, 7), 7)
})

test('snapshotGain24h falls back to the oldest valid point without a baseline', () => {
  const hoursAgo = (hours: number): string =>
    new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  // Both points sit inside the 24h window, so there is no baseline; the gain
  // degrades to latest - oldest instead of the fallback.
  const rows: StarSnapshot[] = [
    { captured_at: hoursAgo(1), stars: 100 },
    { captured_at: hoursAgo(0), stars: 110 },
  ]

  assert.equal(snapshotGain24h(rows, 7), 10)
})
