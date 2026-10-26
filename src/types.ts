export type RangeKey = '24h' | '7d' | '30d'
export type DataMode = 'live' | 'demo'
export type MetricMode = 'absolute' | 'relative'

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

export type SortMode = 'momentum' | 'breakout'

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
