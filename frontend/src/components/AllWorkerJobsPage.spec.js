import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { clearSavedJobs } from '../composables/useSavedJobs'
import { useJobsStore } from '../stores/jobs'
import { createTestRouter } from '../test/router'
import AllWorkerJobsPage from './AllWorkerJobsPage.vue'

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('../utils/minimumDelay', () => ({ withMinimumDelay: (task) => task() }))

describe('AllWorkerJobsPage', () => {
  beforeEach(() => {
    clearSavedJobs()
    api.get.mockReset()
    api.post.mockReset()
    api.delete.mockReset()
    api.post.mockResolvedValue({ data: {} })
  })

  it('paginates worker jobs and keeps the apply action', async () => {
    const jobs = Array.from({ length: 7 }, (_, index) => ({
      id: `job-${index}`,
      title: `Role ${index}`,
      workplaceName: 'Local Shop',
      description: 'Help customers',
    }))
    api.get.mockImplementation((url, options = {}) => {
      if (url === '/auth/me') return Promise.resolve({ data: {} })
      if (url === '/work/jobs/search') {
        const page = options.params.page
        const items = jobs.slice((page - 1) * 6, page * 6)
        return Promise.resolve({ data: { items, page, pageSize: 6, totalCount: 7, totalPages: 2 } })
      }
      return Promise.resolve({ data: [] })
    })
    const router = createTestRouter()
    await router.push('/work/jobs')
    const wrapper = mount(AllWorkerJobsPage, {
      global: { plugins: [router], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    expect(wrapper.findAll('.worker-job-row')).toHaveLength(6)
    expect(api.get).toHaveBeenCalledWith('/work/jobs/search', {
      params: { page: 1, pageSize: 6 },
    })
    expect(wrapper.text()).toContain('Page 1 of 2')
    await wrapper.find('[aria-label="Page 2 of 2"]').trigger('click')
    await flushPromises()
    expect(api.get).toHaveBeenCalledWith('/work/jobs/search', {
      params: { page: 2, pageSize: 6 },
    })
    expect(useJobsStore().workerJobsPage.items).toHaveLength(1)
    expect(wrapper.findAll('.worker-job-row')).toHaveLength(1)
    expect(wrapper.text()).toContain('Page 2 of 2')

    await wrapper.findAll('button').find((button) => button.text() === 'Save job').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/work/saved-jobs/job-6')

    await wrapper.findAll('button').find((button) => button.text() === 'Apply now').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/work/jobs/job-6/apply')
  })
})
