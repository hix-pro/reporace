import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LeaderboardItem, RangeKey, SortMode } from '../types'
import {
  formatDelta,
  formatNumber,
  formatPerDay,
  formatPercent,
  languageColor,
} from '../lib/format'
import { RepoAvatar } from './RepoAvatar'
import { Sparkline } from './Sparkline'

function Rank({ rank }: { rank: number }) {
  const tone =
    rank === 1
      ? 'border-lime/30 bg-lime/10 text-lime'
      : rank <= 3
        ? 'border-white/15 bg-white/[0.05] text-white'
        : 'border-transparent text-muted-2'
  return (
    <span
      className={`stat-number grid h-7 w-7 place-items-center rounded-md border text-[11px] font-semibold ${tone}`}
    >
      {String(rank).padStart(2, '0')}
    </span>
  )
}

export function RepoTable({
  repos,
  range,
  sort = 'momentum',
}: {
  repos: LeaderboardItem[]
  range: RangeKey
  sort?: SortMode
}) {
  if (!repos.length) return null

  return (
    <div className="card mt-4 overflow-hidden">
      <div className="hidden items-center gap-3 border-b border-white/[0.07] bg-white/[0.015] px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-2 md:grid md:grid-cols-[40px_minmax(0,1fr)_100px_100px_100px] lg:grid-cols-[44px_minmax(0,1fr)_110px_92px_110px_100px_104px]">
        <span>#</span>
        <span>Repository</span>
        <span className="hidden lg:block">Language</span>
        <span className="text-right">Stars</span>
        <span className="text-right">{sort === 'breakout' ? 'Growth' : 'Gained'}</span>
        <span className="hidden text-right lg:block">Per day</span>
        <span className="text-right">Trend</span>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {repos.map((repo) => {
          return (
            <Link
              key={repo.id}
              to={`/repo/${repo.owner}/${repo.name}`}
              className="group grid grid-cols-[32px_minmax(0,1fr)_92px] items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] md:grid-cols-[40px_minmax(0,1fr)_100px_100px_100px] lg:grid-cols-[44px_minmax(0,1fr)_110px_92px_110px_100px_104px]"
            >
              <Rank rank={repo.rank} />

              <div className="flex min-w-0 items-center gap-3">
                <RepoAvatar src={repo.avatarUrl} name={repo.name} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">
                    <span className="font-normal text-muted">{repo.owner}/</span>
                    {repo.name}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-2">
                    {repo.description ?? 'No description'}
                  </p>
                </div>
                <ArrowUpRight className="ml-1 hidden h-3.5 w-3.5 shrink-0 text-muted-2 transition group-hover:text-lime sm:block" />
              </div>

              <div className="hidden items-center gap-1.5 text-[11px] text-muted lg:flex">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: languageColor(repo.language) }}
                />
                <span className="truncate">{repo.language ?? '—'}</span>
              </div>

              <div className="hidden text-right md:block">
                <p className="stat-number text-[12px] font-medium text-white">
                  {formatNumber(repo.stars)}
                </p>
              </div>

              <div className="text-right">
                <p className="stat-number text-[12px] font-semibold text-lime">
                  {sort === 'breakout' ? formatPercent(repo.growth) : formatDelta(repo.gained)}
                </p>
                <p className="stat-number text-[10px] text-muted-2">
                  {sort === 'breakout' ? `${formatDelta(repo.gained)} stars` : formatPercent(repo.growth)}
                </p>
              </div>

              <div className="hidden text-right lg:block">
                <p className="stat-number text-[11px] text-muted">
                  {formatPerDay(repo.perDay)}
                </p>
              </div>

              <div className="hidden justify-end md:flex">
                <Sparkline
                  data={repo.sparkline}
                  width={96}
                  height={26}
                  positive={repo.gained >= 0}
                />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
