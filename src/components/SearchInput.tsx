import { Search, X } from 'lucide-react'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search repos…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="relative flex h-9 w-full items-center sm:w-auto">
      <span className="sr-only">Search repositories</span>
      <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="focus-ring h-9 w-full min-w-0 rounded-lg border border-white/10 bg-white/[0.03] pl-8 pr-8 text-xs text-white outline-none transition placeholder:text-muted-2 hover:border-white/20 focus:border-lime/50 sm:w-[220px]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="focus-ring absolute right-2 grid h-5 w-5 place-items-center rounded-md text-muted transition hover:bg-white/10 hover:text-white"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </label>
  )
}
