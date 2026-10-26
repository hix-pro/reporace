import type { ReactNode } from 'react'
import { ArrowUpRight, Database, Star, TrendingUp } from 'lucide-react'
import type { LeaderboardItem, SortMode, StatsResponse } from '../types'
import { formatDelta, formatNumber, timeAgo } from '../lib/format'
import { DataBadge } from './DataBadge'
import { Ticker } from './Ticker'

function HeroStat({
  icon,
  label,
  value,
  sub,
  className = '',
}: {
  icon: ReactNode
  label: string
  value: string
  sub: string
  className?: string
}) {
  return (
    <div className={`card flex items-center gap-3 px-4 py-3 ${className}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-lime">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-2">
          {label}
        </p>
        <p className="stat-number truncate text-lg font-semibold text-white">{value}</p>
        <p className="truncate text-[11px] text-muted">{sub}</p>
      </div>
    </div>
  )
}

export function Hero({
  stats,
  topRepos,
  range,
  sort,
}: {
  stats: StatsResponse | null
  topRepos: LeaderboardItem[]
  range: string
  sort: SortMode
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-lime" />
            GitHub momentum, measured
          </span>
          {stats && <DataBadge mode={stats.dataMode} updatedAt={stats.updatedAt} />}
        </div>

        <h1 className="mt-5 max-w-4xl text-[2.65rem] font-bold leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
          The fastest-moving
          <br />
          <span className="text-lime text-glow">repos</span> on GitHub.
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          RepoRace ranks repositories by <span className="font-semibold text-white">stars gained</span>,
          not stars owned. See what is accelerating before it becomes obvious.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <HeroStat
            icon={<Database className="h-4 w-4" />}
            label="Tracked repos"
            value={stats ? formatNumber(stats.totalTracked) : '—'}
            sub="across every major ecosystem"
          />
          <HeroStat
            icon={<TrendingUp className="h-4 w-4" />}
            label="Stars gained"
            value={stats ? formatDelta(stats.totalGained7d) : '—'}
            sub={stats?.dataMode === 'demo' ? 'demo history, last 7 days' : 'last 7 days'}
          />
          <HeroStat
            className="sm:col-span-2 lg:col-span-1"
            icon={<Star className="h-4 w-4" />}
            label="Last snapshot"
            value={stats ? timeAgo(stats.updatedAt) : '—'}
            sub="star counts are periodic, not real-time"
          />
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-muted">
          <ArrowUpRight className="h-3.5 w-3.5 text-lime" />
          <span>
            Looking at <span className="font-mono text-white">{range}</span>{' '}
            {sort === 'breakout' ? 'growth' : 'momentum'}.
          </span>
        </div>
      </div>

      <Ticker repos={topRepos} sort={sort} />
    </section>
  )
}
