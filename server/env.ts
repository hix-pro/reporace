import { existsSync } from 'node:fs'

if (existsSync('.env')) {
  try {
    process.loadEnvFile('.env')
  } catch {
    // .env is optional
  }
}
