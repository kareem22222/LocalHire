import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JobDetailView from './JobDetailView.vue'
import api from '../api'
import { createTestRouter } from '../test/router'

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
  clearAuth: vi.fn(),
}))

let router

function sampleJob(overrides = {}) {
  return {
    id: 'abc',
    title: 'Cashier',
    description: 'Front desk',
    workplaceName: 'Corner Shop',
    cityArea: 'Bandra',
    state: 'Maharashtra',
    pincode: '400050',
    latitude: 0,
    longitude: 0,
    employmentType: 'FullTime',
    salaryMin: 15000,
    salaryMax: 25000,
    salaryPeriod: 'Monthly',
    minEducation: null,
    experienceMinYears: null,
    experienceMaxYears: null,
    workingDays: null,
    shiftStartTime: null,
    shiftEndTime: null,
    openings: null,
    requiredSkills: ['Billing'],
    languages: [],
    benefits: [],
    isActive: true,
    applicationCount: 0,
    ...overrides,
  }
}

function mountView(mode) {
  router = createTestRouter()
  return mount(JobDetailView, {
    props: { id: 'abc', mode },
    global: {
      plugins: [router],
      stubs: { BrandLogo: true },
    },
  })
}

describe('JobDetailView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    api.get.mockReset()
    api.put.mockReset()
    api.get.mockResolvedValue({ data: sampleJob() })
    api.put.mockResolvedValue({ data: sampleJob() })
  })

  it('loads the job by id', async () => {
    mountView('view')
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/hiring/jobs/abc')
  })

  it('shows a read-only view with no submit button', async () => {
    const wrapper = mountView('view')
    await flushPromises()

    expect(wrapper.find('.post-job-page h1').text()).toBe('Job details')
    expect(wrapper.find('#job-title').element.value).toBe('Cashier')
    expect(wrapper.find('#job-skills').element.value).toBe('Billing')
    expect(wrapper.find('.job-form > .dash-btn').exists()).toBe(false)
  })

  it('shows an Edit action in view mode that switches to editing', async () => {
    const wrapper = mountView('view')
    await flushPromises()
    const replace = vi.spyOn(router, 'replace')

    const editButton = wrapper.find('.post-job-page__edit')
    expect(editButton.exists()).toBe(true)
    expect(editButton.text()).toBe('Edit')

    await editButton.trigger('click')

    expect(replace).toHaveBeenCalledWith('/jobs/abc/edit')
    // Now editable: the submit button appears.
    expect(wrapper.find('.job-form > .dash-btn').exists()).toBe(true)
  })

  it('shows a Cancel action instead of Edit in edit mode', async () => {
    const wrapper = mountView('edit')
    await flushPromises()

    const actionButton = wrapper.find('.post-job-page__edit')
    expect(actionButton.exists()).toBe(true)
    expect(actionButton.text()).toBe('Cancel')
    expect(wrapper.find('.post-job-page h1').text()).toBe('Job details')
  })

  it('cancel discards edits and returns to the read-only view', async () => {
    const wrapper = mountView('edit')
    await flushPromises()
    const replace = vi.spyOn(router, 'replace')

    await wrapper.find('#job-title').setValue('Changed Title')
    await wrapper.find('.post-job-page__edit').trigger('click') // Cancel

    expect(replace).toHaveBeenCalledWith('/jobs/abc')
    // Read-only again (no submit button) and edits discarded.
    expect(wrapper.find('.job-form > .dash-btn').exists()).toBe(false)
    expect(wrapper.find('#job-title').element.value).toBe('Cashier')
  })

  it('saves via PUT and stays on the job page instead of going home', async () => {
    const wrapper = mountView('edit')
    await flushPromises()
    const push = vi.spyOn(router, 'push')
    const replace = vi.spyOn(router, 'replace')

    await wrapper.find('#job-title').setValue('Senior Cashier')
    await wrapper.find('.job-form > .dash-btn').trigger('click')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith('/hiring/jobs/abc', expect.objectContaining({
      title: 'Senior Cashier',
      cityArea: 'Bandra',
      state: 'Maharashtra',
      pincode: '400050',
      requiredSkills: ['Billing'],
    }))
    // Stays on the job page (read-only view), never navigates to the dashboard.
    expect(push).not.toHaveBeenCalledWith('/')
    expect(replace).toHaveBeenCalledWith('/jobs/abc')
    expect(wrapper.find('.job-form > .dash-btn').exists()).toBe(false)
  })

  it('redirects to the dashboard when the job cannot be loaded', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } })

    const wrapper = mountView('view')
    const replace = vi.spyOn(router, 'replace')
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/')
    expect(wrapper.find('.job-form').exists()).toBe(false)
  })

  it('navigates back to the dashboard from the back button', async () => {
    const wrapper = mountView('view')
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    await wrapper.find('.post-job-page__back').trigger('click')

    expect(push).toHaveBeenCalledWith('/')
  })
})
