import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  getLeaderboard,
  getRepoDetail,
  getStats,
  type LeaderboardResponse,
  type RangeKey,
  type RepoDetailResponse,
  type SortMode,
} from '../server/velocity.ts'

const ranges: RangeKey[] = ['24h', '7d', '30d']
const sorts: SortMode[] = ['momentum', 'breakout']

const leaderboards = {} as Record<RangeKey, Record<SortMode, LeaderboardResponse>>
const repos = {} as Record<string, Partial<Record<RangeKey, RepoDetailResponse>>>

for (const range of ranges) {
  leaderboards[range] = {} as Record<SortMode, LeaderboardResponse>
  for (const sort of sorts) {
    const response = getLeaderboard({ range, sort, language: 'All', q: '' })
    leaderboards[range][sort] = response

    for (const item of response.repos) {
      if (!repos[item.fullName]) repos[item.fullName] = {}
      const detail = getRepoDetail(item.fullName, range)
      if (detail) repos[item.fullName][range] = detail
    }
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  stats: getStats(),
  leaderboards,
  repos,
}

const out = resolve(process.cwd(), 'public/demo-data.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(payload))

const size = JSON.stringify(payload).length
console.log(`wrote ${out} (${(size / 1024 / 1024).toFixed(2)} MiB)`)
console.log(`${Object.keys(repos).length} repos, ${ranges.length * sorts.length} base leaderboards`)
