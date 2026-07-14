import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, vi } from 'vitest'

const originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation')

beforeEach(() => {
  setActivePinia(createPinia())
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition: vi.fn() },
    configurable: true,
  })
})

afterEach(async () => {
  if (typeof localStorage.clear === 'function') {
    localStorage.clear()
  }
import { clearAuth } from '../api'

  }
  vi.restoreAllMocks()
  if (originalGeolocation) {
    Object.defineProperty(navigator, 'geolocation', originalGeolocation)
  } else {
    delete navigator.geolocation
  }
  vi.unstubAllGlobals()
})})
