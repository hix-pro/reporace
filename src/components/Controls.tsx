import { Loader2 } from 'lucide-react'
import type { DataMode, RangeKey, SortMode } from '../types'
import { DataBadge } from './DataBadge'
import { LanguageSelect } from './LanguageSelect'
import { RankModeTabs } from './RankModeTabs'
import { RangeTabs } from './RangeTabs'
import { SearchInput } from './SearchInput'

export function Controls({
  range,
  onRangeChange,
  sort,
  onSortChange,
  language,
  languages,
  onLanguageChange,
  query,
  onQueryChange,
  total,
  updatedAt,
  dataMode,
  isFetching,
}: {
  range: RangeKey
  onRangeChange: (value: RangeKey) => void
  sort: SortMode
  onSortChange: (value: SortMode) => void
  language: string
  languages: string[]
  onLanguageChange: (value: string) => void
  query: string
  onQueryChange: (value: string) => void
  total: number
  updatedAt: string | null
  dataMode: DataMode
  isFetching: boolean
}) {
  return (
    <div className="flex flex-col gap-3 py-5 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <RangeTabs value={range} onChange={onRangeChange} />
        <RankModeTabs value={sort} onChange={onSortChange} />
        <LanguageSelect value={language} languages={languages} onChange={onLanguageChange} />
        <SearchInput value={query} onChange={onQueryChange} />
      </div>

      <div className="flex items-center gap-3">
        {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-lime" />}
        <span className="font-mono text-[11px] text-muted">
          {total.toLocaleString('en')} tracked
        </span>
        <DataBadge mode={dataMode} updatedAt={updatedAt} compact />
      </div>
    </div>
  )
}
