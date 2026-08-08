import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { clearSavedCandidates } from '../composables/useSavedCandidates'
import { createTestRouter } from '../test/router'
import SavedCandidatesPage from './SavedCandidatesPage.vue'

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))

describe('SavedCandidatesPage', () => {
  beforeEach(() => {
    clearSavedCandidates()
    vi.clearAllMocks()
  })

  it('lists server-saved candidates with a disabled saved state', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/hiring/saved-candidates'
        ? ['candidate-1']
        : { items: [{ id: 'candidate-1', name: 'Ravi Kumar', role: 'Cashier', area: 'Bandra' }], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 },
    }))
    const router = createTestRouter()
    await router.push('/hiring/saved-candidates')
    const wrapper = mount(SavedCandidatesPage, {
      global: { plugins: [router], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Saved candidates')
    expect(wrapper.findAll('.candidate-card')).toHaveLength(1)
    const savedButton = wrapper.findAll('.candidate-actions button').find((button) => button.text() === 'Saved candidate')
    expect(savedButton.attributes('disabled')).toBeDefined()
    expect(api.get).toHaveBeenCalledWith('/hiring/saved-candidates/paged', {
      params: { page: 1, pageSize: 10 },
    })
  })
})
