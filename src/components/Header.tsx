import { Link } from 'react-router-dom'
import { GithubIcon } from './GithubIcon'
import { Logo } from './Logo'

const staticDemo = import.meta.env.VITE_STATIC_DEMO === '1'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="focus-ring flex items-center gap-3 rounded-lg">
          <Logo />
          <span className="text-[15px] font-bold tracking-tight text-white">
            Repo<span className="text-lime">Race</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm text-muted">
          <Link
            to="/"
            className="focus-ring hidden rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white sm:block"
          >
            Leaderboard
          </Link>
          <Link
            to="/#how-it-works"
            className="focus-ring hidden rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-white md:block"
          >
            How it works
          </Link>
          {!staticDemo && (
            <a
              href="/api/repos?range=7d"
              className="focus-ring hidden rounded-lg px-3 py-2 font-mono text-xs transition hover:bg-white/5 hover:text-white sm:block"
              target="_blank"
              rel="noreferrer"
            >
              API
            </a>
          )}
          <a
            href="https://github.com/hix-pro/reporace"
            className="focus-ring ml-1 grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-muted transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            target="_blank"
            rel="noreferrer"
            aria-label="RepoRace on GitHub"
          >
            <GithubIcon className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </header>
  )
}
