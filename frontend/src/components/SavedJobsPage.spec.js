import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { clearSavedJobs } from '../composables/useSavedJobs'
import { createTestRouter } from '../test/router'
import SavedJobsPage from './SavedJobsPage.vue'

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))

describe('SavedJobsPage', () => {
  beforeEach(() => {
    clearSavedJobs()
    vi.clearAllMocks()
    api.delete.mockResolvedValue({ status: 204 })
  })

  it('lists server-saved jobs with a disabled saved state', async () => {
    const jobs = {
      'job-1': { id: 'job-1', title: 'Cashier', workplaceName: 'Local Shop', description: 'Help customers' },
      'job-2': { id: 'job-2', title: 'Cook', workplaceName: 'Corner Cafe', description: 'Prepare meals' },
    }
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/work/saved-jobs'
        ? ['job-1', 'job-2']
        : url === '/work/saved-jobs/paged'
          ? { items: Object.values(jobs), page: 1, pageSize: 6, totalCount: 2, totalPages: 1 }
          : [],
    }))
    const router = createTestRouter()
    await router.push('/work/saved-jobs')
    const wrapper = mount(SavedJobsPage, {
      global: { plugins: [router], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Saved jobs')
    expect(wrapper.findAll('.worker-job-row')).toHaveLength(2)
    expect(wrapper.findAll('.worker-job-row__save').every((button) => button.text() === 'Saved job')).toBe(true)
    expect(wrapper.findAll('.worker-job-row__save').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    expect(api.delete).not.toHaveBeenCalled()
    expect(api.get).toHaveBeenCalledWith('/work/saved-jobs/paged', {
      params: { page: 1, pageSize: 6 },
    })
  })
})
