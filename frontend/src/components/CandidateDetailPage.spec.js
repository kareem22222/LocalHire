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
    expect(wrapper.text()).toContain('1990')
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
    await wrapper.findAll('.candidate-detail__actions button')[1].trigger('click')
    expect(wrapper.text()).toContain('worker@example.com')
    expect(wrapper.text()).toContain('unknown')

    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2)
    const back = vi.spyOn(router, 'back').mockImplementation(() => {})
    await wrapper.find('.dash-header button').trigger('click')
    expect(back).toHaveBeenCalled()
  })
})
