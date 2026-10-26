import type { LeaderboardItem, SortMode } from '../types'
import { formatDelta, formatPercent } from '../lib/format'

export function Ticker({
  repos,
  sort = 'momentum',
}: {
  repos: LeaderboardItem[]
  sort?: SortMode
}) {
  if (!repos.length) return null
  const top = repos.slice(0, 8)

  return (
    <div className="group ticker-mask relative overflow-hidden border-t border-white/[0.06] bg-white/[0.015] py-2.5">
      <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused]">
        {[0, 1].map((group) => (
          <div
            key={group}
            className="flex shrink-0 items-center gap-8 pl-4 pr-8"
            aria-hidden={group === 1}
          >
            {top.map((repo) => (
              <span
                key={`${repo.id}-${group}`}
                className="flex items-center gap-2 whitespace-nowrap font-mono text-[11px] text-muted"
              >
                <span className="text-muted-2">#{String(repo.rank).padStart(2, '0')}</span>
                <span className="text-white/75">{repo.fullName}</span>
                <span className="text-lime">
                  {sort === 'breakout' ? formatPercent(repo.growth) : formatDelta(repo.gained)}
                </span>
                <span className="text-muted-2">
                  {sort === 'breakout' ? 'growth' : 'stars'}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
