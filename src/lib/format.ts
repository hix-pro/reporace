const compact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const full = new Intl.NumberFormat('en')

export function formatNumber(value: number): string {
  return compact.format(value)
}

export function formatFullNumber(value: number): string {
  return full.format(value)
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${full.format(value)}`
}

export function formatPerDay(value: number): string {
  if (value >= 100) return `${Math.round(value).toLocaleString('en')}/day`
  if (value >= 10) return `${value.toFixed(1)}/day`
  return `${value.toFixed(2)}/day`
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function growthPercent(gained: number, stars: number): number {
  if (!stars) return 0
  return (gained / stars) * 100
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'not yet'
  const date = new Date(iso)
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function shortDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    date,
  )
}

export function languageColor(language: string | null): string {
  if (!language) return '#5d6b7d'
  const colors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Rust: '#dea584',
    Go: '#00ADD8',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    Java: '#b07219',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Zig: '#ec915c',
    Shell: '#89e051',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Lua: '#000080',
    Dart: '#00B4AB',
    Elixir: '#6e4a7e',
    Haskell: '#5e5086',
    Scala: '#c22d40',
    Vue: '#41b883',
    Svelte: '#ff3e00',
    Astro: '#ff5a03',
    MDX: '#fcb32c',
    Jupyter: '#DA5B0B',
    'Jupyter Notebook': '#DA5B0B',
  }
  return colors[language] ?? '#8b98a9'
}

export function rangeLabel(range: '24h' | '7d' | '30d'): string {
  if (range === '24h') return 'last 24 hours'
  if (range === '7d') return 'last 7 days'
  return 'last 30 days'
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
