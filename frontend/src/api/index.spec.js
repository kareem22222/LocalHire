import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const TOKEN_STORAGE_KEY = 'localhire.accessToken'

describe('api auth persistence', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('persists the token to localStorage on setAuth', async () => {
    const { setAuth } = await import('./index.js')
    setAuth('token-123')
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('token-123')
  })

  it('removes the token from localStorage on clearAuth', async () => {
    const { setAuth, clearAuth } = await import('./index.js')
    setAuth('token-123')
    clearAuth()
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('rehydrates the token from localStorage on module load (simulates refresh)', async () => {
    // Simulate a token saved before a page refresh.
    localStorage.setItem(TOKEN_STORAGE_KEY, 'persisted-token')

    // Re-import the module as a fresh page load would.
    vi.resetModules()
    const freshApi = (await import('./index.js')).default

    const config = await freshApi.interceptors.request.handlers[0].fulfilled({ headers: {} })
    expect(config.headers.Authorization).toBe('Bearer persisted-token')
  })

  it('does not authenticate when no token is stored', async () => {
    const { isAuthenticated } = await import('./index.js')
    await expect(isAuthenticated()).resolves.toBe(false)
  })
})
