import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppDashboard from './AppDashboard.vue'
import api from '../api'
import { logout } from '../utils/session'
import { createTestRouter } from '../test/router'

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('../utils/session', () => ({
  logout: vi.fn(),
}))

const fullJob = {
  id: 'job-1',
  title: 'Cashier',
  workplaceName: 'Corner Shop',
  description: 'Handle billing',
  cityArea: 'Bandra',
  state: 'Maharashtra',
  pincode: '400050',
  employmentType: 'FullTime',
  salaryMin: 15000,
  salaryMax: 25000,
  salaryPeriod: 'Monthly',
  experienceMinYears: 1,
  experienceMaxYears: 3,
  minEducation: '10th pass',
  workingDays: 'Mon-Sat',
  shiftStartTime: '09:00',
  shiftEndTime: '18:00',
  openings: 2,
  requiredSkills: ['Billing'],
  languages: ['Hindi'],
  benefits: ['PF'],
  applicationCount: 0,
}

function mountAsWorker({ nearby = [], applications = [], profile = {} } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/auth/me') return Promise.resolve({ data: { name: 'Pat', role: 'LookingForWork', ...profile } })
    if (url === '/work/jobs/nearby') return Promise.resolve({ data: nearby })
    if (url === '/work/applications') return Promise.resolve({ data: applications })
    return Promise.resolve({ data: [] })
  })
  const router = createTestRouter()
  return mount(AppDashboard, { global: { plugins: [router], stubs: { BrandLogo: true } } })
}

function findButtonByText(wrapper, text) {
  return wrapper.findAll('button').find((b) => b.text() === text)
}

describe('AppDashboard worker flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.post.mockResolvedValue({ data: {} })
    api.put.mockResolvedValue({ data: {} })
    localStorage.removeItem('dashboard_tab')
  })

  it('keeps the job list to a readable summary', async () => {
    const wrapper = mountAsWorker({ nearby: [fullJob] })
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Full-time')
    expect(text).toContain('₹15,000 – ₹25,000 / monthly')
    expect(text).toContain('1–3 yrs exp')
    expect(text).toContain('Handle billing')
    expect(text).toContain('View details')
    expect(text).not.toContain('Mon-Sat')
  })

  it('applies to a job and reloads applications', async () => {
    const wrapper = mountAsWorker({ nearby: [fullJob] })
    await flushPromises()

    await findButtonByText(wrapper, 'Apply now').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/work/jobs/job-1/apply')
  })

  it('alerts when applying fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    api.post.mockRejectedValue({ response: { data: { message: 'Nope' } } })

    const wrapper = mountAsWorker({ nearby: [fullJob] })
    await flushPromises()

    await findButtonByText(wrapper, 'Apply now').trigger('click')
    await flushPromises()

    expect(alertSpy).toHaveBeenCalledWith('Nope')
  })

  it('shows an Applied, disabled button for jobs already applied to', async () => {
    const wrapper = mountAsWorker({
      nearby: [fullJob],
      applications: [{ id: 'a1', jobPostId: 'job-1', jobTitle: 'Cashier', workplaceName: 'Corner Shop', cityArea: 'Bandra', status: 'Applied', createdAt: '2024-01-01' }],
    })
    await flushPromises()

    const applied = findButtonByText(wrapper, 'Applied')
    expect(applied).toBeTruthy()
    expect(applied.attributes('disabled')).toBeDefined()
  })

  it('marks location as denied when geolocation is unavailable', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })

    const wrapper = mountAsWorker()
    await flushPromises()

    await wrapper.find('.worker-search__location').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Location unavailable')
  })

  it('uses the hiring dashboard layout with worker search, filters, and a profile score', async () => {
    const wrapper = mountAsWorker({ nearby: [fullJob] })
    await flushPromises()

    expect(wrapper.find('.hiring-metrics').exists()).toBe(true)
    expect(wrapper.text()).toContain('profile score')
    expect(wrapper.find('.worker-search__field select').exists()).toBe(true)

    await wrapper.find('.hiring-search input').setValue('Cashier')
    await wrapper.find('.worker-search').trigger('submit')
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/work/jobs/nearby', { params: { search: 'Cashier' } })
  })

  it('opens job details from the clickable row and exposes the applied jobs button', async () => {
    const wrapper = mountAsWorker({ nearby: [fullJob] })
    await flushPromises()

    expect(wrapper.find('.worker-job-row').attributes('role')).toBe('link')
    expect(findButtonByText(wrapper, 'Applied jobs')).toBeTruthy()
  })

  it('logs out via the session helper', async () => {
    logout.mockReset()
    const wrapper = mountAsWorker()
    await flushPromises()

    await findButtonByText(wrapper, 'Sign out').trigger('click')

    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('returns to the dashboard from the applicants view and the brand logo', async () => {
    const wrapper = mountAsWorker()
    await flushPromises()

    wrapper.vm.selectedJobApplications = [{ id: 'a1', workerName: 'Sam', status: 'Applied', appliedAt: '2024-01-01' }]
    await flushPromises()
    expect(wrapper.text()).toContain('Sam')

    wrapper.vm.closeApplications()
    await flushPromises()
    expect(wrapper.find('.auth-modal').exists()).toBe(false)

    // Brand-logo path also resets to the dashboard tab.
    wrapper.vm.goToDashboard()
    await flushPromises()
    expect(wrapper.vm.activeTab).toBe('dashboard')
  })

  it('opens the dashboard for an incomplete worker returning from another page', async () => {
    const wrapper = mountAsWorker({ profile: { isProfileComplete: false } })
    await flushPromises()

    expect(wrapper.find('.profile-page').exists()).toBe(false)
    expect(wrapper.find('.worker-search').exists()).toBe(true)
  })
})
