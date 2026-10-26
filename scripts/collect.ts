import '../server/env.ts'
import { fetchRepos } from '../server/github.ts'
import {
  clearDailyGains,
  getMeta,
  getTrackedRepos,
  recordSnapshot,
  setMeta,
  transaction,
  upsertRepo,
  utcStamp,
} from '../server/db.ts'

const tracked = getTrackedRepos()
if (!tracked.length) {
  console.error('No repositories tracked. Run `npm run seed` first.')
  process.exit(1)
}

const fullNames = tracked.map((repo) => repo.full_name)
console.log(`Collecting snapshots for ${fullNames.length} repositories...`)

const { repos, skipped } = await fetchRepos(fullNames, 5)

if (!repos.length) {
  console.error('No snapshots collected. Existing data was left untouched.')
  process.exit(1)
}

const capturedAt = utcStamp()
const replacingDemo = getMeta('data_mode') === 'demo'

transaction(() => {
  // Clear generated history only after at least one real snapshot succeeded.
  if (replacingDemo) clearDailyGains()

  for (const repo of repos) {
    upsertRepo(repo)
    recordSnapshot(repo.id, repo.stars, repo.forks, capturedAt)
  }

  setMeta('data_mode', 'live')
  setMeta('last_collection', capturedAt)
})

if (replacingDemo) {
  console.log('Demo history cleared. Live collection started.')
}
console.log(`Captured ${repos.length} repositories at ${capturedAt}.`)
if (skipped.length) {
  console.log(`Skipped ${skipped.length}:`)
  for (const item of skipped) {
    console.log(`  - ${item.fullName}: ${item.reason}`)
  }
}
