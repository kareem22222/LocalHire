import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./jobs.js', () => ({
  getSavedCandidates: vi.fn(() => Promise.resolve({ data: [] })),
  saveCandidate: vi.fn(() => Promise.resolve()),
  removeSavedCandidate: vi.fn(() => Promise.resolve()),
  getSavedJobs: vi.fn(() => Promise.resolve({ data: [] })),
  saveJob: vi.fn(() => Promise.resolve()),
  removeSavedJob: vi.fn(() => Promise.resolve()),
}))

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

  it('clears account-scoped browser state on clearAuth', async () => {
    const { useSavedCandidates } = await import('../composables/useSavedCandidates.js')
    const { useSavedJobs } = await import('../composables/useSavedJobs.js')
    const { setAuth, clearAuth } = await import('./index.js')
    const candidates = useSavedCandidates()
    const jobs = useSavedJobs()
    await Promise.all([candidates.load(), jobs.load()])
    setAuth('token-123')
    await candidates.add('candidate-1')
    await jobs.toggle('job-1')
    localStorage.setItem('dashboard_tab', 'profile')
    window.history.replaceState({}, '', '/hiring/roles')
    clearAuth()
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
    expect(candidates.isSaved('candidate-1')).toBe(false)
    expect(jobs.isSaved('job-1')).toBe(false)
    expect(localStorage.getItem('dashboard_tab')).toBeNull()
    expect(window.location.pathname).toBe('/')
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

  it('lets Axios choose the content type for JSON and multipart requests', async () => {
    const api = (await import('./index.js')).default

    expect(api.defaults.headers['Content-Type']).toBeUndefined()
  })
})
