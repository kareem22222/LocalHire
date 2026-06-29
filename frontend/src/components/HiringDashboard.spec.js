import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HiringDashboard from './HiringDashboard.vue'

function createJobForm(overrides = {}) {
  return {
    title: '',
    description: '',
    workplaceName: '',
    cityArea: '',
    pincode: '',
    state: '',
    ...overrides,
  }
}

function mountHiringDashboard(props = {}) {
  return mount(HiringDashboard, {
    props: {
      jobForm: createJobForm(),
      jobFormError: '',
      creating: false,
      myJobs: [],
      showCreateForm: false,
      ...props,
    },
  })
}

function mockPincodeLookup(postOffices = [
  { Name: 'Bandra West', Block: 'Mumbai', District: 'Mumbai', State: 'Maharashtra' },
  { Name: 'Khar Colony', Block: 'Mumbai', District: 'Mumbai', State: 'Maharashtra' },
]) {
  fetch.mockResolvedValue({
    json: vi.fn().mockResolvedValue([{ Status: 'Success', PostOffice: postOffices }]),
  })
}

describe('HiringDashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('does not render demo candidates when no real candidate data exists', async () => {
    const wrapper = mountHiringDashboard()

    await wrapper.find('input[aria-label="Search candidates"]').setValue('routes')
    expect(wrapper.findAll('.candidate-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('No talent found')
  })

  it('shows an empty state instead of fallback demo roles', () => {
    const wrapper = mountHiringDashboard()

    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('No open roles yet')
  })

  it('emits create form toggle when post new role is clicked', async () => {
    const wrapper = mountHiringDashboard()

    await wrapper.find('.hiring-roles__head button').trigger('click')

    expect(wrapper.emitted('update:showCreateForm')).toEqual([[true]])
  })

  it('fetches pincode locations and lets the user choose an area', async () => {
    mockPincodeLookup()
    const jobForm = createJobForm()
    const wrapper = mountHiringDashboard({ jobForm, showCreateForm: true })

    await wrapper.find('input[inputmode="numeric"]').setValue('400050')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith('https://api.postalpincode.in/pincode/400050')
    expect(jobForm.state).toBe('Maharashtra')
    expect(jobForm.cityArea).toBe('Bandra West, Mumbai')
    expect(wrapper.findAll('.job-form__field select')[1].text()).toContain('Khar Colony, Mumbai, Mumbai')

    await wrapper.findAll('.job-form__field select')[1].setValue('Khar Colony, Mumbai')
    expect(jobForm.cityArea).toBe('Khar Colony, Mumbai')
  })

  it('sanitizes pincode input before lookup', async () => {
    mockPincodeLookup()
    const jobForm = createJobForm()
    const wrapper = mountHiringDashboard({ jobForm, showCreateForm: true })

    await wrapper.find('input[inputmode="numeric"]').setValue('400050abc')
    await flushPromises()

    expect(jobForm.pincode).toBe('400050')
    expect(fetch).toHaveBeenCalledWith('https://api.postalpincode.in/pincode/400050')
  })

  it('shows pincode lookup errors when no location is returned', async () => {
    fetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue([{ Status: 'Error', PostOffice: null }]),
    })
    const jobForm = createJobForm()
    const wrapper = mountHiringDashboard({ jobForm, showCreateForm: true })

    await wrapper.find('input[inputmode="numeric"]').setValue('999999')
    await flushPromises()

    expect(jobForm.state).toBe('')
    expect(wrapper.find('.job-form__error-text').text()).toBe('No location found for this pincode.')
  })

  it('emits create-job and view-applications events', async () => {
    const wrapper = mountHiringDashboard({
      showCreateForm: true,
      myJobs: [
        {
          id: 7,
          title: 'Cashier',
          workplaceName: 'Corner Shop',
          cityArea: 'Bandra, Maharashtra - 400050',
          applicationCount: 3,
          isActive: true,
        },
      ],
    })

    await wrapper.find('.job-form > .dash-btn').trigger('click')
    await wrapper.find('.hiring-role-card__link').trigger('click')

    expect(wrapper.emitted('create-job')).toHaveLength(1)
    expect(wrapper.emitted('view-applications')).toEqual([[7]])
  })

  it('emits shortlist without changing the search filter', async () => {
    const wrapper = mountHiringDashboard()
    const candidate = { id: 1, name: 'Worker', role: 'Cashier', skills: [] }

    wrapper.vm.shortlist(candidate)

    expect(wrapper.emitted('shortlist')).toEqual([[candidate]])
    expect(wrapper.find('input[aria-label="Search candidates"]').element.value).toBe('')
  })
})
