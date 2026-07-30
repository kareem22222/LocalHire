import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { createTestRouter } from '../test/router'
import CandidateDetailPage from './CandidateDetailPage.vue'

const savedCandidatesState = vi.hoisted(() => ({ saved: null }))

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))
vi.mock('../composables/useSavedCandidates', async () => {
  const { ref } = await import('vue')
  const saved = ref(new Set())
  savedCandidatesState.saved = saved
  return {
    clearSavedCandidates: () => { saved.value = new Set() },
    useSavedCandidates: () => ({
      isSaved: (id) => saved.value.has(id),
      add: (id) => { saved.value = new Set([...saved.value, id]) },
    }),
  }
})

let router

async function mountPage(location = '/hiring/candidates/candidate-1') {
  router = createTestRouter()
  router.push(location)
  await router.isReady()
  return mount(CandidateDetailPage, {
    global: { plugins: [router], stubs: { BrandLogo: true } },
  })
}

describe('CandidateDetailPage', () => {
  beforeEach(() => {
    savedCandidatesState.saved.value = new Set()
    api.get.mockReset()
  })

  it('renders candidate details and exposes contact and shortlist actions', async () => {
    api.get.mockResolvedValue({
      data: {
        id: 'candidate-1',
        name: 'Ananya Rao',
        email: 'ananya@example.com',
        hasApplied: true,
        hasResume: true,
        role: 'Cashier',
        gender: 'Female',
        dateOfBirth: '1990-01-02',
        addressLine: '12 Market Road',
        area: 'Bandra',
        state: 'Maharashtra',
        pincode: '400050',
        createdAt: '2025-01-01T00:00:00Z',
        professionalSummary: 'Experienced local cashier.',
        skillDetails: [{ name: 'Billing', proficiency: 'Advanced' }],
        workPreferences: {
          desiredRoles: ['Cashier'], employmentTypes: ['FullTime', 'Contract', 'Temporary', 'Internship'],
          shifts: ['Evening', 'Flexible'], workModes: ['Hybrid', 'Remote'],
          expectedSalaryMin: 15000, expectedSalaryMax: 20000, salaryPeriod: 'Hourly',
          availability: 'Immediately',
        },
        workHistory: [{ jobTitle: 'Cashier', employer: 'Local Mart', isCurrent: true }],
      },
    })
    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.find('.candidate-detail__avatar').text()).toBe('AR')
    expect(wrapper.text()).toContain('Bandra, Maharashtra - 400050')
    expect(wrapper.text()).toContain('Experienced local cashier.')
    expect(wrapper.text()).toContain('Billing · Advanced')
    expect(wrapper.text()).toContain('Cashier · Local Mart')
    expect(wrapper.text()).toContain('Apprenticeship / internship')
    expect(wrapper.text()).toContain('Work from home')
    expect(wrapper.text()).toContain('Hourly')
    expect(wrapper.text()).not.toContain('Internship')
    expect(wrapper.text()).not.toContain('Remote')
    expect(wrapper.text()).toContain(new Date(1990, 0, 2).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }))
    expect(wrapper.text()).not.toContain('ananya@example.com')

    const buttons = wrapper.findAll('.candidate-detail__actions button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')

    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[0].text()).toBe('Saved candidate')
    expect(wrapper.text()).toContain('ananya@example.com')
    expect(api.get).toHaveBeenLastCalledWith('/hiring/candidates/candidate-1/resume')
  })

  it('reloads on route changes, reports failures, and navigates back', async () => {
    api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      data: { id: 'candidate-2', name: '', email: 'worker@example.com', hasApplied: true, dateOfBirth: 'unknown' },
    })
    const wrapper = await mountPage()
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('could not load')

    await router.push('/hiring/candidates/candidate-2?contact=1')
    await flushPromises()
    expect(wrapper.text()).toContain('worker@example.com')
    expect(wrapper.text()).toContain('unknown')

    await router.push('/hiring/candidates/candidate-2')
    await flushPromises()
    expect(wrapper.text()).not.toContain('worker@example.com')

    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2)
    const back = vi.spyOn(router, 'back').mockImplementation(() => {})
    await wrapper.find('.dash-header button').trigger('click')
    expect(back).toHaveBeenCalled()
  })

  it('ignores an obsolete request after the route changes', async () => {
    const requests = {}
    api.get.mockImplementation((url) => new Promise((resolve, reject) => {
      requests[url] = { resolve, reject }
    }))
    const wrapper = await mountPage()
    await flushPromises()

    await router.push('/hiring/candidates/candidate-2')
    await flushPromises()
    expect(wrapper.find('.candidate-detail__hero').exists()).toBe(false)

    requests['/hiring/candidates/candidate-2'].resolve({
      data: { id: 'candidate-2', name: 'Latest Candidate', email: 'latest@example.com' },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Latest Candidate')

    requests['/hiring/candidates/candidate-1'].reject(new Error('stale failure'))
    await flushPromises()
    expect(wrapper.text()).toContain('Latest Candidate')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('explains why contact and private profile data are locked before an application', async () => {
    api.get.mockResolvedValue({
      data: {
        id: 'candidate-1', name: 'Ananya Rao', email: null, hasApplied: false,
        hasResume: false, credentials: [{ name: 'Private Forklift Licence', issuer: 'Skills Centre' }],
      },
    })
    const wrapper = await mountPage('/hiring/candidates/candidate-1?contact=1')
    await flushPromises()

    expect(wrapper.text()).toContain('Contact details unlock once this candidate applies to one of your roles.')
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Resume')
    expect(wrapper.text()).not.toContain('Private Forklift Licence')
    expect(wrapper.text()).not.toContain('Download resume')
  })

  it('hides resume download when an applicant has no resume', async () => {
    api.get.mockResolvedValue({
      data: { id: 'candidate-1', name: 'Ananya Rao', hasApplied: true, hasResume: false },
    })
    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Download resume')
  })

  it('rejects an unsafe resume download URL', async () => {
    api.get
      .mockResolvedValueOnce({
        data: { id: 'candidate-1', name: 'Ananya Rao', hasApplied: true, hasResume: true },
      })
      .mockResolvedValueOnce({ data: { url: 'javascript:alert(1)' } })
    const wrapper = await mountPage()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text() === 'Download resume').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('could not download')
  })
})
