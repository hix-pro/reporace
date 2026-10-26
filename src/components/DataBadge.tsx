import { Clock3 } from 'lucide-react'
import type { DataMode } from '../types'
import { timeAgo } from '../lib/format'

export function DataBadge({
  mode,
  updatedAt,
  compact = false,
}: {
  mode: DataMode | null
  updatedAt: string | null
  compact?: boolean
}) {
  const isLoading = mode === null
  const isDemo = mode === 'demo'

  const tone = isLoading
    ? 'border-white/10 bg-white/[0.03] text-muted'
    : isDemo
      ? 'border-orange/30 bg-orange/10 text-orange'
      : 'border-lime/25 bg-lime/10 text-lime'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${tone}`}
        title={
          isLoading
            ? 'Waiting for the API to report whether this history is live or demo data.'
            : isDemo
              ? 'Demo history generated for development. Run npm run collect to switch to live snapshots.'
              : 'Live snapshots collected from the GitHub API.'
        }
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isLoading ? 'animate-pulse bg-muted-2' : isDemo ? 'bg-orange' : 'animate-pulse-dot bg-lime'
          }`}
        />
        {isLoading ? 'Loading' : isDemo ? 'Demo data' : 'Live'}
      </span>
      {!compact && (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Clock3 className="h-3.5 w-3.5" />
          {isLoading ? 'Checking data source' : `Updated ${timeAgo(updatedAt)}`}
        </span>
      )}
    </div>
  )
}
