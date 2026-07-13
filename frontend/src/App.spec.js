import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'
import { isAuthenticated } from './api'
import confetti from 'canvas-confetti'
import { createTestRouter } from './test/router'

vi.mock('gsap', () => ({
  gsap: {
    context: vi.fn((callback) => {
      callback()
      return { revert: vi.fn() }
    }),
    from: vi.fn(),
    registerPlugin: vi.fn(),
  },
}))

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { getAll: vi.fn(() => []) },
}))

vi.mock('./api', () => ({
  clearAuth: vi.fn(),
  isAuthenticated: vi.fn(),
}))

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

function mountAppWithAuthMode(mode) {
  return mount(App, {
    global: {
      plugins: [createTestRouter()],
      stubs: {
        AppDashboard: { template: '<div class="fake-dashboard" />' },
        AuthModal: {
          emits: ['close', 'success'],
          template: `<button class="fake-auth" @click="$emit('success', { mode: '${mode}' })">auth</button>`,
        },
        BrandLogo: true,
        NetworkBackground: true,
      },
    },
  })
}

describe('App signup confetti', () => {
  beforeEach(() => {
    isAuthenticated.mockResolvedValue(false)
    confetti.mockClear()
  })

  it('runs Preline confetti after signup success', async () => {
    const wrapper = mountAppWithAuthMode('register')

    await flushPromises()
    await wrapper.find('.btn--primary').trigger('click')
    await wrapper.find('.fake-auth').trigger('click')

    expect(confetti).toHaveBeenCalledTimes(4)
    expect(confetti).toHaveBeenNthCalledWith(1, { particleCount: 25, spread: 70, angle: 315, origin: { x: 0, y: 0 } })
    expect(confetti).toHaveBeenNthCalledWith(2, { particleCount: 25, spread: 70, angle: 225, origin: { x: 1, y: 0 } })
    expect(confetti).toHaveBeenNthCalledWith(3, { particleCount: 25, spread: 70, angle: 45, origin: { x: 0, y: 1 } })
    expect(confetti).toHaveBeenNthCalledWith(4, { particleCount: 25, spread: 70, angle: 135, origin: { x: 1, y: 1 } })
    wrapper.unmount()
  })

  it('skips confetti after login success', async () => {
    const wrapper = mountAppWithAuthMode('login')

    await flushPromises()
    await wrapper.find('.btn--primary').trigger('click')
    await wrapper.find('.fake-auth').trigger('click')

    expect(confetti).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('opens the auth modal from the CTA email form', async () => {
    const wrapper = mountAppWithAuthMode('register')

    await flushPromises()
    await wrapper.find('.cta-input').setValue('cta@example.com')
    await wrapper.find('.cta-form').trigger('submit')

    expect(wrapper.find('.fake-auth').exists()).toBe(true)
    wrapper.unmount()
  })
})
