import { useEffect, useState } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Controls } from '../components/Controls'
import { EmptyState } from '../components/EmptyState'
import { Hero } from '../components/Hero'
import { HowItWorks } from '../components/HowItWorks'
import { Podium } from '../components/Podium'
import { PodiumSkeleton, TableSkeleton } from '../components/Skeleton'
import { RepoTable } from '../components/RepoTable'
import { fetchJson } from '../lib/api'
import { rangeLabel } from '../lib/format'
import type {
  LeaderboardResponse,
  RangeKey,
  SortMode,
  StatsResponse,
} from '../types'

const staticDemo = import.meta.env.VITE_STATIC_DEMO === '1'

function LoadFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card mt-4 flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-orange/20 bg-orange/[0.06] text-orange">
        <TriangleAlert className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-white">Could not load the leaderboard</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring mt-5 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white transition hover:border-orange/40 hover:text-orange"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  )
}

export function HomePage() {
  const [range, setRange] = useState<RangeKey>('7d')
  const [sort, setSort] = useState<SortMode>('momentum')
  const [language, setLanguage] = useState('All')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    setIsFetching(true)
    setError(null)

    fetchJson<LeaderboardResponse>(
      `/api/repos?range=${range}&sort=${sort}&language=${encodeURIComponent(language)}&q=${encodeURIComponent(debouncedQuery)}`,
      controller.signal,
    )
      .then((response) => setData(response))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : 'Could not load repositories')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsFetching(false)
      })

    return () => controller.abort()
  }, [range, sort, language, debouncedQuery, reloadKey])

  useEffect(() => {
    let active = true
    fetchJson<StatsResponse>('/api/stats')
      .then((response) => {
        if (active) setStats(response)
      })
      .catch(() => {
        // stats are decorative; the leaderboard still works
      })
    return () => {
      active = false
    }
  }, [])

  const repos = data?.repos ?? []
  const topRepos = repos.slice(0, 3)
  const languages = data?.languages ?? []
  const dataMode = data?.dataMode ?? stats?.dataMode ?? null
  const updatedAt = data?.updatedAt ?? null
  const totalTracked = data?.totalTracked ?? stats?.totalTracked ?? 0

  function clearFilters() {
    setLanguage('All')
    setQuery('')
    setRange('7d')
    setSort('momentum')
  }

  return (
    <>
      <Hero stats={stats} topRepos={topRepos} range={rangeLabel(range)} sort={sort} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Controls
          range={range}
          onRangeChange={setRange}
          sort={sort}
          onSortChange={setSort}
          language={language}
          languages={languages}
          onLanguageChange={setLanguage}
          query={query}
          onQueryChange={setQuery}
          total={totalTracked}
          updatedAt={updatedAt}
          dataMode={dataMode}
          isFetching={isFetching && Boolean(data)}
        />

        {error && data !== null && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-orange/25 bg-orange/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
              <div>
                <p className="text-xs font-semibold text-white">Could not refresh the leaderboard</p>
                <p className="mt-0.5 text-xs text-muted">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="focus-ring inline-flex items-center gap-1.5 self-start rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white transition hover:border-orange/40 hover:text-orange sm:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {sort === 'breakout' ? 'Breakout leaderboard' : 'Momentum leaderboard'}
              </h2>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-muted">
                {repos.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {sort === 'breakout'
                ? `Ranked by percent growth over the ${rangeLabel(range)} — smaller repos can win.`
                : `Ranked by stars gained over the ${rangeLabel(range)}. Updated from periodic snapshots.`}
            </p>
          </div>
          <a
            href={
              staticDemo
                ? `${import.meta.env.BASE_URL}demo-data.json`
                : `/api/repos?range=${range}&sort=${sort}&language=${encodeURIComponent(language)}&q=${encodeURIComponent(debouncedQuery)}`
            }
            target="_blank"
            rel="noreferrer"
            className="focus-ring self-start text-[11px] font-mono text-muted transition hover:text-lime sm:self-auto"
          >
            {staticDemo ? 'demo data →' : 'view JSON →'}
          </a>
        </div>

        {data === null ? (
          error ? (
            <LoadFailure message={error} onRetry={() => setReloadKey((value) => value + 1)} />
          ) : (
            <>
              <PodiumSkeleton />
              <TableSkeleton />
            </>
          )
        ) : repos.length === 0 ? (
          <EmptyState onClear={clearFilters} />
        ) : (
          <>
            <Podium repos={topRepos} sort={sort} />
            <RepoTable repos={repos} range={range} sort={sort} />
          </>
        )}

        <HowItWorks />
      </div>
    </>
  )
}
