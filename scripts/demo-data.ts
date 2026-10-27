import '../server/env.ts'
import {
  clearDailyGains,
  getTrackedRepos,
  setDailyGain,
  setMeta,
  transaction,
  utcDay,
} from '../server/db.ts'

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

const repos = getTrackedRepos()
if (!repos.length) {
  console.error('No repositories tracked. Run `npm run seed` first.')
  process.exit(1)
}

const today = utcDay()
const trackingSince = addDays(today, -29)

transaction(() => {
  // Rows and labels commit together: a crash mid-run must never leave real
  // history deleted, or demo rows on disk while data_mode still says live.
  clearDailyGains()

  for (const repo of repos) {
    const random = mulberry32(hashString(repo.full_name))
    const base = Math.max(2, Math.round(repo.stars * 0.0007))
    const trend = 0.6 + random() * 1.1
    const isBreakout = random() < 0.16
    const spikeStart = Math.floor(30 - 3 - random() * 9)
    const spikeMultiplier = isBreakout ? 4 + random() * 9 : 1.6 + random() * 2.4

    const gains: number[] = []
    for (let index = 0; index < 30; index += 1) {
      const date = new Date(`${addDays(today, -(29 - index))}T00:00:00.000Z`)
      const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
      const noise = 0.35 + random() * 1.3
      const spike = index >= spikeStart ? spikeMultiplier : 1
      const gain = Math.max(0, Math.round(base * trend * noise * (weekend ? 0.72 : 1) * spike))
      gains.push(gain)
    }

    const cap = Math.max(1, Math.round(repo.stars * 0.12))
    const total = gains.reduce((sum, gain) => sum + gain, 0)
    if (total > cap) {
      const scale = cap / total
      for (let index = 0; index < gains.length; index += 1) {
        gains[index] = Math.round(gains[index] * scale)
      }
    }

    for (let index = 0; index < gains.length; index += 1) {
      const day = addDays(today, -(29 - index))
      setDailyGain(repo.id, day, gains[index])
    }
  }

  setMeta('data_mode', 'demo')
  setMeta('demo_seeded_at', new Date().toISOString())
  setMeta('tracking_since', trackingSince)
})

const top = [...repos].sort((a, b) => b.stars - a.stars).slice(0, 5)

console.log(`Generated 30 days of demo history for ${repos.length} repositories.`)
console.log('Data mode: demo. Run `npm run collect` to replace it with live snapshots.')
console.log(`Tracking since: ${trackingSince}`)
for (const repo of top) {
  console.log(`  ${repo.full_name} — ${repo.stars.toLocaleString()} stars`)
}
