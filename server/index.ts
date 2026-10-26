import './env.ts'
import express, { type NextFunction, type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import {
  getLeaderboard,
  getRepoDetail,
  getStats,
  type RangeKey,
} from './velocity.ts'

const app = express()
const port = Number(process.env.PORT ?? 8787)
const ranges = new Set<RangeKey>(['24h', '7d', '30d'])

app.disable('x-powered-by')
app.use(express.json())

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asRange(value: unknown): RangeKey {
  return ranges.has(value as RangeKey) ? (value as RangeKey) : '7d'
}

function asSort(value: unknown): 'momentum' | 'breakout' {
  return value === 'breakout' ? 'breakout' : 'momentum'
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'reporace', time: new Date().toISOString() })
})

app.get('/api/repos', (req, res) => {
  const response = getLeaderboard({
    range: asRange(req.query.range),
    language: asString(req.query.language) ?? 'All',
    q: asString(req.query.q) ?? '',
    sort: asSort(req.query.sort),
  })
  res.set('Cache-Control', 'no-store')
  res.json(response)
})

app.get('/api/repos/:owner/:name', (req, res) => {
  const owner = req.params.owner
  const name = req.params.name
  const response = getRepoDetail(`${owner}/${name}`, asRange(req.query.range))
  if (!response) {
    res.status(404).json({ error: 'Repository not tracked yet' })
    return
  }
  res.set('Cache-Control', 'no-store')
  res.json(response)
})

app.get('/api/stats', (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json(getStats())
})

const distPath = path.resolve(process.cwd(), 'dist')
const indexPath = path.join(distPath, 'index.html')

if (existsSync(indexPath)) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      next()
      return
    }
    res.sendFile(indexPath)
  })
}

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[reporace]', error)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(port, () => {
  console.log(`RepoRace API listening on http://localhost:${port}`)
})
