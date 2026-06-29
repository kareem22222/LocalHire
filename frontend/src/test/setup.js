import { afterEach, beforeEach, vi } from 'vitest'

const originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation')

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition: vi.fn() },
    configurable: true,
  })
})

afterEach(async () => {
  if (typeof localStorage.clear === 'function') {
    localStorage.clear()
  }
  const { clearAuth } = await vi.importActual('../api')
  clearAuth()
  vi.restoreAllMocks()
  if (originalGeolocation) {
    Object.defineProperty(navigator, 'geolocation', originalGeolocation)
  } else {
    delete navigator.geolocation
  }
  vi.unstubAllGlobals()
})
