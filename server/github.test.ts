import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchRepo, fetchRepos, GitHubRateLimitError } from './github.ts'

// Repository-name validation runs before any network call, so these tests
// never need a token or reach GitHub. The GraphQL fakes below stub fetch
// entirely; the token check only needs a value for the Authorization header.
process.env.GITHUB_TOKEN ??= 'test-token'

test('fetchRepo rejects single-token names before touching the network', async () => {
  await assert.rejects(fetchRepo('justname'), /Invalid repository name: justname/)
})

test('fetchRepo rejects names with extra path segments', async () => {
  await assert.rejects(fetchRepo('owner/name/extra'), /Invalid repository name/)
})

test('fetchRepo rejects empty owner or name segments', async () => {
  await assert.rejects(fetchRepo('/leading'), /Invalid repository name/)
  await assert.rejects(fetchRepo('trailing/'), /Invalid repository name/)
  await assert.rejects(fetchRepo('/'), /Invalid repository name/)
})

// --- GraphQL fakes ---------------------------------------------------------

function repositoryPayload(): string {
  return JSON.stringify({
    data: {
      repository: {
        databaseId: 123,
        nameWithOwner: 'owner/name',
        description: 'A test repository',
        stargazerCount: 10,
        forkCount: 1,
        issues: { totalCount: 2 },
        primaryLanguage: { name: 'TypeScript' },
        createdAt: '2024-01-01T00:00:00.000Z',
        pushedAt: null,
        owner: { avatarUrl: 'https://example.com/avatar.png' },
        url: 'https://github.com/owner/name',
        repositoryTopics: { nodes: [] },
      },
    },
  })
}

function jsonResponse(body: string): Response {
  return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } })
}

function rateLimitedResponse(): Response {
  return new Response('API rate limit exceeded', {
    status: 403,
    headers: {
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 1500),
    },
  })
}

// Swaps in a canned response sequence (the last one repeats) and restores the
// real fetch afterwards. Resolves to how many calls the run made.
async function withFetchSequence(
  responses: Response[],
  run: () => Promise<unknown>,
): Promise<number> {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    const response = responses[Math.min(calls, responses.length - 1)]
    calls += 1
    return response
  }
  try {
    await run()
    return calls
  } finally {
    globalThis.fetch = original
  }
}

test('an exhausted rate limit fails fatally and names the reset time', async () => {
  const calls = await withFetchSequence([rateLimitedResponse()], async () => {
    await assert.rejects(fetchRepo('owner/name'), (error: unknown) => {
      assert.ok(error instanceof GitHubRateLimitError)
      assert.equal(error.name, 'GitHubRateLimitError')
      assert.match(error.message, /rate limit/i)
      assert.match(error.message, /UTC/)
      assert.match(error.message, /min from now/)
      return true
    })
  })
  assert.equal(calls, 1)
})

test('a rate limit aborts fetchRepos instead of skipping every repo', async () => {
  await withFetchSequence([rateLimitedResponse()], async () => {
    await assert.rejects(fetchRepos(['owner/name', 'other/repo']), GitHubRateLimitError)
  })
})

test('a transient server error retries once and then succeeds', async () => {
  const calls = await withFetchSequence(
    [new Response('upstream error', { status: 502 }), jsonResponse(repositoryPayload())],
    async () => {
      const repo = await fetchRepo('owner/name')
      assert.equal(repo.fullName, 'owner/name')
      assert.equal(repo.stars, 10)
    },
  )
  assert.equal(calls, 2)
})

test('GraphQL errors beside usable repository data do not discard the data', async () => {
  const partial = JSON.stringify({
    data: JSON.parse(repositoryPayload()).data,
    errors: [{ message: 'Could not resolve to a Branch' }],
  })

  await withFetchSequence([jsonResponse(partial)], async () => {
    const repo = await fetchRepo('owner/name')
    assert.equal(repo.fullName, 'owner/name')
    assert.equal(repo.stars, 10)
  })
})

test('GraphQL errors without repository data still throw', async () => {
  const errorsOnly = JSON.stringify({
    errors: [{ message: 'Could not resolve to a Repository with the name owner/name' }],
  })

  await withFetchSequence([jsonResponse(errorsOnly)], async () => {
    await assert.rejects(fetchRepo('owner/name'), /Could not resolve to a Repository/)
  })
})
