import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  GitFork,
  Star,
  TriangleAlert,
  Trophy,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataBadge } from '../components/DataBadge'
import { GithubIcon } from '../components/GithubIcon'
import { RepoAvatar } from '../components/RepoAvatar'
import { fetchJson } from '../lib/api'
import {
  formatDelta,
  formatFullNumber,
  formatNumber,
  formatPerDay,
  languageColor,
  shortDay,
  timeAgo,
} from '../lib/format'
import type { RangeKey, RepoDetailResponse } from '../types'

type ChartMode = 'stars' | 'gains'

function ChartTooltip(props: any) {
  const { active, payload, label } = props
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as { stars: number; gained: number } | undefined
  if (!point) return null

  return (
    <div className="rounded-xl border border-white/15 bg-[#0b1016]/95 px-3 py-2 shadow-2xl backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
        {shortDay(String(label))}
      </p>
      <p className="stat-number mt-1 text-sm font-semibold text-white">
        {formatFullNumber(point.stars)} stars
      </p>
      <p className="stat-number text-[11px] text-lime">+{formatFullNumber(point.gained)} that day</p>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: ReactNode
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
  return (
    <div className={`card p-4 ${accent ? 'border-lime/20 bg-lime/[0.03]' : ''}`}>
      <div className="flex items-center gap-2 text-muted">
        <span className={accent ? 'text-lime' : 'text-muted-2'}>{icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className={`stat-number mt-2 text-xl font-bold ${accent ? 'text-lime' : 'text-white'}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-2">{sub}</p>
    </div>
  )
}

function RepoPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-3 w-24 rounded bg-white/[0.06]" />
      <div className="mt-8 flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-white/[0.07]" />
        <div className="space-y-2">
          <div className="h-4 w-48 rounded bg-white/[0.08]" />
          <div className="h-3 w-72 rounded bg-white/[0.05]" />
        </div>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-24 p-4">
            <div className="h-2.5 w-16 rounded bg-white/[0.05]" />
            <div className="mt-3 h-5 w-20 rounded bg-white/[0.07]" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card h-[420px] lg:col-span-2" />
        <div className="card h-[420px]" />
      </div>
    </div>
  )
}

export function RepoPage() {
  const { owner = '', name = '' } = useParams<{ owner: string; name: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawRange = searchParams.get('range')
  const range: RangeKey = rawRange === '24h' || rawRange === '30d' ? rawRange : '7d'

  const [data, setData] = useState<RepoDetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chartMode, setChartMode] = useState<ChartMode>('stars')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setError(null)

    fetchJson<RepoDetailResponse>(
      `/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}?range=${range}`,
      controller.signal,
    )
      .then((response) => setData(response))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : 'Could not load repository')
      })

    return () => controller.abort()
  }, [owner, name, range, reloadKey])

  function setRange(next: RangeKey) {
    const params = new URLSearchParams(searchParams)
    params.set('range', next)
    setSearchParams(params, { replace: true })
  }

  if (!data && !error) return <RepoPageSkeleton />

  if (!data && error) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-28 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-orange/20 bg-orange/[0.06] text-orange">
          <TriangleAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">Repository not available</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{error}</p>
        <div className="mt-6 flex gap-2">
          <Link
            to="/"
            className="focus-ring rounded-lg bg-lime px-4 py-2 text-xs font-bold text-ink transition hover:bg-lime-dim"
          >
            Back to leaderboard
          </Link>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="focus-ring rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/25"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { repo, history, stats } = data
  const hasHistory = history.length > 1
  const maxGain = Math.max(stats.gained24h, stats.gained7d, stats.gained30d, 1)
  const velocity = [
    { label: '24 hours', value: stats.gained24h },
    { label: '7 days', value: stats.gained7d },
    { label: '30 days', value: stats.gained30d },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/"
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-muted transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to leaderboard
        </Link>
        <DataBadge mode={data.dataMode} updatedAt={data.updatedAt} />
      </div>

      <section className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-lime/[0.06] blur-3xl" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <RepoAvatar src={repo.avatarUrl} name={repo.name} size={64} className="rounded-2xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  <span className="font-normal text-muted">{repo.owner}/</span>
                  {repo.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: languageColor(repo.language) }}
                  />
                  {repo.language ?? 'Unknown'}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                {repo.description ?? 'No description provided.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-lime" />
                  <span className="stat-number font-semibold text-white">
                    {formatFullNumber(repo.stars)}
                  </span>
                  stars
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <GitFork className="h-3.5 w-3.5" />
                  <span className="stat-number text-white">{formatNumber(repo.forks)}</span>
                  forks
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CircleDot className="h-3.5 w-3.5" />
                  <span className="stat-number text-white">{formatNumber(repo.openIssues)}</span>
                  open issues
                </span>
              </div>
            </div>
          </div>

          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white transition hover:border-lime/40 hover:text-lime"
          >
            <GithubIcon className="h-4 w-4" />
            View on GitHub
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {repo.topics.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {repo.topics.slice(0, 10).map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-white/10 bg-white/[0.025] px-2 py-0.5 font-mono text-[10px] text-muted"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-3.5 w-3.5" />}
          label="24 hours"
          value={formatDelta(stats.gained24h)}
          sub="stars gained"
          accent
        />
        <StatCard
          icon={<Activity className="h-3.5 w-3.5" />}
          label="7 days"
          value={formatDelta(stats.gained7d)}
          sub={`${formatPerDay(stats.perDay)} average`}
        />
        <StatCard
          icon={<Activity className="h-3.5 w-3.5" />}
          label="30 days"
          value={formatDelta(stats.gained30d)}
          sub="stars gained"
        />
        <StatCard
          icon={<Trophy className="h-3.5 w-3.5" />}
          label={`${range} rank`}
          value={stats.rank ? `#${stats.rank}` : '—'}
          sub={`of ${stats.totalTracked.toLocaleString('en')} tracked`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2">
                Star history
              </p>
              <h2 className="mt-1 text-sm font-semibold text-white">
                {chartMode === 'stars' ? 'Cumulative stars' : 'Daily stars gained'}
              </h2>
            </div>
            <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
              <button
                type="button"
                onClick={() => setChartMode('stars')}
                className={`focus-ring rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  chartMode === 'stars' ? 'bg-white/10 text-white' : 'text-muted hover:text-white'
                }`}
              >
                Cumulative
              </button>
              <button
                type="button"
                onClick={() => setChartMode('gains')}
                className={`focus-ring rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  chartMode === 'gains' ? 'bg-white/10 text-white' : 'text-muted hover:text-white'
                }`}
              >
                Daily
              </button>
            </div>
          </div>

          <div className="mt-5 h-[320px] w-full">
            {hasHistory ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'stars' ? (
                  <AreaChart data={history} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="starsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c6f56e" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#c6f56e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#1b2532" strokeDasharray="3 4" />
                    <XAxis
                      dataKey="day"
                      tickFormatter={shortDay}
                      tick={{ fill: '#5d6b7d', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      width={56}
                      domain={['auto', 'auto']}
                      tickFormatter={(value: number) => formatNumber(value)}
                      tick={{ fill: '#5d6b7d', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#2a3747', strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="stars"
                      stroke="#c6f56e"
                      strokeWidth={2}
                      fill="url(#starsFill)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#c6f56e', stroke: '#07090c', strokeWidth: 2 }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={history} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#1b2532" strokeDasharray="3 4" />
                    <XAxis
                      dataKey="day"
                      tickFormatter={shortDay}
                      tick={{ fill: '#5d6b7d', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      width={56}
                      tickFormatter={(value: number) => formatNumber(value)}
                      tick={{ fill: '#5d6b7d', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="gained" fill="#c6f56e" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] text-center">
                <Activity className="h-5 w-5 text-muted-2" />
                <p className="mt-2 text-xs font-semibold text-white">Not enough history yet</p>
                <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-muted">
                  RepoRace needs at least two snapshots before it can draw a chart. Run the collector
                  a few times or wait for the next scheduled run.
                </p>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] text-muted-2">
            <span className="font-mono">
              {history.length ? `${history.length} daily points` : 'no data points'}
            </span>
            <span>Updated {timeAgo(data.updatedAt)}</span>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Velocity</h2>
              <Activity className="h-4 w-4 text-lime" />
            </div>
            <div className="mt-5 space-y-4">
              {velocity.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted">{item.label}</span>
                    <span className="stat-number font-semibold text-white">
                      {formatDelta(item.value)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-lime/50 to-lime"
                      style={{ width: `${Math.max(3, (item.value / maxGain) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-muted-2">
              Velocity is the net change in star count between snapshots. Unstars can reduce the
              total.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-white">Repo facts</h2>
            <dl className="mt-4 space-y-3 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-1.5 text-muted">
                  <CalendarDays className="h-3.5 w-3.5" /> Created
                </dt>
                <dd className="font-mono text-white">
                  {repo.createdAt
                    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
                        new Date(repo.createdAt),
                      )
                    : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Last push</dt>
                <dd className="font-mono text-white">
                  {repo.pushedAt
                    ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
                        new Date(repo.pushedAt),
                      )
                    : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Open issues</dt>
                <dd className="stat-number text-white">{formatFullNumber(repo.openIssues)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Forks</dt>
                <dd className="stat-number text-white">{formatFullNumber(repo.forks)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Language</dt>
                <dd className="inline-flex items-center gap-1.5 text-white">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: languageColor(repo.language) }}
                  />
                  {repo.language ?? 'Unknown'}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}
