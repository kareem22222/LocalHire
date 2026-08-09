import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { createTestRouter } from '../test/router'
import AppliedJobsPage from './AppliedJobsPage.vue'

vi.mock('../api', () => ({ default: { get: vi.fn() } }))

const page = (items, current = 1, totalCount = items.length, totalPages = totalCount ? Math.ceil(totalCount / 6) : 0, shortlistedCount = 0, hiredCount = 0) => ({
  items, page: current, pageSize: 6, totalCount, totalPages,
  shortlistedCount, hiredCount,
})

describe('AppliedJobsPage', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.get.mockResolvedValue({ data: page([{
      id: 'app-1', jobPostId: 'job-1', jobTitle: 'Cashier', workplaceName: 'Corner Shop',
      cityArea: 'Bandra', status: 'Shortlisted', createdAt: '2026-07-24T00:00:00Z',
      statusUpdatedAt: '2026-07-25T12:00:00Z',
    }], 1, 1, 1, 1, 0) })
  })

  it('summarizes what happened to each application', async () => {
    const wrapper = mount(AppliedJobsPage, {
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Applied jobs')
    expect(wrapper.text()).toContain('Shortlisted')
    expect(wrapper.text()).toContain('Updated 25 Jul 2026')
    expect(wrapper.text()).toContain('The employer may contact you next.')
    expect(wrapper.find('.applied-hero__visual').exists()).toBe(false)
    expect(wrapper.find('.applied-card').element.tagName).toBe('A')
    expect(wrapper.find('.applied-card').classes()).toContain('applied-card--shortlisted')
    expect(wrapper.find('.applied-card').attributes('href')).toBe('/work/jobs/job-1')
    expect(wrapper.get('progress').attributes('value')).toBe('64')
    expect(wrapper.text()).toContain('Shortlist reached')
  })

  it('routes from page controls without duplicating account actions', async () => {
    const router = createTestRouter()
    const push = vi.spyOn(router, 'push')
    const wrapper = mount(AppliedJobsPage, {
      global: { plugins: [router], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    await wrapper.find('.applied-outline').trigger('click')
    await wrapper.find('.applied-card').trigger('click')

    expect(push).toHaveBeenCalledWith('/')
    expect(push).toHaveBeenCalledWith({ name: 'worker-job-detail', params: { id: 'job-1' } })
    expect(wrapper.text()).not.toContain('Sign out')
  })

  it('shows load failures and the empty state', async () => {
    api.get.mockRejectedValueOnce(new Error('offline'))
    const failed = mount(AppliedJobsPage, {
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()
    expect(failed.get('[role="alert"]').text()).toContain('Could not load')
    expect(failed.text()).not.toContain('No applications yet')

    api.get.mockResolvedValueOnce({ data: page([]) })
    const empty = mount(AppliedJobsPage, {
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()
    expect(empty.text()).toContain('No applications yet')
  })

  it('counts hired applications and explains unknown statuses', async () => {
    api.get.mockResolvedValueOnce({ data: page([{
      id: 'app-2', jobPostId: 'job-2', jobTitle: 'Helper', workplaceName: 'Workshop',
      cityArea: 'Mysuru', status: 'Hired', createdAt: '2026-07-24T00:00:00Z',
    }, {
      id: 'app-3', jobPostId: 'job-3', jobTitle: 'Driver', workplaceName: 'Courier',
      cityArea: 'Mysuru', status: 'Interview', createdAt: '2026-07-24T00:00:00Z',
    }, {
      id: 'app-4', jobPostId: 'job-4', jobTitle: 'Cashier', workplaceName: 'Market',
      cityArea: 'Mysuru', status: 'Rejected', createdAt: '2026-07-24T00:00:00Z',
    }], 1, 3, 1, 0, 1) })
    const wrapper = mount(AppliedJobsPage, {
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('You were selected for this role.')
    expect(wrapper.text()).toContain('The employer did not select you for this role.')
    expect(wrapper.text()).toContain('Your application status was updated.')
    expect(wrapper.find('.applied-card').classes()).toContain('applied-card--hired')
    expect(wrapper.findAll('.applied-card')[2].classes()).toContain('applied-card--rejected')
  })

  it('paginates the application journey', async () => {
    const applications = Array.from({ length: 7 }, (_, index) => ({
      id: `app-${index}`,
      jobPostId: `job-${index}`,
      jobTitle: `Role ${index}`,
      workplaceName: 'Local Shop',
      status: 'Applied',
      createdAt: '2026-07-24T00:00:00Z',
    }))
    api.get.mockImplementation((_url, { params }) => Promise.resolve({
      data: page(applications.slice((params.page - 1) * 6, params.page * 6), params.page, 7, 2, 0, 0),
    }))
    const wrapper = mount(AppliedJobsPage, {
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    expect(wrapper.findAll('.applied-card')).toHaveLength(6)
    await wrapper.find('[aria-label="Page 2 of 2"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.applied-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('Page 2 of 2')
  })
})
