import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition: vi.fn() },
    configurable: true,
  })
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})