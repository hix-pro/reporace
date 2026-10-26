import { Camera, GitCompareArrows, ShieldCheck, Trophy } from 'lucide-react'

const steps = [
  {
    icon: Camera,
    title: 'Snapshot',
    body: 'Every collection run records the star count of each tracked repository. Totals come straight from the GitHub API.',
  },
  {
    icon: GitCompareArrows,
    title: 'Diff',
    body: 'We compare snapshots to calculate stars gained over 24 hours, 7 days and 30 days. No engagement estimates, no black box.',
  },
  {
    icon: Trophy,
    title: 'Rank',
    body: 'Repositories are sorted by momentum, so a new breakout can sit next to a project with 100× its stars.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime">Methodology</p>
          <h2 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Stars owned is a lagging indicator.
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-muted">
          RepoRace measures the change, not the scoreboard. The result is a cleaner signal for
          what developers are actually discovering right now.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <div key={step.title} className="card group p-5 transition hover:border-white/20">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-lime/20 bg-lime/[0.06] text-lime">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-mono text-[10px] text-muted-2">0{index + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">{step.body}</p>
            </div>
          )
        })}
      </div>

      <div className="card mt-4 flex flex-col gap-3 border-lime/15 bg-lime/[0.025] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
          <p className="text-xs leading-relaxed text-muted">
            <span className="font-semibold text-white">Data honesty:</span> star counts are
            periodic snapshots, not a live firehose. Demo history is always labeled. When live
            collection starts, the demo series is deleted.
          </p>
        </div>
        <a
          href="https://github.com/hix-pro/reporace/issues"
          target="_blank"
          rel="noreferrer"
          className="focus-ring shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-center text-xs font-semibold text-white transition hover:border-lime/40 hover:text-lime"
        >
          Suggest a repo
        </a>
      </div>
    </section>
  )
}
