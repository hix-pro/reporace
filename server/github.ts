import { execFileSync } from 'node:child_process'
import type { RepoRecord } from './db.ts'

const GRAPHQL_URL = 'https://api.github.com/graphql'

// Delay before the single retry for transient server errors.
const RETRY_DELAY_MS = 2_000

const REPO_QUERY = `
  query Repo($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      databaseId
      nameWithOwner
      description
      stargazerCount
      forkCount
      issues(states: OPEN) {
        totalCount
      }
      primaryLanguage {
        name
      }
      createdAt
      pushedAt
      owner {
        avatarUrl
      }
      url
      repositoryTopics(first: 12) {
        nodes {
          topic {
            name
          }
        }
      }
    }
  }
`

interface GraphQLRepository {
  databaseId: number | null
  nameWithOwner: string
  description: string | null
  stargazerCount: number
  forkCount: number
  issues: { totalCount: number }
  primaryLanguage: { name: string } | null
  createdAt: string
  pushedAt: string | null
  owner: { avatarUrl: string }
  url: string
  repositoryTopics: { nodes: { topic: { name: string } }[] }
}

interface GraphQLResponse {
  data?: { repository: GraphQLRepository | null }
  errors?: { message: string }[]
}

function hashId(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

let cachedToken: string | null = null

export function getGitHubToken(): string {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  if (cachedToken) return cachedToken

  try {
    cachedToken = execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (cachedToken) return cachedToken
  } catch {
    // fall through
  }

  throw new Error(
    'No GitHub token found. Set GITHUB_TOKEN in .env, or run `gh auth login` so `gh auth token` works.',
  )
}

export class GitHubRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitHubRateLimitError'
  }
}

function rateLimitReset(resetHeader: string | null): string {
  const resetSeconds = Number(resetHeader)
  if (!Number.isFinite(resetSeconds) || resetSeconds <= 0) return 'at an unknown time'
  const resetAt = new Date(resetSeconds * 1000)
  const minutes = Math.max(0, Math.round((resetAt.getTime() - Date.now()) / 60_000))
  return `at ${resetAt.toISOString().slice(11, 16)} UTC (~${minutes} min from now)`
}

function isRateLimited(status: number, headers: Headers, body: string): boolean {
  if (status !== 403 && status !== 429) return false
  if (headers.get('x-ratelimit-remaining') === '0') return true
  return body.toLowerCase().includes('rate limit')
}

async function postGraphQL(query: string, variables: Record<string, string>): Promise<Response> {
  return fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${getGitHubToken()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'reporace',
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(25_000),
  })
}

async function graphql<T>(query: string, variables: Record<string, string>): Promise<T> {
  let response = await postGraphQL(query, variables)

  // Transient server errors get one retry before the repo is skipped.
  if (response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    response = await postGraphQL(query, variables)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    if (isRateLimited(response.status, response.headers, body)) {
      // A rate limit is a run-level failure, not a per-repo one: callers abort
      // the whole run instead of skipping every repo and calling it a snapshot.
      throw new GitHubRateLimitError(
        `GitHub rate limit exhausted (HTTP ${response.status}), resets ${rateLimitReset(response.headers.get('x-ratelimit-reset'))}. Run aborted; existing data is untouched.`,
      )
    }
    throw new Error(`GitHub GraphQL ${response.status}: ${body.slice(0, 300)}`)
  }

  const payload = (await response.json()) as GraphQLResponse
  // GraphQL can return errors beside usable data. A repository in the payload
  // still wins; only a missing one makes the response useless.
  if (!payload.data?.repository && payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '))
  }
  if (!payload.data) {
    throw new Error('GitHub GraphQL returned no data')
  }
  return payload.data as T
}

export async function fetchRepo(fullName: string): Promise<RepoRecord> {
  const parts = fullName.split('/')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repository name: ${fullName}`)
  }
  const [owner, name] = parts

  const data = await graphql<{ repository: GraphQLRepository | null }>(REPO_QUERY, {
    owner,
    name,
  })

  const repo = data.repository
  if (!repo) {
    throw new Error(`Repository not found: ${fullName}`)
  }

  // The API resolves renames to the canonical name. Store and return that name,
  // otherwise the detail route and repo row disagree after a repository rename.
  const canonicalParts = repo.nameWithOwner.split('/')
  if (canonicalParts.length !== 2 || !canonicalParts[0] || !canonicalParts[1]) {
    throw new Error(`GitHub returned an invalid repository name: ${repo.nameWithOwner}`)
  }
  const [canonicalOwner, canonicalName] = canonicalParts

  const now = new Date().toISOString()

  return {
    id: repo.databaseId ?? hashId(repo.nameWithOwner),
    owner: canonicalOwner,
    name: canonicalName,
    fullName: repo.nameWithOwner,
    description: repo.description,
    language: repo.primaryLanguage?.name ?? null,
    stars: repo.stargazerCount,
    forks: repo.forkCount,
    openIssues: repo.issues.totalCount,
    createdAt: repo.createdAt,
    pushedAt: repo.pushedAt,
    avatarUrl: repo.owner.avatarUrl,
    htmlUrl: repo.url,
    topics: repo.repositoryTopics.nodes.map((node) => node.topic.name),
    updatedAt: now,
  }
}

export async function fetchRepos(
  fullNames: string[],
  concurrency = 5,
): Promise<{ repos: RepoRecord[]; skipped: { fullName: string; reason: string }[] }> {
  const repos: RepoRecord[] = []
  const skipped: { fullName: string; reason: string }[] = []

  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, fullNames.length) }, async () => {
    while (cursor < fullNames.length) {
      const index = cursor
      cursor += 1
      const fullName = fullNames[index]

      try {
        repos.push(await fetchRepo(fullName))
      } catch (error) {
        // A rate limit fails the whole run so the caller exits 1 with existing
        // data untouched, instead of producing a mostly-empty snapshot.
        if (error instanceof GitHubRateLimitError) throw error
        skipped.push({
          fullName,
          reason: error instanceof Error ? error.message : String(error),
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  })

  await Promise.all(workers)
  return { repos, skipped }
}
