import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { createTestRouter } from '../test/router'
import InvitationsPage from './InvitationsPage.vue'

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))

describe('InvitationsPage', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: [{ id: 'invite-1', jobPostId: 'job-1', jobTitle: 'Cashier', workplaceName: 'Local Mart', status: 'Pending', createdAt: '2026-09-16T00:00:00Z' }] })
    api.post.mockResolvedValue({ data: { id: 'invite-1', jobPostId: 'job-1', jobTitle: 'Cashier', workplaceName: 'Local Mart', status: 'Declined', createdAt: '2026-09-16T00:00:00Z' } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('lets a worker inspect or decline without creating an application', async () => {
    const router = createTestRouter()
    await router.push('/work/invitations')
    const wrapper = mount(InvitationsPage, { global: { plugins: [router], stubs: { BrandLogo: true } } })
    await flushPromises()

    expect(wrapper.text()).toContain('Cashier')
    await wrapper.findAll('button').find((button) => button.text() === 'Decline').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/work/invitations/invite-1/decline')
    expect(wrapper.text()).toContain('Declined')
    expect(api.post).not.toHaveBeenCalledWith('/work/jobs/job-1/apply')
  })
})
