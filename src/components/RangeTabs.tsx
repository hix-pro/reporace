import type { RangeKey } from '../types'

const ranges: { key: RangeKey; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
]

export function RangeTabs({
  value,
  onChange,
}: {
  value: RangeKey
  onChange: (value: RangeKey) => void
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1"
      role="tablist"
      aria-label="Time range"
    >
      {ranges.map((range) => {
        const active = range.key === value
        return (
          <button
            key={range.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(range.key)}
            className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? 'bg-lime text-ink shadow-[0_0_18px_rgba(198,245,110,0.18)]'
                : 'text-muted hover:text-white'
            }`}
          >
            {range.label}
          </button>
        )
      })}
    </div>
  )
}
