import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { createTestRouter } from '../test/router'
import ShortlistsPage from './ShortlistsPage.vue'

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

let router

async function mountPage() {
  router = createTestRouter()
  router.push('/hiring/shortlists')
  await router.isReady()
  return mount(ShortlistsPage, {
    global: { plugins: [router], stubs: { BrandLogo: true } },
  })
}

describe('ShortlistsPage', () => {
  beforeEach(() => api.get.mockReset())

  it('shows only roles with shortlists and routes every role action', async () => {
    api.get.mockResolvedValue({
      data: [
        { id: 'job-1', title: 'Cashier', workplaceName: 'Corner Shop', applicationCount: 3, shortlistedCount: 2, isActive: true },
        { id: 'job-2', title: 'Driver', applicationCount: 1, shortlistedCount: 0, isActive: true },
      ],
    })
    const wrapper = await mountPage()
    await flushPromises()
    const push = vi.spyOn(router, 'push').mockResolvedValue()

    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('2 shortlisted across 1 role')
    await wrapper.find('.hiring-role-card__icon').trigger('click')
    const stats = wrapper.findAll('.hiring-role-card__stat')
    await stats[0].trigger('click')
    await stats[1].trigger('click')
    await wrapper.find('.hiring-role-card__link').trigger('click')
    await wrapper.find('.dash-header button').trigger('click')

    expect(push).toHaveBeenCalledWith('/jobs/job-1')
    expect(push).toHaveBeenCalledWith({ name: 'job-applicants', params: { id: 'job-1' } })
    expect(push).toHaveBeenCalledWith({ name: 'job-shortlisted', params: { id: 'job-1' } })
    expect(push).toHaveBeenCalledWith('/')
  })

  it('shows the empty state when there are no shortlisted roles', async () => {
    api.get.mockResolvedValue({ data: [] })
    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('No shortlists yet')
  })
})
