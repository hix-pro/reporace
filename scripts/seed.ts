import '../server/env.ts'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fetchRepos } from '../server/github.ts'
import {
  countRepos,
  recordSnapshot,
  setMeta,
  transaction,
  upsertRepo,
  utcStamp,
} from '../server/db.ts'

const seedPath = path.resolve(process.cwd(), 'data/seed-repos.json')
const fullNames = JSON.parse(readFileSync(seedPath, 'utf8')) as string[]

console.log(`Seeding ${fullNames.length} repositories from ${seedPath}`)

const { repos, skipped } = await fetchRepos(fullNames, 5)
const capturedAt = utcStamp()

transaction(() => {
  for (const repo of repos) {
    upsertRepo(repo)
    recordSnapshot(repo.id, repo.stars, repo.forks, capturedAt)
  }
})

if (!countRepos()) {
  console.error('No repositories were seeded.')
  process.exit(1)
}

setMeta('data_mode', 'live')
setMeta('seeded_at', capturedAt)

console.log(`Seeded ${repos.length} repositories (${countRepos()} total tracked).`)
if (skipped.length) {
  console.log(`Skipped ${skipped.length}:`)
  for (const item of skipped) {
    console.log(`  - ${item.fullName}: ${item.reason}`)
  }
}
console.log('Next: run `npm run demo` to generate 30 days of demo history.')
