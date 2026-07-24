import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorkerDashboard from './WorkerDashboard.vue'

const job = {
  id: 'job-1', title: 'Cashier', workplaceName: 'Local Mart', description: 'Handle billing',
  cityArea: 'Mysuru', state: 'Karnataka', pincode: '570001', employmentType: 'FullTime',
  salaryMin: 15000, salaryMax: 22000, salaryPeriod: 'Monthly',
  experienceMinYears: 1, experienceMaxYears: 2,
}

afterEach(() => vi.useRealTimers())

describe('WorkerDashboard', () => {
  it('emits every dashboard, search, job, and application action', async () => {
    vi.useFakeTimers()
    const wrapper = mount(WorkerDashboard, {
      props: { user: { profileCompletionPercent: 95 }, jobs: [job], locationLabel: 'Mysuru' },
    })

    await wrapper.findAll('button').find((item) => item.text() === 'Applied jobs').trigger('click')
    await wrapper.findAll('button').find((item) => item.text() === 'Update profile').trigger('click')
    await wrapper.find('.worker-search__location').trigger('click')
    await wrapper.find('.worker-job-row').trigger('click')
    await wrapper.find('.worker-job-row').trigger('keydown', { key: 'Enter' })
    await wrapper.find('.worker-job-row').trigger('keydown', { key: ' ' })
    await wrapper.findAll('button').find((item) => item.text() === 'Apply now').trigger('click')

    await wrapper.find('input[type="search"]').setValue(' Cashier ')
    vi.advanceTimersByTime(400)
    await wrapper.find('select').setValue('FullTime')
    await wrapper.find('.worker-search').trigger('submit')

    expect(wrapper.emitted('view-applications')).toHaveLength(1)
    expect(wrapper.emitted('open-profile')).toHaveLength(1)
    expect(wrapper.emitted('use-my-location')).toHaveLength(1)
    expect(wrapper.emitted('open-job')).toHaveLength(3)
    expect(wrapper.emitted('apply')[0]).toEqual(['job-1'])
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
    expect(applied.text()).toContain('100%')
    expect(applied.findAll('button').find((item) => item.text() === 'Applied').attributes('disabled')).toBeDefined()

    await applied.setProps({ applications: [], applying: 'job-1' })
    expect(applied.text()).toContain('Applying...')
    await applied.setProps({ jobs: [], loading: true, locating: true })
    expect(applied.text()).toContain('Searching roles...')
    expect(applied.text()).toContain('Locating...')
    await applied.setProps({ loading: false })
    expect(applied.text()).toContain('No roles found')
  })
})
