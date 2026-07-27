import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'
import { isAuthenticated } from './api'
import confetti from 'canvas-confetti'
import { createTestRouter } from './test/router'
import { logout } from './utils/session'

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
  default: { get: vi.fn(() => Promise.resolve({ data: { name: 'Pat', email: 'pat@example.com', role: 'Hiring' } })) },
  clearAuth: vi.fn(),
  isAuthenticated: vi.fn(),
}))

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

vi.mock('./utils/session', () => ({ logout: vi.fn() }))

function mountAppWithAuthMode(mode, router = createTestRouter()) {
  return mount(App, {
    global: {
      plugins: [createPinia(), router],
      stubs: {
        AppDashboard: { template: '<div class="fake-dashboard" />' },
        AuthModal: {
          emits: ['close', 'success'],
          template: `<button class="fake-auth" @click="$emit('success', { mode: '${mode}' })">auth</button>`,
        },
        BrandLogo: true,
        NetworkBackground: true,
        NotificationCenter: { template: '<div class="fake-notifications" />' },
        StaggeredMenu: {
          props: ['items', 'account'],
          emits: ['select'],
          template: `<div class="fake-menu"><button class="fake-menu-profile" @click="$emit('select', { action: 'profile' })">Profile</button><button class="fake-menu-logout" @click="$emit('select', { action: 'logout' })">Sign out</button></div>`,
        },
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
    await wrapper.find('.specular-button').trigger('click')
    await wrapper.find('.fake-auth').trigger('click')
    await flushPromises()

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
    await wrapper.find('.specular-button').trigger('click')
    await wrapper.find('.fake-auth').trigger('click')
    await flushPromises()

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

  it('replaces a stale role page with the dashboard before login completes', async () => {
    const router = createTestRouter()
    await router.push('/hiring/roles?page=2')
    const wrapper = mountAppWithAuthMode('login', router)
    await flushPromises()

    await wrapper.find('.specular-button').trigger('click')
    await wrapper.find('.fake-auth').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(wrapper.find('.fake-menu').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('App authenticated menu', () => {
  beforeEach(() => {
    isAuthenticated.mockResolvedValue(true)
    logout.mockClear()
  })

  it('routes profile and sign out actions from StaggeredMenu', async () => {
    const wrapper = mountAppWithAuthMode('login')
    await flushPromises()
    expect(wrapper.find('.fake-notifications').exists()).toBe(true)

    await wrapper.find('.fake-menu-profile').trigger('click')
    await flushPromises()
    expect(wrapper.vm.$route.query.tab).toBe('profile')

    await wrapper.find('.fake-menu-logout').trigger('click')
    expect(logout).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})

describe('App privacy policy', () => {
  beforeEach(() => {
    isAuthenticated.mockResolvedValue(false)
    vi.stubGlobal('scrollTo', vi.fn())
  })

  it('opens the privacy page from the footer and scrolls to the top', async () => {
    const wrapper = mountAppWithAuthMode('register')
    await flushPromises()

    // Landing shown, privacy hidden.
    expect(wrapper.find('.app-shell').exists()).toBe(true)
    expect(wrapper.find('.privacy-page').exists()).toBe(false)

    const privacyLink = wrapper.findAll('.footer-links a')[0]
    expect(privacyLink.text()).toBe('Privacy')
    await privacyLink.trigger('click')

    // Privacy page replaces the landing and the window is reset to the top.
    expect(wrapper.find('.privacy-page').exists()).toBe(true)
    expect(wrapper.find('.app-shell').exists()).toBe(false)
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
    wrapper.unmount()
  })

  it('returns to the top of the home page when Back is pressed', async () => {
    const wrapper = mountAppWithAuthMode('register')
    await flushPromises()

    await wrapper.findAll('.footer-links a')[0].trigger('click')
    expect(wrapper.find('.privacy-page').exists()).toBe(true)

    await wrapper.find('.back-btn').trigger('click')

    // Back to the landing, privacy hidden, scrolled to the top on both actions.
    expect(wrapper.find('.privacy-page').exists()).toBe(false)
    expect(wrapper.find('.app-shell').exists()).toBe(true)
    expect(window.scrollTo).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})
