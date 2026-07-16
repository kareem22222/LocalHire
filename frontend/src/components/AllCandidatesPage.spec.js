import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AllCandidatesPage from './AllCandidatesPage.vue'
import api from '../api'
import { createTestRouter } from '../test/router'

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

let router

async function mountPage(query = {}) {
  router = createTestRouter()
  router.push({ path: '/hiring/candidates', query })
  await router.isReady()
  return mount(AllCandidatesPage, {
    global: {
      plugins: [router],
      stubs: { BrandLogo: true },
    },
  })
}

function findButtonByText(wrapper, text) {
  return wrapper.findAll('button').find((button) => button.text() === text)
}

describe('AllCandidatesPage', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.get.mockResolvedValue({ data: [] })
  })

  it('loads candidates with the employer coordinates and query filters', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({ data: { latitude: 12.97, longitude: 77.64 } })
      }
      return Promise.resolve({
        data: [
          { id: 1, name: 'Ravi', role: 'Cashier', area: 'Indiranagar', state: 'Karnataka', pincode: '560038', distanceKm: 2, matchScore: 95 },
        ],
      })
    })

    const wrapper = await mountPage({ search: '560038', role: 'Cashier' })
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/hiring/candidates/nearby', {
      params: { lat: 12.97, lng: 77.64, search: '560038', role: 'Cashier' },
    })
    expect(wrapper.findAll('.candidate-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('Ravi')
    expect(wrapper.text()).toContain('1 results')
    // Heading reflects the active filters.
    expect(wrapper.text()).toContain('Cashier')
    expect(wrapper.text()).toContain('560038')
  })

  it('requests without coordinates when the profile has none and shows the empty state', async () => {
    const wrapper = await mountPage({ search: 'zzz' })
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/hiring/candidates/nearby', { params: { search: 'zzz' } })
    expect(wrapper.findAll('.candidate-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('No talent found')
  })

  it('shows the full result count while rendering at most ten candidates', async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      id: index,
      name: `Worker ${index}`,
      role: 'Cashier',
      matchScore: 90,
    }))
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? {} : candidates,
    }))

    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.findAll('.candidate-card')).toHaveLength(10)
    expect(wrapper.text()).toContain('12 results')
  })

  it('navigates back to the dashboard', async () => {
    const wrapper = await mountPage()
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    await findButtonByText(wrapper, 'Back to dashboard').trigger('click')

    expect(push).toHaveBeenCalledWith('/')
  })

  it('opens, contacts, and saves a candidate', async () => {
    const candidate = { id: 'candidate-1', name: 'Ravi', role: 'Cashier' }
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? {} : [candidate],
    }))
    const wrapper = await mountPage()
    await flushPromises()
    const push = vi.spyOn(router, 'push').mockResolvedValue()

    await wrapper.find('.candidate-card').trigger('click')
    await wrapper.find('.candidate-actions__ghost').trigger('click')
    await wrapper.find('.candidate-actions button').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'candidate-detail', params: { id: candidate.id } })
    expect(push).toHaveBeenCalledWith({
      name: 'candidate-detail',
      params: { id: candidate.id },
      query: { contact: '1' },
    })
    expect(wrapper.find('.candidate-actions button').attributes('disabled')).toBeDefined()
  })
})
