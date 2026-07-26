import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppDashboard from './AppDashboard.vue'
import api from '../api'
import { createTestRouter } from '../test/router'

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))
vi.mock('../utils/minimumDelay', () => ({ withMinimumDelay: (task) => task() }))

let router

function mountDashboard() {
  router = createTestRouter()
  return mount(AppDashboard, {
    global: {
      plugins: [router],
      stubs: { BrandLogo: true },
    },
  })
}

function findButtonByText(wrapper, text) {
  return wrapper.findAll('button').find((button) => button.text() === text)
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
    localStorage.removeItem('dashboard_tab')
  })

  it('loads hiring jobs after profile fetch', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
    }))

    mountDashboard()
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/hiring/jobs')
  })

  it('routes the new hiring summary actions', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
    }))
    const wrapper = mountDashboard()
    await flushPromises()
    const push = vi.spyOn(router, 'push').mockResolvedValue()

    wrapper.vm.goJobApplicants('job-1')
    wrapper.vm.goJobShortlisted('job-1')
    wrapper.vm.goCandidateDetail({ id: 'candidate-1' })
    wrapper.vm.goCandidateContact('candidate-2')
    wrapper.vm.goReviewShortlists()

    expect(push).toHaveBeenCalledWith({ name: 'job-applicants', params: { id: 'job-1' } })
    expect(push).toHaveBeenCalledWith({ name: 'job-shortlisted', params: { id: 'job-1' } })
    expect(push).toHaveBeenCalledWith({ name: 'candidate-detail', params: { id: 'candidate-1' } })
    expect(push).toHaveBeenCalledWith({
      name: 'candidate-detail',
      params: { id: 'candidate-2' },
      query: { contact: '1' },
    })
    expect(push).toHaveBeenCalledWith({ name: 'review-shortlists' })
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

  it('uses saved profile coordinates for the initial worker job load', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me'
        ? { name: 'Pat', role: 'LookingForWork', latitude: 12.34, longitude: 77.65 }
        : [],
    }))

    mountDashboard()
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/work/jobs/nearby', { params: { lat: 12.34, lng: 77.65 } })
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
    await wrapper.find('.worker-search__location').trigger('click')
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
    await wrapper.find('.worker-search__location').trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/work/jobs/nearby', { params: {} })
  })

  it('navigates to the Post New Job route when Post new role is clicked', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
    }))

    const wrapper = mountDashboard()
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    await findButtonByText(wrapper, 'Post new role').trigger('click')

    expect(push).toHaveBeenCalledWith('/PostNewJob')
  })

  it('navigates to the view route from the role-card eye icon', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me'
        ? { name: 'Pat', role: 'Hiring' }
        : url === '/hiring/jobs'
          ? [{ id: 'job-1', title: 'Cashier', workplaceName: 'Shop', cityArea: 'Bandra', applicationCount: 0, isActive: true }]
          : [],
    }))

    const wrapper = mountDashboard()
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    const icons = wrapper.findAll('.hiring-role-card__icon')
    expect(icons).toHaveLength(1)

    await icons[0].trigger('click')

    expect(push).toHaveBeenCalledWith('/jobs/job-1')
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

  it('navigates to the all-roles page from the roles show-more button', async () => {
    const jobs = Array.from({ length: 7 }, (_, index) => ({
      id: `job-${index}`,
      title: `Role ${index}`,
      workplaceName: 'Shop',
      cityArea: 'Bandra',
      applicationCount: 0,
      isActive: true,
    }))
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me'
        ? { name: 'Pat', role: 'Hiring' }
        : url === '/hiring/jobs'
          ? jobs
          : [],
    }))

    const wrapper = mountDashboard()
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    await wrapper.find('.hiring-roles .hiring-show-more__btn').trigger('click')

    expect(push).toHaveBeenCalledWith('/hiring/roles')
  })

  it('navigates to the all-candidates page with the search filters as query params', async () => {
    const candidates = Array.from({ length: 11 }, (_, index) => ({
      id: index,
      name: `Worker ${index}`,
      role: 'Cashier',
      area: 'Indiranagar',
      state: 'Karnataka',
      pincode: '560038',
      matchScore: 90,
    }))
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me'
        ? { name: 'Pat', role: 'Hiring' }
        : url === '/hiring/candidates/nearby'
          ? candidates
          : [],
    }))

    const wrapper = mountDashboard()
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    await wrapper.find('.talent-search__role select').setValue('Cashier')
    await flushPromises()
    await wrapper.find('.candidate-list .hiring-show-more__btn').trigger('click')

    expect(push).toHaveBeenCalledWith({ path: '/hiring/candidates', query: { role: 'Cashier' } })
  })

  describe('profile navigation', () => {
    it('shows the profile page without duplicating account controls in the header', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
      }))

      const wrapper = mountDashboard()
      await flushPromises()

      await router.push({ path: '/', query: { tab: 'profile' } })
      await flushPromises()

      expect(wrapper.find('.dash-user-name').exists()).toBe(false)
      expect(wrapper.find('.dash-logout-btn').exists()).toBe(false)
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

      wrapper.vm.handleProfileClick()
      await flushPromises()

      expect(findButtonByText(wrapper, 'Post new role')).toBeFalsy()
      expect(wrapper.find('.profile-page').exists()).toBe(true)

      await findButtonByText(wrapper, 'Back').trigger('click')

      expect(wrapper.find('.profile-page').exists()).toBe(false)
      expect(findButtonByText(wrapper, 'Post new role')).toBeTruthy()
    })

    it('returns a hiring user from the profile page to the dashboard', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
      }))

      const wrapper = mountDashboard()
      await flushPromises()

      wrapper.vm.handleProfileClick()
      await flushPromises()
      expect(wrapper.find('.profile-page').exists()).toBe(true)

      wrapper.vm.closeProfile()
      await flushPromises()

      expect(wrapper.find('.profile-page').exists()).toBe(false)
      expect(findButtonByText(wrapper, 'Post new role')).toBeTruthy()
    })

    it('returns a worker from the profile page to the dashboard', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', role: 'LookingForWork' } : [],
      }))

      const wrapper = mountDashboard()
      await flushPromises()

      wrapper.vm.handleProfileClick()
      await flushPromises()
      expect(wrapper.find('.profile-page').exists()).toBe(true)

      wrapper.vm.closeProfile()
      await flushPromises()

      expect(wrapper.find('.profile-page').exists()).toBe(false)
      expect(wrapper.text()).toContain('Roles for you')
    })

    it('hides the worker dashboard while the profile page is open and restores it on back', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', role: 'LookingForWork' } : [],
      }))

      const wrapper = mountDashboard()
      await flushPromises()
      expect(wrapper.text()).toContain('Roles for you')

      wrapper.vm.handleProfileClick()
      await flushPromises()

      expect(wrapper.text()).not.toContain('Roles for you')
      expect(wrapper.find('.profile-page').exists()).toBe(true)

      await findButtonByText(wrapper, 'Back').trigger('click')

      expect(wrapper.find('.profile-page').exists()).toBe(false)
      expect(wrapper.text()).toContain('Roles for you')
    })

    it('hides the unidentified-account message while the profile page is open and restores it on back', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', role: 'Unknown' } : [],
      }))

      const wrapper = mountDashboard()
      await flushPromises()
      expect(wrapper.text()).toContain('We could not identify this account type.')

      wrapper.vm.handleProfileClick()
      await flushPromises()

      expect(wrapper.text()).not.toContain('We could not identify this account type.')
      expect(wrapper.find('.profile-page').exists()).toBe(true)

      await findButtonByText(wrapper, 'Back').trigger('click')

      expect(wrapper.find('.profile-page').exists()).toBe(false)
      expect(wrapper.text()).toContain('We could not identify this account type.')
    })

    it('opens the profile page with a fallback name before the profile has loaded', async () => {
      api.get.mockReturnValue(new Promise(() => {}))

      const wrapper = mountDashboard()

      wrapper.vm.handleProfileClick()
      await flushPromises()

      expect(wrapper.find('.profile-page .dash-welcome__name').text()).toBe('User')
    })

    it('persists profile edits through PUT /me/profile and reflects the response', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', email: 'pat@example.com', role: 'Hiring' } : [],
      }))
      api.put.mockResolvedValue({ data: { name: 'Pat Rao', state: 'Karnataka', pincode: '560038' } })

      const wrapper = mountDashboard()
      await flushPromises()

      wrapper.vm.handleProfileClick()
      await flushPromises()
      await findButtonByText(wrapper, 'Edit profile').trigger('click')
      await findButtonByText(wrapper, 'Save').trigger('click')
      await flushPromises()

      expect(api.put).toHaveBeenCalledWith('/me/profile', expect.objectContaining({
        name: 'Pat',
        phone: '',
        state: '',
        pincode: '',
      }))
      // Returns to the dashboard after saving
      expect(wrapper.find('.profile-page').exists()).toBe(true)
      expect(findButtonByText(wrapper, 'Edit profile')).toBeTruthy()
    })

    it('shows profile save failures without treating rejected data as saved', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', email: 'pat@example.com', role: 'Hiring' } : [],
      }))
      api.put.mockRejectedValue(new Error('Network down'))

      const wrapper = mountDashboard()
      await flushPromises()

      wrapper.vm.handleProfileClick()
      await flushPromises()
      await findButtonByText(wrapper, 'Edit profile').trigger('click')
      await wrapper.find('#profile-name').setValue('Pat Rao')
      await findButtonByText(wrapper, 'Save').trigger('click')
      await flushPromises()

      expect(wrapper.find('.profile-page').exists()).toBe(true)
      expect(wrapper.find('[role="alert"]').text()).toContain('Network down')
      expect(wrapper.find('#profile-name').element.value).toBe('Pat Rao')
      expect(wrapper.vm.user.name).toBe('Pat')
      expect(findButtonByText(wrapper, 'Save')).toBeTruthy()
    })

    it('shows every backend profile validation reason', async () => {
      api.get.mockImplementation((url) => Promise.resolve({
        data: url === '/auth/me' ? { name: 'Pat', email: 'pat@example.com', role: 'Hiring' } : [],
      }))
      api.put.mockRejectedValue({ response: { status: 400, data: { errors: {
        'WorkPreferences.ExpectedSalaryMax': ['Maximum expected salary is too low.'],
        'WorkHistory[0].Employer': ['Employer is required.'],
      } } } })

      const wrapper = mountDashboard()
      await flushPromises()
      wrapper.vm.handleProfileClick()
      await flushPromises()
      await findButtonByText(wrapper, 'Edit profile').trigger('click')
      await findButtonByText(wrapper, 'Save').trigger('click')
      await flushPromises()

      const alert = wrapper.get('[role="alert"]').text()
      expect(alert).toContain('Maximum expected salary is too low.')
      expect(alert).toContain('Employer is required.')
    })
  })
})
