import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logout } from './session'
import { clearAuth } from '../api'
import { clearSavedCandidates } from '../composables/useSavedCandidates'

vi.mock('../api', () => ({
  clearAuth: vi.fn(),
}))

vi.mock('../composables/useSavedCandidates', () => ({
  clearSavedCandidates: vi.fn(),
}))

describe('session.logout', () => {
  beforeEach(() => {
    clearAuth.mockReset()
    clearSavedCandidates.mockReset()
    // window.location.reload is not implemented in jsdom; replace with a spy.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: vi.fn() },
    })
  })

  it('clears auth and reloads the page', () => {
    logout()
    expect(clearSavedCandidates).toHaveBeenCalledTimes(1)
    expect(clearAuth).toHaveBeenCalledTimes(1)
    expect(window.location.reload).toHaveBeenCalledTimes(1)
  })
})
