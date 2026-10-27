import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchRepo } from './github.ts'

// Repository-name validation runs before any network call, so these tests
// never need a token or reach GitHub.
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
