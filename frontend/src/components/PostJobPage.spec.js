import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PostJobPage from './PostJobPage.vue'

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

function mountPostJobPage(props = {}) {
  let wrapper
  wrapper = mount(PostJobPage, {
    props: {
      jobForm: createJobForm(),
      jobFormError: '',
      creating: false,
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

describe('PostJobPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('renders the job form with a page heading and a back button', () => {
    const wrapper = mountPostJobPage()

    expect(wrapper.find('.post-job-page h1').text()).toBe('Post a new job')
    expect(wrapper.find('.job-form').exists()).toBe(true)
    expect(wrapper.findAll('button').map((b) => b.text())).toContain('Back')
  })

  it('renders a message and marks the control invalid for every field error', () => {
    const fieldErrors = {
      title: 'Title is required.',
      description: 'Description is required.',
      workplaceName: 'Workplace name is required.',
      cityArea: 'City / area is required.',
      pincode: 'Enter a valid 6-digit pincode.',
      state: 'Please wait for the state to load from the pincode.',
      employmentType: 'Invalid employment type.',
      openings: 'Openings must be between 1 and 10,000.',
      salaryMin: 'Salary cannot be negative.',
      salaryMax: 'Maximum salary must be greater than or equal to minimum salary.',
      salaryPeriod: 'Select a pay period when you enter a salary.',
      minEducation: 'Education is too long.',
      experienceMinYears: 'Experience must be between 0 and 60 years.',
      experienceMaxYears: 'Maximum experience must be greater than or equal to minimum experience.',
      workingDays: 'Working days is too long.',
      shiftStartTime: 'Shift start time must be in HH:mm format.',
      shiftEndTime: 'Shift end time must be in HH:mm format.',
      requiredSkills: 'Skill must not be empty.',
      languages: 'A maximum of 20 languages is allowed.',
      benefits: 'A maximum of 30 benefits is allowed.',
    }
    const wrapper = mountPostJobPage({ fieldErrors })

    const messages = wrapper.findAll('.job-form__error-text').map((el) => el.text())
    for (const message of Object.values(fieldErrors)) {
      expect(messages).toContain(message)
    }

    // Each control the error refers to is flagged for assistive tech.
    const invalidIds = ['job-title', 'job-description', 'job-workplace', 'job-pincode',
      'job-state', 'job-city-area', 'job-employment-type', 'job-openings', 'job-salary-min', 'job-salary-max',
      'job-salary-period', 'job-education', 'job-exp-min', 'job-exp-max', 'job-working-days',
      'job-shift-start', 'job-shift-end', 'job-skills', 'job-languages', 'job-benefits']
    for (const id of invalidIds) {
      expect(wrapper.find(`#${id}`).attributes('aria-invalid')).toBe('true')
    }
  })

  it('hides the submit button and shows a configurable title in readonly mode', () => {
    const wrapper = mountPostJobPage({
      readonly: true,
      title: 'Job details',
      subtitle: 'A read-only view of this role.',
    })

    expect(wrapper.find('.post-job-page h1').text()).toBe('Job details')
    expect(wrapper.find('.job-form > .dash-btn').exists()).toBe(false)
    // The fieldset wrapper is disabled so the fields cannot be edited.
    expect(wrapper.find('.job-form__fields').attributes('disabled')).toBeDefined()
  })

  it('shows an Edit action only when canEdit is set and emits edit on click', async () => {
    const viewOnly = mountPostJobPage({ readonly: true, canEdit: false })
    expect(viewOnly.find('.post-job-page__edit').exists()).toBe(false)

    const wrapper = mountPostJobPage({ readonly: true, canEdit: true })
    const editButton = wrapper.find('.post-job-page__edit')
    expect(editButton.exists()).toBe(true)
    expect(editButton.text()).toBe('Edit')

    await editButton.trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('shows a Cancel action when cancelable and emits cancel on click', async () => {
    const wrapper = mountPostJobPage({ cancelable: true })
    const cancelButton = wrapper.find('.post-job-page__edit')
    expect(cancelButton.exists()).toBe(true)
    expect(cancelButton.text()).toBe('Cancel')

    await cancelButton.trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('hides the Hiring desk kicker and subtitle when empty', () => {
    const wrapper = mountPostJobPage({ kicker: '', subtitle: '' })
    expect(wrapper.find('.hiring-kicker').exists()).toBe(false)
    expect(wrapper.find('.post-job-page__head p').exists()).toBe(false)
  })

  it('uses configurable submit and busy labels', async () => {
    const wrapper = mountPostJobPage({ submitLabel: 'Save changes', busyLabel: 'Saving...' })
    expect(wrapper.find('.job-form > .dash-btn').text()).toBe('Save changes')

    await wrapper.setProps({ creating: true })
    expect(wrapper.find('.job-form > .dash-btn').text()).toBe('Saving...')
  })

  it('emits back when the back button is clicked', async () => {
    const wrapper = mountPostJobPage()

    await wrapper.find('.post-job-page__back').trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('emits submit when the Post Job button is clicked', async () => {
    const wrapper = mountPostJobPage()

    await wrapper.find('.job-form > .dash-btn').trigger('click')

    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('shows a submitting state and disables the button while creating', () => {
    const wrapper = mountPostJobPage({ creating: true })

    const button = wrapper.find('.job-form > .dash-btn')
    expect(button.text()).toBe('Posting...')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('renders the job form error message', () => {
    const wrapper = mountPostJobPage({ jobFormError: 'Please fill in all required fields.' })

    expect(wrapper.find('.job-form__error').text()).toBe('Please fill in all required fields.')
  })

  it('emits job form updates without mutating the prop object', async () => {
    const jobForm = createJobForm()
    const wrapper = mount(PostJobPage, {
      props: { jobForm, jobFormError: '', creating: false },
    })

    await wrapper.find('#job-title').setValue('Cashier')

    expect(jobForm.title).toBe('')
    expect(wrapper.emitted('update:jobForm')[0][0]).toEqual({ ...jobForm, title: 'Cashier' })
  })

  it('fetches pincode locations and lets the user choose an area', async () => {
    mockPincodeLookup()
    const wrapper = mountPostJobPage({ jobForm: createJobForm() })

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
    const wrapper = mountPostJobPage({ jobForm: createJobForm() })

    await wrapper.find('input[inputmode="numeric"]').setValue('400050abc')
    await flushPromises()

    expect(wrapper.props('jobForm').pincode).toBe('400050')
    expect(fetch).toHaveBeenCalledWith('https://api.postalpincode.in/pincode/400050')
  })

  it('shows pincode lookup errors when no location is returned', async () => {
    fetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue([{ Status: 'Error', PostOffice: null }]),
    })
    const wrapper = mountPostJobPage({ jobForm: createJobForm() })

    await wrapper.find('input[inputmode="numeric"]').setValue('999999')
    await flushPromises()

    expect(wrapper.props('jobForm').state).toBe('')
    expect(wrapper.find('.job-form__error-text').text()).toBe('No location found for this pincode.')
  })

  it('ignores stale pincode responses after the input becomes invalid', async () => {
    const deferredJson = createDeferred()
    fetch.mockResolvedValue({ json: vi.fn(() => deferredJson.promise) })
    const wrapper = mountPostJobPage({ jobForm: createJobForm() })

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
})
