import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { createTestRouter } from '../test/router'
import AppliedJobsPage from './AppliedJobsPage.vue'
import { logout } from '../utils/session'

vi.mock('../api', () => ({ default: { get: vi.fn() } }))
vi.mock('../utils/session', () => ({ logout: vi.fn() }))

describe('AppliedJobsPage', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.get.mockResolvedValue({ data: [{
      id: 'app-1', jobPostId: 'job-1', jobTitle: 'Cashier', workplaceName: 'Corner Shop',
      cityArea: 'Bandra', status: 'Shortlisted', createdAt: '2026-07-24T00:00:00Z',
    }] })
  })

  it('summarizes what happened to each application', async () => {
    const wrapper = mount(AppliedJobsPage, {
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Applied jobs')
    expect(wrapper.text()).toContain('Shortlisted')
    expect(wrapper.text()).toContain('The employer may contact you next.')
    expect(wrapper.find('.applied-card').element.tagName).toBe('A')
    expect(wrapper.find('.applied-card').attributes('href')).toBe('/work/jobs/job-1')
  })

  it('routes from all controls and signs out', async () => {
    const router = createTestRouter()
    const push = vi.spyOn(router, 'push')
    const wrapper = mount(AppliedJobsPage, {
      global: { plugins: [router], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    await wrapper.findAll('button').find((item) => item.text() === 'Looking for work').trigger('click')
    await wrapper.findAll('button').find((item) => item.text() === 'Back to jobs').trigger('click')
    await wrapper.find('.applied-card').trigger('click')
    await wrapper.findAll('button').find((item) => item.text() === 'Sign out').trigger('click')

    expect(push).toHaveBeenCalledWith('/')
    expect(push).toHaveBeenCalledWith({ name: 'worker-job-detail', params: { id: 'job-1' } })
    expect(logout).toHaveBeenCalled()
  })

  it('shows load failures and the empty state', async () => {
    api.get.mockRejectedValueOnce(new Error('offline'))
    const failed = mount(AppliedJobsPage, {
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()
    expect(failed.get('[role="alert"]').text()).toContain('Could not load')

    api.get.mockResolvedValueOnce({ data: [] })
    const empty = mount(AppliedJobsPage, {
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()
    expect(empty.text()).toContain('No applications yet')
  })

  it('counts hired applications and explains unknown statuses', async () => {
    api.get.mockResolvedValueOnce({ data: [{
      id: 'app-2', jobPostId: 'job-2', jobTitle: 'Helper', workplaceName: 'Workshop',
      cityArea: 'Mysuru', status: 'Hired', createdAt: '2026-07-24T00:00:00Z',
    }, {
      id: 'app-3', jobPostId: 'job-3', jobTitle: 'Driver', workplaceName: 'Courier',
      cityArea: 'Mysuru', status: 'Interview', createdAt: '2026-07-24T00:00:00Z',
    }] })
    const wrapper = mount(AppliedJobsPage, {
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('You were selected for this role.')
    expect(wrapper.text()).toContain('Your application status was updated.')
  })
})
