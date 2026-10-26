import { lazy, Suspense, useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HomePage } from './pages/HomePage'

const RepoPage = lazy(() =>
  import('./pages/RepoPage').then((module) => ({ default: module.RepoPage })),
)

function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1))
      const frame = window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' })
      })
      return () => window.cancelAnimationFrame(frame)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}

function RepoFallback() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-3 w-24 rounded bg-white/[0.06]" />
      <div className="mt-8 h-40 rounded-2xl border border-white/10 bg-white/[0.02]" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-24 p-4" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card h-[420px] lg:col-span-2" />
        <div className="card h-[420px]" />
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-28 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Wrong turn.</h1>
      <p className="mt-2 text-sm text-muted">
        That page does not exist. The leaderboard is still moving.
      </p>
      <Link
        to="/"
        className="focus-ring mt-6 rounded-lg bg-lime px-4 py-2 text-xs font-bold text-ink transition hover:bg-lime-dim"
      >
        Back to RepoRace
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollManager />
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/repo/:owner/:name"
            element={
              <Suspense fallback={<RepoFallback />}>
                <RepoPage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
