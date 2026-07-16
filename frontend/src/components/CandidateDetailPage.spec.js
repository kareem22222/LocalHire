import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { createTestRouter } from '../test/router'
import CandidateDetailPage from './CandidateDetailPage.vue'

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

let router

async function mountPage(location = '/hiring/candidates/candidate-1') {
  router = createTestRouter()
  router.push(location)
  await router.isReady()
  return mount(CandidateDetailPage, {
    global: { plugins: [router], stubs: { BrandLogo: true } },
  })
}

describe('CandidateDetailPage', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  it('renders candidate details and exposes contact and shortlist actions', async () => {
    api.get.mockResolvedValue({
      data: {
        id: 'candidate-1',
        name: 'Ananya Rao',
        email: 'ananya@example.com',
        role: 'Cashier',
        gender: 'Female',
        dateOfBirth: '1990-01-02',
        addressLine: '12 Market Road',
        area: 'Bandra',
        state: 'Maharashtra',
        pincode: '400050',
        createdAt: '2025-01-01T00:00:00Z',
      },
    })
    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.find('.candidate-detail__avatar').text()).toBe('AR')
    expect(wrapper.text()).toContain('Bandra, Maharashtra - 400050')
    expect(wrapper.text()).toContain(new Date(1990, 0, 2).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }))
    expect(wrapper.text()).not.toContain('ananya@example.com')

    const buttons = wrapper.findAll('.candidate-detail__actions button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('ananya@example.com')
  })

  it('reloads on route changes, reports failures, and navigates back', async () => {
    api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      data: { id: 'candidate-2', name: '', email: 'worker@example.com', dateOfBirth: 'unknown' },
    })
    const wrapper = await mountPage()
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('could not load')

    await router.push('/hiring/candidates/candidate-2?contact=1')
    await flushPromises()
    expect(wrapper.text()).toContain('worker@example.com')
    expect(wrapper.text()).toContain('unknown')

    await router.push('/hiring/candidates/candidate-2')
    await flushPromises()
    expect(wrapper.text()).not.toContain('worker@example.com')

    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2)
    const back = vi.spyOn(router, 'back').mockImplementation(() => {})
    await wrapper.find('.dash-header button').trigger('click')
    expect(back).toHaveBeenCalled()
  })

  it('ignores an obsolete request after the route changes', async () => {
    const requests = {}
    api.get.mockImplementation((url) => new Promise((resolve, reject) => {
      requests[url] = { resolve, reject }
    }))
    const wrapper = await mountPage()
    await flushPromises()

    await router.push('/hiring/candidates/candidate-2')
    await flushPromises()
    expect(wrapper.find('.candidate-detail__hero').exists()).toBe(false)

    requests['/hiring/candidates/candidate-2'].resolve({
      data: { id: 'candidate-2', name: 'Latest Candidate', email: 'latest@example.com' },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Latest Candidate')

    requests['/hiring/candidates/candidate-1'].reject(new Error('stale failure'))
    await flushPromises()
    expect(wrapper.text()).toContain('Latest Candidate')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
