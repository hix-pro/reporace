import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  clamp,
  formatDelta,
  formatFullNumber,
  formatNumber,
  formatPerDay,
  formatPercent,
  growthPercent,
  languageColor,
  rangeLabel,
  shortDay,
  timeAgo,
} from './format.ts'

test('compact numbers collapse to one decimal, full numbers keep grouping', () => {
  assert.equal(formatNumber(999), '999')
  assert.equal(formatNumber(1000), '1K')
  assert.equal(formatNumber(1234), '1.2K')
  assert.equal(formatNumber(1_500_000), '1.5M')
  assert.equal(formatFullNumber(12345), '12,345')
})

test('deltas carry an explicit sign for gains only', () => {
  assert.equal(formatDelta(42), '+42')
  assert.equal(formatDelta(1234), '+1,234')
  assert.equal(formatDelta(0), '0')
  assert.equal(formatDelta(-7), '-7')
})

test('per-day rates pick precision by magnitude', () => {
  assert.equal(formatPerDay(100), '100/day')
  assert.equal(formatPerDay(123.6), '124/day')
  assert.equal(formatPerDay(15.26), '15.3/day')
  assert.equal(formatPerDay(4.567), '4.57/day')
})

test('percentages are signed, two-decimal, and never NaN', () => {
  assert.equal(formatPercent(12.3456), '+12.35%')
  assert.equal(formatPercent(0), '0.00%')
  assert.equal(formatPercent(-3.1), '-3.10%')
  assert.equal(formatPercent(Number.NaN), '0%')
  assert.equal(formatPercent(Number.POSITIVE_INFINITY), '0%')
})

test('growth percent divides by the current total, not zero', () => {
  assert.equal(growthPercent(50, 1000), 5)
  assert.equal(growthPercent(10, 0), 0)
  assert.equal(growthPercent(-5, 200), -2.5)
})

test('timeAgo degrades honestly for missing and malformed input', () => {
  assert.equal(timeAgo(null), 'not yet')
  assert.equal(timeAgo('not-a-date'), 'unknown')
})

test('timeAgo buckets elapsed time into seconds, minutes, hours, then days', () => {
  const secondsAgo = (seconds: number): string =>
    new Date(Date.now() - seconds * 1000).toISOString()

  assert.equal(timeAgo(secondsAgo(45)), '45s ago')
  assert.equal(timeAgo(secondsAgo(5 * 60)), '5m ago')
  assert.equal(timeAgo(secondsAgo(3 * 60 * 60)), '3h ago')
  assert.equal(timeAgo(secondsAgo(36 * 60 * 60)), '1d ago')
})

test('shortDay renders UTC calendar days, not local time', () => {
  assert.equal(shortDay('2026-10-26'), 'Oct 26')
  assert.equal(shortDay('2026-01-09'), 'Jan 9')
})

test('language colors fall back for null and unknown languages', () => {
  assert.equal(languageColor(null), '#5d6b7d')
  assert.equal(languageColor('TypeScript'), '#3178c6')
  assert.equal(languageColor('Rust'), '#dea584')
  assert.equal(languageColor('NotALanguage'), '#8b98a9')
})

test('range labels match the range values', () => {
  assert.equal(rangeLabel('24h'), 'last 24 hours')
  assert.equal(rangeLabel('7d'), 'last 7 days')
  assert.equal(rangeLabel('30d'), 'last 30 days')
})

test('clamp pins values to the inclusive bounds', () => {
  assert.equal(clamp(5, 0, 10), 5)
  assert.equal(clamp(-1, 0, 10), 0)
  assert.equal(clamp(11, 0, 10), 10)
})
