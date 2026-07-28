import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PostJobView from './PostJobView.vue'
import api from '../api'
import { createTestRouter } from '../test/router'

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  clearAuth: vi.fn(),
}))

let router

function mountView() {
  router = createTestRouter()
  return mount(PostJobView, {
    global: {
      plugins: [router],
      stubs: { BrandLogo: true },
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

describe('PostJobView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    api.get.mockReset()
    api.post.mockReset()
    api.get.mockResolvedValue({ data: { name: 'Pat', role: 'Hiring' } })
    api.post.mockResolvedValue({ data: {} })
  })

  it('renders the job form without duplicating account controls', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.job-form').exists()).toBe(true)
    const labels = wrapper.findAll('button').map((button) => button.text())
    expect(labels).not.toContain('Dashboard')
    expect(labels).not.toContain('Sign out')
  })

  it('redirects non-hiring users back to the dashboard', async () => {
    api.get.mockResolvedValue({ data: { name: 'Pat', role: 'LookingForWork' } })

    const wrapper = mountView()
    const replace = vi.spyOn(router, 'replace')
    await flushPromises()

    expect(wrapper.exists()).toBe(true)
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('shows a validation error when required fields are missing', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('.job-form > .dash-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.job-form__error').text()).toContain('Please fix the highlighted fields below.')
    expect(wrapper.find('#job-title').attributes('aria-invalid')).toBe('true')
    expect(wrapper.findAll('.job-form__error-text').some((el) => el.text() === 'Title is required.')).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('surfaces server-side validation errors under the matching fields', async () => {
    mockPincodeLookup()
    const wrapper = mountView()
    await flushPromises()

    const form = wrapper.find('.job-form')
    await form.find('input[placeholder="e.g. Store Associate"]').setValue('Cashier')
    await form.find('textarea').setValue('Front desk')
    await form.find('input[placeholder="e.g. FreshMart Store"]').setValue('Corner Shop')
    await form.find('input[inputmode="numeric"]').setValue('400050')
    await flushPromises()

    api.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          title: 'One or more validation errors occurred.',
          errors: { SalaryMax: ['Maximum salary must be greater than or equal to minimum salary.'] },
        },
      },
    })

    await wrapper.find('.job-form > .dash-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('#job-salary-max').attributes('aria-invalid')).toBe('true')
    expect(wrapper.findAll('.job-form__error-text').some(
      (el) => el.text() === 'Maximum salary must be greater than or equal to minimum salary.',
    )).toBe(true)
  })

  it('shows a general error message when the request fails without field errors', async () => {
    mockPincodeLookup()
    const wrapper = mountView()
    await flushPromises()

    const form = wrapper.find('.job-form')
    await form.find('input[placeholder="e.g. Store Associate"]').setValue('Cashier')
    await form.find('textarea').setValue('Front desk')
    await form.find('input[placeholder="e.g. FreshMart Store"]').setValue('Corner Shop')
    await form.find('input[inputmode="numeric"]').setValue('400050')
    await flushPromises()

    api.post.mockRejectedValueOnce(new Error('Network down'))

    await wrapper.find('.job-form > .dash-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.job-form__error').text()).toBe('Network down')
  })

  it('submits the job posting and navigates back to the dashboard', async () => {
    mockPincodeLookup()
    const wrapper = mountView()
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    const form = wrapper.find('.job-form')
    await form.find('input[placeholder="e.g. Store Associate"]').setValue('Cashier')
    await form.find('textarea').setValue('Front desk')
    await form.find('input[placeholder="e.g. FreshMart Store"]').setValue('Corner Shop')
    await form.find('input[inputmode="numeric"]').setValue('400050')
    await flushPromises()

    await wrapper.find('.job-form > .dash-btn').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/hiring/jobs', expect.objectContaining({
      title: 'Cashier',
      description: 'Front desk',
      workplaceName: 'Corner Shop',
      cityArea: 'Bandra West, Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
    }))
    expect(push).toHaveBeenCalledWith('/')
  })

  it('navigates to the dashboard when the back button is clicked', async () => {
    const wrapper = mountView()
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    await wrapper.find('.post-job-page__back').trigger('click')

    expect(push).toHaveBeenCalledWith('/')
  })
})
