import {
  getDailyRows,
  getLatestSnapshot,
  getMeta,
  getRepoByFullName,
  getSnapshotsSince,
  getTrackedRepos,
  type DailyRow,
  type RepoRow,
  type SnapshotRow,
} from './db.ts'

export type RangeKey = '24h' | '7d' | '30d'
export type DataMode = 'live' | 'demo'
export type SortMode = 'momentum' | 'breakout'

const RANGE_DAYS: Record<RangeKey, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
}

export interface LeaderboardItem {
  id: number
  owner: string
  name: string
  fullName: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  gained: number
  growth: number
  perDay: number
  rank: number
  sparkline: number[]
  avatarUrl: string | null
  htmlUrl: string
}

export interface LeaderboardResponse {
  range: RangeKey
  sort: SortMode
  updatedAt: string | null
  dataMode: DataMode
  totalTracked: number
  languages: string[]
  repos: LeaderboardItem[]
}

export interface RepoHistoryPoint {
  day: string
  gained: number
  stars: number
}

export interface RepoDetailResponse {
  repo: LeaderboardItem & {
    openIssues: number
    createdAt: string | null
    pushedAt: string | null
    topics: string[]
  }
  history: RepoHistoryPoint[]
  stats: {
    gained24h: number
    gained7d: number
    gained30d: number
    perDay: number
    rank: number
    totalTracked: number
  }
  dataMode: DataMode
  updatedAt: string | null
}

export interface StatsResponse {
  totalTracked: number
  totalStars: number
  totalGained7d: number
  languages: number
  updatedAt: string | null
  trackingSince: string | null
  dataMode: DataMode
}

function dayString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function today(): string {
  return dayString(new Date())
}

function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return dayString(date)
}

function getDataMode(): DataMode {
  return getMeta('data_mode') === 'demo' ? 'demo' : 'live'
}

function getUpdatedAt(): string | null {
  return getLatestSnapshot()?.captured_at ?? null
}

function groupDaily(rows: DailyRow[]): Map<number, Map<string, number>> {
  const grouped = new Map<number, Map<string, number>>()
  for (const row of rows) {
    let repoDays = grouped.get(row.repo_id)
    if (!repoDays) {
      repoDays = new Map()
      grouped.set(row.repo_id, repoDays)
    }
    repoDays.set(row.day, row.gained)
  }
  return grouped
}

function groupSnapshots(rows: SnapshotRow[]): Map<number, SnapshotRow[]> {
  const grouped = new Map<number, SnapshotRow[]>()
  for (const row of rows) {
    const list = grouped.get(row.repo_id)
    if (list) {
      list.push(row)
    } else {
      grouped.set(row.repo_id, [row])
    }
  }
  return grouped
}

function sumRange(days: Map<string, number>, sinceDay: string): number {
  let total = 0
  for (const [day, gained] of days) {
    if (day >= sinceDay) total += gained
  }
  return total
}

function gainedFor(
  repoId: number,
  range: RangeKey,
  days: Map<string, number>,
  snapshots: Map<number, SnapshotRow[]>,
): number {
  if (range === '24h') {
    const rows = snapshots.get(repoId) ?? []
    if (rows.length >= 2) {
      return rows[rows.length - 1].stars - rows[0].stars
    }
    return days.get(today()) ?? 0
  }

  return sumRange(days, addDays(today(), -(RANGE_DAYS[range] - 1)))
}

function buildSparkline(days: Map<string, number>, length: number): number[] {
  const points: number[] = []
  for (let offset = length - 1; offset >= 0; offset -= 1) {
    points.push(days.get(addDays(today(), -offset)) ?? 0)
  }
  return points
}

function parseTopics(row: RepoRow): string[] {
  try {
    const parsed = JSON.parse(row.topics) as unknown
    return Array.isArray(parsed) ? parsed.filter((topic): topic is string => typeof topic === 'string') : []
  } catch {
    return []
  }
}

