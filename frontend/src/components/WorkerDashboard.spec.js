import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { clearSavedJobs } from '../composables/useSavedJobs'
import WorkerDashboard from './WorkerDashboard.vue'

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const job = {
  id: 'job-1', title: 'Cashier', workplaceName: 'Local Mart', description: 'Handle billing',
  cityArea: 'Mysuru', state: 'Karnataka', pincode: '570001', employmentType: 'FullTime',
  salaryMin: 15000, salaryMax: 22000, salaryPeriod: 'Monthly',
  experienceMinYears: 1, experienceMaxYears: 2,
}

afterEach(() => vi.useRealTimers())

describe('WorkerDashboard', () => {
  beforeEach(() => {
    clearSavedJobs()
    api.get.mockReset().mockResolvedValue({ data: [] })
    api.post.mockReset().mockResolvedValue({})
    api.delete.mockReset().mockResolvedValue({})
  })

  it('emits every dashboard, search, job, and application action', async () => {
    vi.useFakeTimers()
    const wrapper = mount(WorkerDashboard, {
      props: { user: { profileCompletionPercent: 95 }, jobs: [job], locationLabel: 'Mysuru' },
    })
    const progress = wrapper.get('progress')

    expect(progress.attributes('value')).toBe('95')

    await wrapper.findAll('button').find((item) => item.text() === 'Applied jobs').trigger('click')
    await wrapper.findAll('button').find((item) => item.text() === 'Update profile').trigger('click')
    await wrapper.find('.worker-search__location').trigger('click')
    await wrapper.find('.worker-job-row__main').trigger('click')
    await wrapper.find('.worker-job-row__details').trigger('click')
    await wrapper.findAll('button').find((item) => item.text() === 'Save job').trigger('click')
    await flushPromises()
    const savedButton = wrapper.findAll('button').find((item) => item.text() === 'Saved job')
    expect(savedButton.attributes('disabled')).toBeDefined()
    await wrapper.findAll('button').find((item) => item.text() === 'Apply now').trigger('click')

    await wrapper.find('input[type="search"]').setValue(' Cashier ')
    vi.advanceTimersByTime(400)
    await wrapper.find('select').setValue('FullTime')
    await wrapper.find('.worker-search').trigger('submit')

    expect(wrapper.emitted('view-applications')).toHaveLength(1)
    expect(wrapper.emitted('open-profile')).toHaveLength(1)
    expect(wrapper.emitted('use-my-location')).toHaveLength(1)
    expect(wrapper.emitted('open-job')).toHaveLength(2)
    expect(wrapper.find('.worker-job-row__main').attributes('href')).toBe('/work/jobs/job-1')
    expect(wrapper.emitted('apply')[0]).toEqual(['job-1'])
    expect(api.post).toHaveBeenCalledWith('/work/saved-jobs/job-1')
    expect(wrapper.emitted('search-jobs').at(-1)[0]).toEqual({ search: 'Cashier', employmentType: 'FullTime' })
    wrapper.unmount()
  })

  it('covers fallback scores, loading, empty, applied, and applying states', async () => {
    const user = {
      phone: '1', jobTitle: 'Cashier', experienceYears: 0, education: '12th',
      languages: ['Kannada'], cityArea: 'Mysuru', state: 'Karnataka', pincode: '570001',
    }
    const applied = mount(WorkerDashboard, {
      props: { user, jobs: [job], applications: [{ jobPostId: 'job-1' }] },
    })
    expect(applied.get('progress').attributes('value')).toBe('100')
    expect(applied.findAll('button').find((item) => item.text() === 'Applied').attributes('disabled')).toBeDefined()

    await applied.setProps({ applications: [], applying: 'job-1' })
    expect(applied.text()).toContain('Applying...')
    await applied.setProps({ jobs: [], loading: true, locating: true })
    expect(applied.text()).toContain('Searching roles...')
    expect(applied.find('.skeleton-list--job').exists()).toBe(true)
    expect(applied.text()).toContain('Locating...')
    await applied.setProps({ loading: false })
    expect(applied.text()).toContain('No roles found')
  })

  it('keeps the dashboard list short and opens the full jobs page', async () => {
    const jobs = Array.from({ length: 7 }, (_, index) => ({ ...job, id: `job-${index}` }))
    const wrapper = mount(WorkerDashboard, { props: { jobs } })

    expect(wrapper.findAll('.worker-job-row')).toHaveLength(6)
    await wrapper.get('.worker-show-more__btn').trigger('click')
    expect(wrapper.emitted('view-all-jobs')[0]).toEqual([{ search: '', employmentType: '' }])

    await wrapper.setProps({ loading: true })
    expect(wrapper.find('.worker-show-more__btn').exists()).toBe(false)
  })
})
