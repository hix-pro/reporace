import { useId } from 'react'

export function Sparkline({
  data,
  width = 100,
  height = 30,
  positive = true,
  className = '',
}: {
  data: number[]
  width?: number
  height?: number
  positive?: boolean
  className?: string
}) {
  const gradientId = useId().replaceAll(':', '')
  const values = data.length > 1 ? data : [0, 0]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = width / Math.max(1, values.length - 1)
  const padding = 2
  const points = values
    .map((value, index) => {
      const x = index * stepX
      const y = height - padding - ((value - min) / range) * (height - padding * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  const stroke = positive ? '#c6f56e' : '#fb923c'

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
