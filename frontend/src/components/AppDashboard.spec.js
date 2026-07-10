import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppDashboard from './AppDashboard.vue'
import api from '../api'

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

function mountDashboard() {
  return mount(AppDashboard, {
    global: {
      stubs: { BrandLogo: true },
    },
  })
}

function findButtonByText(wrapper, text) {
  return wrapper.findAll('button').find((button) => button.text() === text)
}

function mockPincodeLookup(postOffices = [
  { Name: 'Bandra West', Block: 'Mumbai', District: 'Mumbai', State: 'Maharashtra' },
  { Name: 'Khar Colony', Block: 'Mumbai', District: 'Mumbai', State: 'Maharashtra' },
]) {
  fetch.mockResolvedValue({
    json: vi.fn().mockResolvedValue([{ Status: 'Success', PostOffice: postOffices }]),
  })
}

describe('AppDashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.get.mockResolvedValue({ data: [] })
    api.post.mockResolvedValue({ data: {} })
    api.put.mockResolvedValue({ data: {} })
  })

  it('loads hiring jobs after profile fetch', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
    }))

    mountDashboard()
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/hiring/jobs')
  })

  it('loads hiring jobs when profile role is the numeric backend enum', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 1 } : [],
    }))

    mountDashboard()
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/hiring/jobs')
  })

  it('loads worker applications and jobs after profile fetch', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'LookingForWork' } : [],
    }))

    mountDashboard()
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/work/applications')
    expect(api.get).toHaveBeenCalledWith('/work/jobs/nearby', { params: {} })
  })

  it('location success saves coordinates and reloads nearby jobs with coordinates', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'LookingForWork' } : [],
    }))
    vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementation((success) => {
      success({ coords: { latitude: 12.3456, longitude: 78.9012 } })
    })

    const wrapper = mountDashboard()
    await flushPromises()
    await wrapper.find('.location-prompt button').trigger('click')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith('/me/location', { latitude: 12.346, longitude: 78.901 })
    expect(api.get).toHaveBeenCalledWith('/work/jobs/nearby', { params: { lat: 12.346, lng: 78.901 } })
  })

  it('location denied loads jobs without coordinates', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'LookingForWork' } : [],
    }))
    vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementation((_, error) => {
      error()
    })

    const wrapper = mountDashboard()
    await flushPromises()
    await wrapper.find('.location-prompt button').trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/work/jobs/nearby', { params: {} })
  })

  it('creating a job submits structured cityArea, state, and pincode', async () => {
    mockPincodeLookup()
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
    }))

    const wrapper = mountDashboard()
    await flushPromises()
    await findButtonByText(wrapper, 'Post new role').trigger('click')

    const form = wrapper.find('.job-form')
    await form.find('input[placeholder="e.g. Store Associate"]').setValue('Cashier')
    await form.find('textarea').setValue('Front desk')
    await form.find('input[placeholder="e.g. FreshMart Store"]').setValue('Corner Shop')
    await form.find('input[inputmode="numeric"]').setValue('400050')
    await flushPromises()
    await wrapper.find('.job-form > .dash-btn').trigger('click')

    expect(api.post).toHaveBeenCalledWith('/hiring/jobs', expect.objectContaining({
      title: 'Cashier',
      description: 'Front desk',
      workplaceName: 'Corner Shop',
      cityArea: 'Bandra West, Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      latitude: null,
      longitude: null,
      employmentType: null,
      salaryMin: null,
      salaryMax: null,
      salaryPeriod: null,
      requiredSkills: [],
      languages: [],
      benefits: [],
    }))
  })

  it('creating a job submits the rich role details', async () => {
    mockPincodeLookup()
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
    }))

    const wrapper = mountDashboard()
    await flushPromises()
    await findButtonByText(wrapper, 'Post new role').trigger('click')

    const form = wrapper.find('.job-form')
    await form.find('input[placeholder="e.g. Store Associate"]').setValue('Cashier')
    await form.find('textarea').setValue('Front desk')
    await form.find('input[placeholder="e.g. FreshMart Store"]').setValue('Corner Shop')
    await form.find('input[inputmode="numeric"]').setValue('400050')
    await flushPromises()

    await form.find('#job-employment-type').setValue('FullTime')
    await form.find('#job-salary-min').setValue('15000')
    await form.find('#job-salary-max').setValue('25000')
    await form.find('#job-salary-period').setValue('Monthly')
    await form.find('#job-openings').setValue('3')
    await form.find('#job-skills').setValue('Billing, Customer service')
    await form.find('#job-languages').setValue('Hindi, English')
    await form.find('#job-benefits').setValue('Provident Fund, Meals')
    await wrapper.find('.job-form > .dash-btn').trigger('click')

    expect(api.post).toHaveBeenCalledWith('/hiring/jobs', expect.objectContaining({
      employmentType: 'FullTime',
      salaryMin: 15000,
      salaryMax: 25000,
      salaryPeriod: 'Monthly',
      openings: 3,
      requiredSkills: ['Billing', 'Customer service'],
      languages: ['Hindi', 'English'],
      benefits: ['Provident Fund', 'Meals'],
    }))
  })

  it('renders the applicants overlay as a dialog', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
    }))

    const wrapper = mountDashboard()
    await flushPromises()
    await wrapper.vm.viewApplications('job-id')
    await flushPromises()

    const modal = wrapper.find('.auth-modal')
    expect(modal.attributes('role')).toBe('dialog')
    expect(modal.attributes('aria-modal')).toBe('true')
    expect(modal.attributes('aria-labelledby')).toBe('applicants-dialog-title')
    expect(wrapper.find('.auth-modal__close').attributes('aria-label')).toBe('Close applicants dialog')
  })

  it('fetches state and area options from an Indian pincode', async () => {
    mockPincodeLookup()
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
    }))

    const wrapper = mountDashboard()
    await flushPromises()
    await findButtonByText(wrapper, 'Post new role').trigger('click')

    await wrapper.find('.job-form input[inputmode="numeric"]').setValue('400050')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith('https://api.postalpincode.in/pincode/400050')
    expect(wrapper.vm.jobForm.state).toBe('Maharashtra')
    expect(wrapper.vm.jobForm.cityArea).toBe('Bandra West, Mumbai')
    expect(wrapper.findAll('.job-form__field select')[1].exists()).toBe(true)
    expect(wrapper.findAll('.job-form__field select')[1].text()).toContain('Khar Colony, Mumbai, Mumbai')
  })

  describe('profile navigation', () => {
    it('emits "profile" with the current user and shows the profile page when the name is clicked', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
      }))

      const wrapper = mountDashboard()
      await flushPromises()

      await wrapper.find('.dash-user-name').trigger('click')

      expect(wrapper.emitted('profile')).toEqual([[{ name: 'Pat', role: 'Hiring' }]])
      expect(wrapper.find('.profile-page').exists()).toBe(true)
      expect(wrapper.text()).toContain('Personal information')
    })

    it('hides the hiring dashboard while the profile page is open and restores it on back', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
      }))

      const wrapper = mountDashboard()
      await flushPromises()
      expect(findButtonByText(wrapper, 'Post new role')).toBeTruthy()

      await wrapper.find('.dash-user-name').trigger('click')

      expect(findButtonByText(wrapper, 'Post new role')).toBeFalsy()
      expect(wrapper.find('.profile-page').exists()).toBe(true)

      await findButtonByText(wrapper, 'Back').trigger('click')

      expect(wrapper.find('.profile-page').exists()).toBe(false)
      expect(findButtonByText(wrapper, 'Post new role')).toBeTruthy()
    })

    it('hides the worker dashboard while the profile page is open and restores it on back', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', role: 'LookingForWork' } : [],
      }))

      const wrapper = mountDashboard()
      await flushPromises()
      expect(wrapper.text()).toContain('Worker Dashboard')

      await wrapper.find('.dash-user-name').trigger('click')

      expect(wrapper.text()).not.toContain('Worker Dashboard')
      expect(wrapper.find('.profile-page').exists()).toBe(true)

      await findButtonByText(wrapper, 'Back').trigger('click')

      expect(wrapper.find('.profile-page').exists()).toBe(false)
      expect(wrapper.text()).toContain('Worker Dashboard')
    })

    it('hides the unidentified-account message while the profile page is open and restores it on back', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', role: 'Unknown' } : [],
      }))

      const wrapper = mountDashboard()
      await flushPromises()
      expect(wrapper.text()).toContain('We could not identify this account type.')

      await wrapper.find('.dash-user-name').trigger('click')

      expect(wrapper.text()).not.toContain('We could not identify this account type.')
      expect(wrapper.find('.profile-page').exists()).toBe(true)

      await findButtonByText(wrapper, 'Back').trigger('click')

      expect(wrapper.find('.profile-page').exists()).toBe(false)
      expect(wrapper.text()).toContain('We could not identify this account type.')
    })

    it('opens the profile page with a fallback name before the profile has loaded', async () => {
      api.get.mockReturnValue(new Promise(() => {}))

      const wrapper = mountDashboard()

      await wrapper.find('.dash-user-name').trigger('click')

      expect(wrapper.emitted('profile')).toEqual([[null]])
      expect(wrapper.find('.profile-page .dash-welcome__name').text()).toBe('User')
    })

    it('persists profile edits through PUT /me/profile and reflects the response', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', email: 'pat@example.com', role: 'Hiring' } : [],
      }))
      api.put.mockResolvedValue({ data: { name: 'Pat Rao', state: 'Karnataka', pincode: '560038' } })

      const wrapper = mountDashboard()
      await flushPromises()

      await wrapper.find('.dash-user-name').trigger('click')
      await findButtonByText(wrapper, 'Edit profile').trigger('click')
      await findButtonByText(wrapper, 'Save changes').trigger('click')
      await flushPromises()

      expect(api.put).toHaveBeenCalledWith('/me/profile', expect.objectContaining({
        name: 'Pat',
        phone: '',
        state: '',
        pincode: '',
      }))
      // Returns to the dashboard after saving
      expect(wrapper.find('.profile-page').exists()).toBe(false)
    })
  })
})
