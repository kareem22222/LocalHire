import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as notificationsApi from '../api/notifications.js'
import { createTestRouter } from '../test/router.js'
import NotificationsPage from './NotificationsPage.vue'

vi.mock('../api/notifications.js', () => ({
  getNotifications: vi.fn(),
  getNotificationsPaged: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))

describe('NotificationsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('paginates notification activity for both roles', async () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      id: `notification-${index}`,
      title: `Update ${index}`,
      message: 'A job changed.',
      isRead: false,
      createdAt: '2026-07-27T10:00:00Z',
    }))
    notificationsApi.getNotificationsPaged.mockImplementation(({ page }) => Promise.resolve({ data: {
      items: items.slice((page - 1) * 10, page * 10),
      page, pageSize: 10, totalCount: 11, totalPages: 2,
      unreadCount: 11, readCount: 0,
    } }))
    const router = createTestRouter()
    await router.push('/notifications?status=unread')
    const wrapper = mount(NotificationsPage, {
      global: { plugins: [createPinia(), router], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    expect(wrapper.findAll('.notifications-page__item')).toHaveLength(10)
    await wrapper.find('[aria-label="Page 2 of 2"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.notifications-page__item')).toHaveLength(1)
    expect(wrapper.text()).toContain('Page 2 of 2')
    expect(notificationsApi.getNotificationsPaged).toHaveBeenLastCalledWith({
      status: 'unread', page: 2, pageSize: 10,
    })
  })
})
