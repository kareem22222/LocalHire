import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { clearSavedJobs } from '../composables/useSavedJobs'
import { createTestRouter } from '../test/router'
import WorkerJobDetailPage from './WorkerJobDetailPage.vue'

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const job = {
  id: 'job-1', title: 'Cashier', description: 'Handle billing', workplaceName: 'Corner Shop',
  cityArea: 'Bandra', state: 'Maharashtra', pincode: '400050', employmentType: 'FullTime',
  salaryMin: 15000, salaryMax: 25000, salaryPeriod: 'Monthly', minEducation: '10th pass',
  experienceMinYears: 1, experienceMaxYears: 2, workingDays: 'Mon-Sat', openings: 2,
  requiredSkills: ['Billing'], languages: ['Hindi'], benefits: ['PF'],
}

describe('WorkerJobDetailPage', () => {
  beforeEach(() => {
    clearSavedJobs()
    api.get.mockReset()
    api.post.mockReset()
    api.delete.mockReset()
    api.get.mockImplementation((url) => Promise.resolve({ data: url === '/work/jobs/job-1' ? job : [] }))
    api.post.mockResolvedValue({ data: {} })
  })

  it('shows full job details and applies from the detail page', async () => {
    const wrapper = mount(WorkerJobDetailPage, {
      props: { id: 'job-1' },
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Handle billing')
    expect(wrapper.text()).toContain('10th pass')
    expect(wrapper.text()).toContain('Billing')
    expect(wrapper.text()).toContain('PF')

    await wrapper.findAll('button').find((button) => button.text() === 'Save job').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/work/saved-jobs/job-1')
    expect(wrapper.findAll('button').find((button) => button.text() === 'Saved job').attributes('disabled')).toBeDefined()

    await wrapper.findAll('button').find((button) => button.text() === 'Apply now').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/work/jobs/job-1/apply')
  })

  it('shows API and fallback apply failures', async () => {
    api.post
      .mockRejectedValueOnce({ response: { data: { message: 'Applications closed.' } } })
      .mockRejectedValueOnce(new Error('offline'))
    const wrapper = mount(WorkerJobDetailPage, {
      props: { id: 'job-1' },
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    const apply = () => wrapper.findAll('button').find((item) => item.text() === 'Apply now')
    await apply().trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Applications closed.')

    await apply().trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Could not apply')
  })

  it('keeps the applied state when refreshing applications fails', async () => {
    let applicationLoads = 0
    api.get.mockImplementation((url) => {
      if (url === '/work/jobs/job-1') return Promise.resolve({ data: job })
      if (url === '/work/saved-jobs') return Promise.resolve({ data: [] })
      applicationLoads += 1
      return applicationLoads === 1
        ? Promise.resolve({ data: [] })
        : Promise.reject(new Error('refresh failed'))
    })
    const wrapper = mount(WorkerJobDetailPage, {
      props: { id: 'job-1' },
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text() === 'Apply now').trigger('click')
    await flushPromises()

    const appliedButton = wrapper.findAll('button').find((button) => button.text() === 'Applied')
    expect(appliedButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Application status: Applied')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('shows an existing application and routes without duplicate account actions', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/work/jobs/job-1' ? job : [{ jobPostId: 'job-1', status: 'Shortlisted' }],
    }))
    const router = createTestRouter()
    const push = vi.spyOn(router, 'push')
    const wrapper = mount(WorkerJobDetailPage, {
      props: { id: 'job-1' },
      global: { plugins: [router], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Application status: Shortlisted')
    expect(wrapper.findAll('button').find((item) => item.text() === 'Applied').attributes('disabled')).toBeDefined()
    await wrapper.findAll('button').find((item) => item.text() === 'Back').trigger('click')
    expect(push).toHaveBeenCalledWith('/')
    expect(wrapper.text()).not.toContain('Sign out')
  })

  it('shows unavailable jobs and returns to the dashboard', async () => {
    api.get.mockRejectedValue(new Error('gone'))
    const router = createTestRouter()
    const push = vi.spyOn(router, 'push')
    const wrapper = mount(WorkerJobDetailPage, {
      props: { id: 'job-1' },
      global: { plugins: [router], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Job unavailable')
    await wrapper.findAll('button').find((item) => item.text() === 'Back to jobs').trigger('click')
    expect(push).toHaveBeenCalledWith('/')
  })
})
