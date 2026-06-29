import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition: vi.fn() },
    configurable: true,
  })
})

afterEach(() => {
  if (typeof localStorage.clear === 'function') {
    localStorage.clear()
  }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
