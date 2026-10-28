import type {
  LeaderboardResponse,
  RangeKey,
  RepoDetailResponse,
  SortMode,
  StatsResponse,
} from '../types'

interface DemoData {
  generatedAt: string
  stats: StatsResponse
  leaderboards: Record<RangeKey, Record<SortMode, LeaderboardResponse>>
  repos: Record<string, Partial<Record<RangeKey, RepoDetailResponse>>>
}

const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === '1'
const DEMO_URL = `${import.meta.env.BASE_URL}demo-data.json`

let demoData: Promise<DemoData> | null = null
let repoIndex: Map<string, Partial<Record<RangeKey, RepoDetailResponse>>> | null = null

function loadDemo(): Promise<DemoData> {
  if (!demoData) {
    demoData = fetch(DEMO_URL, { headers: { Accept: 'application/json' } }).then(async (response) => {
      if (!response.ok) throw new Error(`Could not load demo data (${response.status})`)
      return (await response.json()) as DemoData
    })
  }
  return demoData
}

function getRepo(
  data: DemoData,
  owner: string,
  name: string,
): Partial<Record<RangeKey, RepoDetailResponse>> | undefined {
  if (!repoIndex) {
    repoIndex = new Map(
      Object.entries(data.repos).map(([fullName, value]) => [fullName.toLowerCase(), value]),
    )
  }
  return repoIndex.get(`${owner}/${name}`.toLowerCase())
}

async function staticJson<T>(url: string): Promise<T> {
  const data = await loadDemo()
  const parsed = new URL(url, window.location.origin)

  if (parsed.pathname === '/api/stats') {
    return data.stats as T
  }

  if (parsed.pathname === '/api/repos') {
    const range = (parsed.searchParams.get('range') ?? '7d') as RangeKey
    const sort = (parsed.searchParams.get('sort') ?? 'momentum') as SortMode
    const language = parsed.searchParams.get('language') ?? 'All'
    const q = (parsed.searchParams.get('q') ?? '').trim().toLowerCase()

    const base =
      data.leaderboards[range]?.[sort] ?? data.leaderboards['7d']['momentum']

    let repos = base.repos
    if (language !== 'All') {
      repos = repos.filter((item) => item.language === language)
    }
    if (q) {
      repos = repos.filter(
        (item) =>
          item.fullName.toLowerCase().includes(q) ||
          (item.description ?? '').toLowerCase().includes(q),
      )
    }

    return {
      ...base,
      repos: repos.map((item, index) => ({ ...item, rank: index + 1 })),
    } as T
  }

  if (parsed.pathname.startsWith('/api/repos/')) {
    const parts = parsed.pathname
      .slice('/api/repos/'.length)
      .split('/')
      .filter(Boolean)
      .map(decodeURIComponent)
    const [owner, name] = parts
    const range = (parsed.searchParams.get('range') ?? '7d') as RangeKey

    if (!owner || !name) throw new Error('Repository not tracked yet')
    const detail = getRepo(data, owner, name)?.[range] ?? getRepo(data, owner, name)?.['7d']
    if (!detail) throw new Error('Repository not tracked yet')
    return detail as T
  }

  throw new Error(`No static demo data for ${parsed.pathname}`)
}

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  if (STATIC_DEMO) return staticJson<T>(url)

  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // keep the default message
    }
    throw new Error(message)
  }
  return (await response.json()) as T
}
