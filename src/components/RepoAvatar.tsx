import { useState } from 'react'
import { languageColor } from '../lib/format'

export function RepoAvatar({
  src,
  name,
  size = 40,
  className = '',
}: {
  src: string | null
  name: string
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const initials = name.slice(0, 1).toUpperCase()

  if (!src || failed) {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] font-mono text-sm font-bold text-white ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {initials}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-xl border border-white/10 bg-white/[0.04] object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
