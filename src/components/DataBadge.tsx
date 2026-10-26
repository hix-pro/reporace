import { Clock3 } from 'lucide-react'
import type { DataMode } from '../types'
import { timeAgo } from '../lib/format'

export function DataBadge({
  mode,
  updatedAt,
  compact = false,
}: {
  mode: DataMode
  updatedAt: string | null
  compact?: boolean
}) {
  const isDemo = mode === 'demo'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
          isDemo
            ? 'border-orange/30 bg-orange/10 text-orange'
            : 'border-lime/25 bg-lime/10 text-lime'
        }`}
        title={
          isDemo
            ? 'Demo history generated for development. Run npm run collect to switch to live snapshots.'
            : 'Live snapshots collected from the GitHub API.'
        }
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${isDemo ? 'bg-orange' : 'animate-pulse-dot bg-lime'}`}
        />
        {isDemo ? 'Demo data' : 'Live'}
      </span>
      {!compact && (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Clock3 className="h-3.5 w-3.5" />
          Updated {timeAgo(updatedAt)}
        </span>
      )}
    </div>
  )
}
