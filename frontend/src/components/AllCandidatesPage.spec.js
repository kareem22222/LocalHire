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
vi.mock('../utils/minimumDelay', () => ({ withMinimumDelay: (task) => task() }))

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
    api.get.mockImplementation((url, options = {}) => Promise.resolve({
      data: url === '/auth/me'
        ? {}
        : url === '/hiring/candidates/search'
          ? { items: [], page: options.params.page, pageSize: 10, totalCount: 0, totalPages: 0 }
          : [],
    }))
  })

  it('loads candidates with the employer coordinates and query filters', async () => {
    api.get.mockImplementation((url, options = {}) => {
      if (url === '/auth/me') {
        return Promise.resolve({ data: { latitude: 12.97, longitude: 77.64 } })
      }
      if (url === '/hiring/candidates/search') return Promise.resolve({
        data: { items: [
          { id: 1, name: 'Ravi', role: 'Cashier', area: 'Indiranagar', state: 'Karnataka', pincode: '560038', distanceKm: 2, matchScore: 95 },
        ], page: options.params.page, pageSize: 10, totalCount: 1, totalPages: 1 },
      })
      return Promise.resolve({ data: [] })
    })

    const wrapper = await mountPage({ search: '560038', role: 'Cashier' })
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/hiring/candidates/search', {
      params: { lat: 12.97, lng: 77.64, search: '560038', role: 'Cashier', page: 1, pageSize: 10 },
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

    expect(api.get).toHaveBeenCalledWith('/hiring/candidates/search', {
      params: { search: 'zzz', page: 1, pageSize: 10 },
    })
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
    api.get.mockImplementation((url, options = {}) => {
      if (url === '/auth/me') return Promise.resolve({ data: {} })
      if (url === '/hiring/candidates/search') {
        const page = options.params.page
        return Promise.resolve({ data: {
          items: candidates.slice((page - 1) * 10, page * 10),
          page, pageSize: 10, totalCount: 12, totalPages: 2,
        } })
      }
      return Promise.resolve({ data: [] })
    })

    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.findAll('.candidate-card')).toHaveLength(10)
    expect(wrapper.text()).toContain('12 results')
    expect(wrapper.text()).toContain('Page 1 of 2')
    await wrapper.find('[aria-label="Page 2 of 2"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.candidate-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('Page 2 of 2')
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
    api.get.mockImplementation((url, options = {}) => Promise.resolve({
      data: url === '/auth/me' ? {} : url === '/hiring/candidates/search'
        ? { items: [candidate], page: options.params.page, pageSize: 10, totalCount: 1, totalPages: 1 }
        : [],
    }))
    const wrapper = await mountPage()
    await flushPromises()
    const push = vi.spyOn(router, 'push').mockResolvedValue()

    await wrapper.find('.candidate-card__select').trigger('click')
    await wrapper.find('.candidate-actions__ghost').trigger('click')
    await wrapper.find('.candidate-actions button').trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'candidate-detail', params: { id: candidate.id } })
    expect(push).toHaveBeenCalledWith({
      name: 'candidate-detail',
      params: { id: candidate.id },
      query: { contact: '1' },
    })
    expect(wrapper.find('.candidate-actions button').attributes('disabled')).toBeDefined()
  })
})
