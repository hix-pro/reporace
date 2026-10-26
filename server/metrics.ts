export type DataMode = 'live' | 'demo'

export interface StarSnapshot {
  captured_at: string
  stars: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export function dayString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function utcToday(now: Date = new Date()): string {
  return dayString(now)
}

export function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return dayString(date)
}

/** First UTC day included in an inclusive, N-day range ending on `referenceDay`. */
export function rangeStartDay(referenceDay: string, days: number): string {
  return addDays(referenceDay, -(days - 1))
}

export function sumRange(days: Map<string, number>, sinceDay: string): number {
  let total = 0
  for (const [day, gained] of days) {
    if (day >= sinceDay) total += gained
  }
  return total
}

/** Missing or unrecognized metadata must never be presented as live data. */
export function normalizeDataMode(value: string | null): DataMode {
  return value === 'live' ? 'live' : 'demo'
}

/**
 * Net stars gained during the 24 hours ending at the latest snapshot.
 *
 * The baseline is the newest snapshot at or before `latest - 24h`. Looking only
 * at snapshots inside the window undercounts because the first in-window
 * snapshot can be hours after the window starts.
 */
export function snapshotGain24h(rows: readonly StarSnapshot[], fallback: number): number {
  const points = rows
    .map((row) => ({ stars: row.stars, time: Date.parse(row.captured_at) }))
    .filter((row) => Number.isFinite(row.time))
    .sort((a, b) => a.time - b.time)

  if (!points.length) return fallback

  const latest = points[points.length - 1]
  const cutoff = latest.time - DAY_MS
  let baseline: { stars: number; time: number } | undefined

  for (const point of points) {
    if (point.time > cutoff) break
    baseline = point
  }

  if (baseline) return latest.stars - baseline.stars
  if (points.length >= 2) return latest.stars - points[0].stars
  return fallback
}