export function getLeaderboard(options: {
  range?: RangeKey
  language?: string
  q?: string
  sort?: SortMode
}): LeaderboardResponse {
  const range = options.range ?? '7d'
  const sort = options.sort === 'breakout' ? 'breakout' : 'momentum'
  const language = options.language && options.language !== 'All' ? options.language : null
  const q = (options.q ?? '').trim().toLowerCase()

  const repos = getTrackedRepos()
  const dailyRows = getDailyRows(addDays(today(), -30))
  const daily = groupDaily(dailyRows)
  const snapshots = groupSnapshots(
    getSnapshotsSince(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  )

  const languages = [...new Set(repos.map((repo) => repo.language).filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b))

  const items = repos
    .filter((repo) => {
      if (language && repo.language !== language) return false
      if (!q) return true
      return (
        repo.full_name.toLowerCase().includes(q) ||
        (repo.description ?? '').toLowerCase().includes(q)
      )
    })
    .map((repo) => {
      const repoDays = daily.get(repo.id) ?? new Map<string, number>()
      const gained = gainedFor(repo.id, range, repoDays, snapshots)
      const growth = repo.stars > 0 ? (gained / repo.stars) * 100 : 0
      return {
        id: repo.id,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        language: repo.language,
        stars: repo.stars,
        forks: repo.forks,
        gained,
        growth,
        perDay: gained / RANGE_DAYS[range],
        rank: 0,
        sparkline: buildSparkline(repoDays, range === '30d' ? 30 : 14),
        avatarUrl: repo.avatar_url,
        htmlUrl: repo.html_url,
      } satisfies LeaderboardItem
    })
    .sort((a, b) => {
      if (sort === 'breakout') {
        if (b.growth !== a.growth) return b.growth - a.growth
        if (b.gained !== a.gained) return b.gained - a.gained
        return b.stars - a.stars
      }
      if (b.gained !== a.gained) return b.gained - a.gained
      if (b.perDay !== a.perDay) return b.perDay - a.perDay
      return b.stars - a.stars
    })
    .map((item, index) => ({ ...item, rank: index + 1 }))

  return {
    range,
    sort,
    updatedAt: getUpdatedAt(),
    dataMode: getDataMode(),
    totalTracked: repos.length,
    languages,
    repos: items,
  }
}

export function getRepoDetail(
  fullName: string,
  range: RangeKey = '7d',
): RepoDetailResponse | null {
  const repo = getRepoByFullName(fullName)
  if (!repo) return null

  const dailyRows = getDailyRows(addDays(today(), -30))
  const daily = groupDaily(dailyRows)
  const repoDays = daily.get(repo.id) ?? new Map<string, number>()

  const allDays = Array.from({ length: 30 }, (_, index) =>
    addDays(today(), -(29 - index)),
  )

  let trackingSince: string | null = repoDays.size
    ? [...repoDays.keys()].sort()[0]
    : null

  const snapshots = getSnapshotsSince(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  for (const snapshot of snapshots) {
    if (snapshot.repo_id !== repo.id) continue
    const snapshotDay = snapshot.captured_at.slice(0, 10)
    if (!trackingSince || snapshotDay < trackingSince) trackingSince = snapshotDay
  }

  const history: RepoHistoryPoint[] = []
  if (trackingSince) {
    for (const day of allDays) {
      if (day < trackingSince) continue
      const gainedAfter = [...repoDays.entries()]
        .filter(([entryDay]) => entryDay > day)
        .reduce((total, [, value]) => total + value, 0)
      history.push({
        day,
        gained: repoDays.get(day) ?? 0,
        stars: repo.stars - gainedAfter,
      })
    }
  }

  const gained24h = gainedFor(
    repo.id,
    '24h',
    repoDays,
    groupSnapshots(
      getSnapshotsSince(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ),
  )
  const gained7d = sumRange(repoDays, addDays(today(), -6))
  const gained30d = sumRange(repoDays, addDays(today(), -29))

  const ranking = getLeaderboard({ range, language: 'All', q: '' })
  const rank = ranking.repos.find((item) => item.id === repo.id)?.rank ?? 0
  const gainedInRange =
    range === '24h' ? gained24h : range === '7d' ? gained7d : gained30d

  return {
    repo: {
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stars,
      forks: repo.forks,
      gained: gainedInRange,
      growth: repo.stars > 0 ? (gainedInRange / repo.stars) * 100 : 0,
      perDay: gainedInRange / RANGE_DAYS[range],
      rank,
      sparkline: buildSparkline(repoDays, range === '30d' ? 30 : 14),
      avatarUrl: repo.avatar_url,
      htmlUrl: repo.html_url,
      openIssues: repo.open_issues,
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at,
      topics: parseTopics(repo),
    },
    history,
    stats: {
      gained24h,
      gained7d,
      gained30d,
      perDay: gained7d / 7,
      rank,
      totalTracked: ranking.totalTracked,
    },
    dataMode: getDataMode(),
    updatedAt: getUpdatedAt(),
  }
}

export function getStats(): StatsResponse {
  const repos = getTrackedRepos()
  const dailyRows = getDailyRows(addDays(today(), -7))
  const totalGained7d = dailyRows.reduce((total, row) => total + row.gained, 0)
  const allDaily = getDailyRows(addDays(today(), -30))
  const allDays = [...new Set(allDaily.map((row) => row.day))].sort()
  const snapshots = getSnapshotsSince(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  )
  const snapshotDays = snapshots.map((snapshot) => snapshot.captured_at.slice(0, 10)).sort()
  const trackingSince = [allDays[0], snapshotDays[0]].filter(Boolean).sort()[0] ?? null

  return {
    totalTracked: repos.length,
    totalStars: repos.reduce((total, repo) => total + repo.stars, 0),
    totalGained7d,
    languages: new Set(repos.map((repo) => repo.language).filter(Boolean)).size,
    updatedAt: getUpdatedAt(),
    trackingSince,
    dataMode: getDataMode(),
  }
}
