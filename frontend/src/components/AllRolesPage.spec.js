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
vi.mock('../utils/minimumDelay', () => ({ withMinimumDelay: (task) => task() }))

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
    api.get.mockResolvedValue({ data: { items: [], page: 1, pageSize: 15, totalCount: 0, totalPages: 0 } })
  })

  it('loads and renders every role the employer is hiring for', async () => {
    api.get.mockResolvedValue({
      data: { items: [
        { id: 'j1', title: 'Cashier', workplaceName: 'Shop', cityArea: 'Bandra', state: 'Maharashtra', applicationCount: 4, isActive: true },
      ], page: 1, pageSize: 15, totalCount: 1, totalPages: 1 },
    })

    const wrapper = mountPage()
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/hiring/jobs/paged', {
      params: { status: 'open', page: 1, pageSize: 15 },
    })
    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('1 roles')
    expect(wrapper.text()).toContain('Review applicants')
  })

  it('shows the empty state when there are no roles', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('No open roles yet')
  })

  it('loads fifteen roles per page', async () => {
    const roles = Array.from({ length: 31 }, (_, index) => ({
      id: `j${index}`,
      title: `Role ${index}`,
      isActive: true,
    }))
    api.get.mockImplementation((_url, { params }) => Promise.resolve({ data: {
      items: roles.slice((params.page - 1) * 15, params.page * 15),
      page: params.page, pageSize: 15, totalCount: 31, totalPages: 3,
    } }))
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(15)
    expect(wrapper.text()).toContain('Page 1 of 3')
    await wrapper.find('[aria-label="Page 3 of 3"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('Page 3 of 3')
  })

  it('shows fifteen matching role skeletons while loading', () => {
    api.get.mockReturnValue(new Promise(() => {}))

    const wrapper = mountPage()

    expect(wrapper.findAll('.skeleton-card--role')).toHaveLength(15)
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
      data: { items: [
        { id: 'j1', title: 'Cashier', workplaceName: 'Shop', cityArea: 'Bandra', state: 'Maharashtra', applicationCount: 4, isActive: true },
      ], page: 1, pageSize: 15, totalCount: 1, totalPages: 1 },
    })

    const wrapper = mountPage()
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    await wrapper.find('.hiring-role-card').trigger('mouseenter')
    await wrapper.find('.hiring-role-card__icon').trigger('click')
    expect(push).toHaveBeenCalledWith('/jobs/j1')

    await findButtonByText(wrapper, 'View role').trigger('click')
    expect(push).toHaveBeenCalledWith('/jobs/j1')

    const stats = wrapper.findAll('.hiring-role-card__stat')
    await stats[0].trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'job-applicants', params: { id: 'j1' } })

    await stats[1].trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'job-shortlisted', params: { id: 'j1' } })
  })
})
