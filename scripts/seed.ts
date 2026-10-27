import '../server/env.ts'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fetchRepos } from '../server/github.ts'
import {
  clearDailyGains,
  countRepos,
  getMeta,
  recordSnapshot,
  setMeta,
  transaction,
  upsertRepo,
  utcStamp,
} from '../server/db.ts'

const seedPath = path.resolve(process.cwd(), 'data/seed-repos.json')
const fullNames = JSON.parse(readFileSync(seedPath, 'utf8')) as string[]

console.log(`Seeding ${fullNames.length} repositories from ${seedPath}`)

const { repos, skipped } = await fetchRepos(fullNames, 5).catch((error: unknown): never => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

if (!repos.length) {
  console.error('No repositories were seeded. Existing data was left untouched.')
  process.exit(1)
}

const capturedAt = utcStamp()
const replacingDemo = getMeta('data_mode') === 'demo'

transaction(() => {
  // A demo database must never be relabeled as live with generated history intact.
  if (replacingDemo) clearDailyGains()

  for (const repo of repos) {
    upsertRepo(repo)
    recordSnapshot(repo.id, repo.stars, repo.forks, capturedAt)
  }

  setMeta('data_mode', 'live')
  setMeta('seeded_at', capturedAt)
})

if (!countRepos()) {
  console.error('No repositories were seeded.')
  process.exit(1)
}

console.log(`Seeded ${repos.length} repositories (${countRepos()} total tracked).`)
if (replacingDemo) {
  console.log('Demo history cleared. Live mode starts from this snapshot.')
}
if (skipped.length) {
  console.log(`Skipped ${skipped.length}:`)
  for (const item of skipped) {
    console.log(`  - ${item.fullName}: ${item.reason}`)
  }
}
console.log('Next: run `npm run demo` to generate 30 days of demo history.')
