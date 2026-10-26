export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card mt-4 overflow-hidden">
      <div className="border-b border-white/[0.07] bg-white/[0.015] px-4 py-3">
        <div className="h-2.5 w-28 animate-pulse rounded bg-white/10" />
      </div>
      <div className="divide-y divide-white/[0.06]">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ opacity: 1 - index * 0.07 }}
          >
            <div className="h-7 w-7 animate-pulse rounded-md bg-white/[0.06]" />
            <div className="h-8 w-8 animate-pulse rounded-lg bg-white/[0.06]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-36 animate-pulse rounded bg-white/[0.07]" />
              <div className="h-2 w-56 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="hidden h-2.5 w-12 animate-pulse rounded bg-white/[0.05] sm:block" />
            <div className="h-2.5 w-14 animate-pulse rounded bg-white/[0.06]" />
            <div className="hidden h-6 w-20 animate-pulse rounded bg-white/[0.05] md:block" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PodiumSkeleton() {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="card h-[230px] animate-pulse p-5">
          <div className="h-4 w-16 rounded bg-white/[0.06]" />
          <div className="mt-4 h-8 w-24 rounded bg-white/[0.05]" />
          <div className="mt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/[0.06]" />
            <div className="space-y-2">
              <div className="h-2.5 w-32 rounded bg-white/[0.07]" />
              <div className="h-2 w-20 rounded bg-white/[0.04]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
