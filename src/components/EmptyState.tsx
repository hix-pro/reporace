import { SearchX } from 'lucide-react'

export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="card mt-4 flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-muted">
        <SearchX className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-white">No repositories match</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
        Try a different language or clear the search. RepoRace only ranks repositories it is
        currently tracking.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="focus-ring mt-5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white transition hover:border-lime/40 hover:text-lime"
      >
        Clear filters
      </button>
    </div>
  )
}
