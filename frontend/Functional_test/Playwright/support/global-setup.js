import { request } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.playwright')
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080'

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
