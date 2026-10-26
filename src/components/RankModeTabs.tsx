import type { SortMode } from '../types'

const modes: { key: SortMode; label: string; hint: string }[] = [
  { key: 'momentum', label: 'Momentum', hint: 'Sort by total stars gained' },
  { key: 'breakout', label: 'Breakout', hint: 'Sort by growth relative to repo size' },
]

export function RankModeTabs({
  value,
  onChange,
}: {
  value: SortMode
  onChange: (value: SortMode) => void
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="hidden text-[9px] font-bold uppercase tracking-[0.16em] text-muted-2 lg:block">
        Rank by
      </span>
      <div
        className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1"
        role="tablist"
        aria-label="Ranking mode"
      >
        {modes.map((mode) => {
          const active = mode.key === value
          return (
            <button
              key={mode.key}
              type="button"
              role="tab"
              aria-selected={active}
              title={mode.hint}
              onClick={() => onChange(mode.key)}
              className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active ? 'bg-white/10 text-white' : 'text-muted hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
