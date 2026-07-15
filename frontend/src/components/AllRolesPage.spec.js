import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AllRolesPage from './AllRolesPage.vue'
import api from '../api'
import { createTestRouter } from '../test/router'

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

let router

function mountPage() {
  router = createTestRouter()
  return mount(AllRolesPage, {
    global: {
      plugins: [router],
      stubs: { BrandLogo: true },
    },
  })
}

function findButtonByText(wrapper, text) {
  return wrapper.findAll('button').find((button) => button.text() === text)
}

describe('AllRolesPage', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.get.mockResolvedValue({ data: [] })
  })

  it('loads and renders every role the employer is hiring for', async () => {
    api.get.mockResolvedValue({
      data: [
        { id: 'j1', title: 'Cashier', workplaceName: 'Shop', cityArea: 'Bandra', state: 'Maharashtra', applicationCount: 4, isActive: true },
        { id: 'j2', title: 'Driver', workplaceName: 'Depot', cityArea: 'Pune', state: 'Maharashtra', applicationCount: 0, isActive: false },
      ],
    })

    const wrapper = mountPage()
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/hiring/jobs')
    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('2 roles')
    expect(wrapper.text()).toContain('Inactive')
    expect(wrapper.text()).toContain('Review applicants')
  })

  it('shows the empty state when there are no roles', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('No open roles yet')
  })

  it('logs failures when roles cannot be loaded', async () => {
    const error = new Error('network error')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.get.mockRejectedValue(error)

    const wrapper = mountPage()
    await flushPromises()

    expect(log).toHaveBeenCalledWith('Failed to load roles.', error)
    expect(wrapper.text()).not.toContain('Loading roles...')
    log.mockRestore()
  })

  it('navigates back to the dashboard', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    await findButtonByText(wrapper, 'Back to dashboard').trigger('click')

    expect(push).toHaveBeenCalledWith('/')
  })

  it('navigates to a role detail page from the view controls', async () => {
    api.get.mockResolvedValue({
      data: [
        { id: 'j1', title: 'Cashier', workplaceName: 'Shop', cityArea: 'Bandra', state: 'Maharashtra', applicationCount: 4, isActive: true },
      ],
    })

    const wrapper = mountPage()
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    await wrapper.find('.hiring-role-card__icon').trigger('click')
    expect(push).toHaveBeenCalledWith('/jobs/j1')

    await findButtonByText(wrapper, 'View role').trigger('click')
    expect(push).toHaveBeenCalledWith('/jobs/j1')
  })
})
