import { ChevronDown } from 'lucide-react'

export function LanguageSelect({
  value,
  languages,
  onChange,
}: {
  value: string
  languages: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Filter by language</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring h-9 appearance-none rounded-lg border border-white/10 bg-white/[0.03] pl-3 pr-8 text-xs font-medium text-white outline-none transition hover:border-white/20 hover:bg-white/[0.05]"
      >
        <option value="All" className="bg-panel text-white">
          All languages
        </option>
        {languages.map((language) => (
          <option key={language} value={language} className="bg-panel text-white">
            {language}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-muted" />
    </label>
  )
}
