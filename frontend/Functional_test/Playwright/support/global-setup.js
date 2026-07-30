import { request } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.playwright')
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4174'
// Tokens live 60 minutes. Reusing one that is about to expire makes every later
// test render the signed-out landing page, so only reuse a token with enough
// life left to cover a whole run.
const MINIMUM_TOKEN_LIFETIME_MS = 30 * 60 * 1000

function expiresSoon(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    if (!payload.exp) return true
    return payload.exp * 1000 - Date.now() < MINIMUM_TOKEN_LIFETIME_MS
  } catch {
    return true
  }
}

async function savedToken(file) {
  try {
    const state = JSON.parse(await readFile(file, 'utf8'))
    return state.origins?.flatMap((origin) => origin.localStorage || [])
      .find((item) => item.name === 'localhire.accessToken')?.value
  } catch {
    return null
  }
}

async function writeRoleState(api, role, file) {
  let token = await savedToken(file)
  if (token && expiresSoon(token)) token = null
  if (token) {
    const response = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok()) token = null
  }

  if (!token) {
    const response = await api.post('/api/auth/login', {
      data: { email: 'demo@localhire.test', password: 'LocalHire1!', role },
    })
    if (!response.ok()) {
      throw new Error(`Could not prepare ${role} browser tests: ${response.status()} ${await response.text()}`)
    }
    token = (await response.json()).token
  }

  await writeFile(file, JSON.stringify({
    cookies: [],
    origins: [{
      origin: new URL(baseURL).origin,
      localStorage: [{ name: 'localhire.accessToken', value: token }],
    }],
  }))
}

export default async function globalSetup() {
  await mkdir(directory, { recursive: true })
  const api = await request.newContext({ baseURL })
  try {
    await writeRoleState(api, 'Hiring', path.join(directory, 'hiring.json'))
    await writeRoleState(api, 'LookingForWork', path.join(directory, 'working.json'))
  } finally {
    await api.dispose()
  }
}
