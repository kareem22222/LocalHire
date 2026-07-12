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
  let wrapper
  wrapper = mount(HiringDashboard, {
    props: {
      jobForm: createJobForm(),
      jobFormError: '',
      creating: false,
      myJobs: [],
      showCreateForm: false,
      ...props,
      'onUpdate:jobForm': (value) => wrapper.setProps({ jobForm: value }),
    },
  })
  return wrapper
}

function mockPincodeLookup(postOffices = [
  { Name: 'Bandra West', Block: 'Mumbai', District: 'Mumbai', State: 'Maharashtra' },
  { Name: 'Khar Colony', Block: 'Mumbai', District: 'Mumbai', State: 'Maharashtra' },
]) {
  fetch.mockResolvedValue({
    json: vi.fn().mockResolvedValue([{ Status: 'Success', PostOffice: postOffices }]),
  })
}

function createDeferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
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

  it('filters candidates provided through props', async () => {
    const wrapper = mountHiringDashboard({
      candidates: [
        {
          id: 1,
          name: 'Ananya Rao',
          role: 'Store Associate',
          area: 'Indiranagar',
          city: 'Bengaluru',
          availability: 'Immediate',
          experience: '2 yrs',
          match: 96,
          rate: 'Rs 22k/mo',
          skills: ['Billing'],
        },
        {
          id: 2,
          name: 'Rahul Mehta',
          role: 'Delivery Partner',
          area: 'Madhapur',
          city: 'Hyderabad',
          availability: 'This week',
          experience: '3 yrs',
          match: 91,
          rate: 'Rs 28k/mo',
          skills: ['Routes'],
        },
      ],
    })

    await wrapper.find('input[aria-label="Search candidates"]').setValue('routes')

    expect(wrapper.findAll('.candidate-card h3').map((item) => item.text())).toEqual(['Rahul Mehta'])
    expect(wrapper.findAll('.hiring-search-panel select')[0].text()).toContain('Delivery Partner')
  })

  it('shows an empty state instead of fallback demo roles', () => {
    const wrapper = mountHiringDashboard()

    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('No open roles yet')
  })

  it('emits create form toggle when the quick action post new role is clicked', async () => {
    const wrapper = mountHiringDashboard()

    await wrapper.find('.hiring-quick .dash-btn').trigger('click')

    expect(wrapper.emitted('update:showCreateForm')).toEqual([[true]])
  })

  it('does not render a redundant post new role button in the hiring desk header', () => {
    const wrapper = mountHiringDashboard()

    expect(wrapper.find('.hiring-roles__head button').exists()).toBe(false)
  })

  it('renders the hiring pipeline card with its health metric', () => {
    const wrapper = mountHiringDashboard()

    const pipeline = wrapper.find('.hiring-side-stack .hiring-sidebar')
    expect(pipeline.exists()).toBe(true)
    expect(pipeline.find('h2').text()).toBe('Hiring pipeline')
    expect(pipeline.find('.hiring-progress span').text()).toBe('Pipeline health')
    expect(pipeline.find('.hiring-progress strong').text()).toBe('88%')
  })

  it('renders the quick actions card with the available actions', () => {
    const wrapper = mountHiringDashboard()

    const quick = wrapper.find('.hiring-quick')
    expect(quick.exists()).toBe(true)
    expect(quick.find('h2').text()).toBe('Quick actions')
    const actionLabels = quick.findAll('button').map((button) => button.text())
    expect(actionLabels).toEqual(['Post new role', 'Review shortlists', 'Schedule interviews'])
  })

  it('shows the quick action toggle as Cancel while the create form is open', () => {
    const wrapper = mountHiringDashboard({ showCreateForm: true })

    expect(wrapper.find('.hiring-quick .dash-btn').text()).toBe('Cancel')
  })

  it('emits the toggle to close the create form from the quick action', async () => {
    const wrapper = mountHiringDashboard({ showCreateForm: true })

    await wrapper.find('.hiring-quick .dash-btn').trigger('click')

    expect(wrapper.emitted('update:showCreateForm')).toEqual([[false]])
  })

  it('fetches pincode locations and lets the user choose an area', async () => {
    mockPincodeLookup()
    const jobForm = createJobForm()
    const wrapper = mountHiringDashboard({ jobForm, showCreateForm: true })

    await wrapper.find('input[inputmode="numeric"]').setValue('400050')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith('https://api.postalpincode.in/pincode/400050')
    expect(wrapper.props('jobForm').state).toBe('Maharashtra')
    expect(wrapper.props('jobForm').cityArea).toBe('Bandra West, Mumbai')
    expect(wrapper.findAll('.job-form__field select')[1].text()).toContain('Khar Colony, Mumbai, Mumbai')

    await wrapper.findAll('.job-form__field select')[1].setValue('Khar Colony, Mumbai')
    await flushPromises()
    expect(wrapper.props('jobForm').cityArea).toBe('Khar Colony, Mumbai')
  })

  it('sanitizes pincode input before lookup', async () => {
    mockPincodeLookup()
    const jobForm = createJobForm()
    const wrapper = mountHiringDashboard({ jobForm, showCreateForm: true })

    await wrapper.find('input[inputmode="numeric"]').setValue('400050abc')
    await flushPromises()

    expect(wrapper.props('jobForm').pincode).toBe('400050')
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

    expect(wrapper.props('jobForm').state).toBe('')
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

  it('ignores stale pincode responses after the input becomes invalid', async () => {
    const deferredJson = createDeferred()
    fetch.mockResolvedValue({ json: vi.fn(() => deferredJson.promise) })
    const jobForm = createJobForm()
    const wrapper = mountHiringDashboard({ jobForm, showCreateForm: true })

    await wrapper.find('input[inputmode="numeric"]').setValue('400050')
    await flushPromises()
    await wrapper.find('input[inputmode="numeric"]').setValue('')

    deferredJson.resolve([{
      Status: 'Success',
      PostOffice: [
        { Name: 'Bandra West', Block: 'Mumbai', District: 'Mumbai', State: 'Maharashtra' },
      ],
    }])
    await flushPromises()

    expect(wrapper.props('jobForm').pincode).toBe('')
    expect(wrapper.props('jobForm').state).toBe('')
    expect(wrapper.props('jobForm').cityArea).toBe('')
  })

  it('emits job form updates without mutating the prop object', async () => {
    const jobForm = createJobForm()
    const wrapper = mount(HiringDashboard, {
      props: {
        jobForm,
        jobFormError: '',
        creating: false,
        myJobs: [],
        showCreateForm: true,
      },
    })

    await wrapper.find('#job-title').setValue('Cashier')

    expect(jobForm.title).toBe('')
    expect(wrapper.emitted('update:jobForm')[0][0]).toEqual({ ...jobForm, title: 'Cashier' })
  })


  it('emits shortlist without changing the search filter', async () => {
    const wrapper = mountHiringDashboard()
    const candidate = { id: 1, name: 'Worker', role: 'Cashier', skills: [] }

    wrapper.vm.shortlist(candidate)

    expect(wrapper.emitted('shortlist')).toEqual([[candidate]])
    expect(wrapper.find('input[aria-label="Search candidates"]').element.value).toBe('')
  })
})
