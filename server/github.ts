import { execFileSync } from 'node:child_process'
import type { RepoRecord } from './db.ts'

const GRAPHQL_URL = 'https://api.github.com/graphql'

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
  pushedAt: string
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

async function graphql<T>(query: string, variables: Record<string, string>): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${getGitHubToken()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'reporace',
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(25_000),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`GitHub GraphQL ${response.status}: ${body.slice(0, 300)}`)
  }

  const payload = (await response.json()) as GraphQLResponse
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '))
  }
  if (!payload.data) {
    throw new Error('GitHub GraphQL returned no data')
  }
  return payload.data as T
}

export async function fetchRepo(fullName: string): Promise<RepoRecord> {
  const [owner, name] = fullName.split('/')
  if (!owner || !name) {
    throw new Error(`Invalid repository name: ${fullName}`)
  }

  const data = await graphql<{ repository: GraphQLRepository | null }>(REPO_QUERY, {
    owner,
    name,
  })

  const repo = data.repository
  if (!repo) {
    throw new Error(`Repository not found: ${fullName}`)
  }

  const now = new Date().toISOString()

  return {
    id: repo.databaseId ?? hashId(repo.nameWithOwner),
    owner,
    name,
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
