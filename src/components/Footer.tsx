import { Link } from 'react-router-dom'
import { GithubIcon } from './GithubIcon'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/[0.07]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-start gap-3">
          <Logo className="h-8 w-8 rounded-lg" />
          <div>
            <p className="text-sm font-semibold text-white">
              Repo<span className="text-lime">Race</span>
            </p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">
              Ranked by stars gained, not stars owned. Star counts are periodic snapshots from the
              GitHub API, not a real-time feed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <Link className="transition hover:text-white" to="/#how-it-works">
            How it works
          </Link>
          <a className="transition hover:text-white" href="/api/repos?range=7d" target="_blank" rel="noreferrer">
            JSON API
          </a>
          <a
            className="inline-flex items-center gap-1.5 transition hover:text-white"
            href="https://github.com/hix-pro/reporace"
            target="_blank"
            rel="noreferrer"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            Source
          </a>
          <span className="font-mono text-[11px] text-muted-2">v0.1</span>
        </div>
      </div>
    </footer>
  )
}
