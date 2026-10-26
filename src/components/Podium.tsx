import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LeaderboardItem, SortMode } from '../types'
import {
  formatDelta,
  formatNumber,
  formatPerDay,
  formatPercent,
  languageColor,
} from '../lib/format'
import { RepoAvatar } from './RepoAvatar'
import { Sparkline } from './Sparkline'

const labels: Record<SortMode, string[]> = {
  momentum: ['Leading', 'Chasing', 'Climbing'],
  breakout: ['Highest growth', 'Runner-up', 'Rising fast'],
}

export function Podium({ repos, sort = 'momentum' }: { repos: LeaderboardItem[]; sort?: SortMode }) {
  if (!repos.length) return null

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {repos.slice(0, 3).map((repo, index) => {
        const isLeader = index === 0
        const value = sort === 'breakout' ? repo.growth : repo.gained
        const valueTone =
          value > 0 ? 'text-lime' : value < 0 ? 'text-orange' : 'text-muted'
        return (
          <Link
            key={repo.id}
            to={`/repo/${repo.owner}/${repo.name}`}
            className={`card card-hover group relative flex flex-col overflow-hidden p-4 sm:p-5 ${
              index === 2 ? 'md:col-span-2 lg:col-span-1' : ''
            } ${
              isLeader
                ? 'border-lime/25 bg-gradient-to-b from-lime/[0.07] via-white/[0.02] to-transparent shadow-[0_0_50px_rgba(198,245,110,0.05)]'
                : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${
                    isLeader
                      ? 'border-lime/25 bg-lime/10 text-lime'
                      : 'border-white/10 bg-white/[0.03] text-muted'
                  }`}
                >
                  {labels[sort][index]}
                </span>
                <p className="mt-3 font-mono text-3xl font-bold tracking-tighter text-white/15">
                  0{repo.rank}
                </p>
              </div>
              <div className="text-right">
                <p className={`stat-number text-xl font-bold ${valueTone}`}>
                  {sort === 'breakout' ? formatPercent(repo.growth) : formatDelta(repo.gained)}
                </p>
                <p className="text-[11px] text-muted">
                  {sort === 'breakout' ? (
                    <>
                      growth · {formatDelta(repo.gained)} stars
                    </>
                  ) : (
                    <>
                      stars · <span className={valueTone}>{formatPercent(repo.growth)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <RepoAvatar src={repo.avatarUrl} name={repo.name} size={42} />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-white">
                  <span className="font-normal text-muted">{repo.owner}/</span>
                  <wbr />
                  {repo.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: languageColor(repo.language) }}
                  />
                  {repo.language ?? 'Unknown'}
                </p>
              </div>
              <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 self-start text-muted-2 transition group-hover:text-lime" />
            </div>

            <p className="mt-3 line-clamp-2 min-h-10 flex-1 text-xs leading-relaxed text-muted">
              {repo.description ?? 'No description provided.'}
            </p>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="flex gap-5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-2">
                    Stars
                  </p>
                  <p className="stat-number mt-0.5 text-sm font-semibold text-white">
                    {formatNumber(repo.stars)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-2">
                    Pace
                  </p>
                  <p className="stat-number mt-0.5 text-sm font-semibold text-white">
                    {formatPerDay(repo.perDay)}
                  </p>
                </div>
              </div>
              <div className="hidden lg:block">
                <Sparkline data={repo.sparkline} width={90} height={30} positive={value >= 0} />
              </div>
            </div>

            <div
              className={`absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent ${
                isLeader ? 'via-lime/60' : 'via-white/20'
              }`}
            />
          </Link>
        )
      })}
    </div>
  )
}
