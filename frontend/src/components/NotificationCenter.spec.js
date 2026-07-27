import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as notificationsApi from '../api/notifications.js'
import { createTestRouter } from '../test/router.js'
import NotificationCenter from './NotificationCenter.vue'

vi.mock('../api/notifications.js', () => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))

const unreadItem = {
  id: 'notification-1',
  title: 'You were shortlisted',
  message: 'Corner Cafe shortlisted you for Barista.',
  link: '/work/jobs/job-1',
  isRead: false,
  createdAt: '2026-07-27T10:00:00Z',
}
const readItem = {
  id: 'notification-2',
  title: 'Job updated',
  message: 'A role you applied for changed.',
  link: '/work/jobs/job-2',
  isRead: true,
  createdAt: '2026-07-26T10:00:00Z',
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notificationsApi.getNotifications.mockResolvedValue({ data: { items: [unreadItem, readItem], unreadCount: 1 } })
    notificationsApi.markNotificationRead.mockResolvedValue({ data: { ...unreadItem, isRead: true } })
    notificationsApi.markAllNotificationsRead.mockResolvedValue({ data: null })
  })

  it('shows the unread dot, segregates tabs, and opens a notification link', async () => {
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()
    const wrapper = mount(NotificationCenter, { global: { plugins: [createPinia(), router] } })
    await flushPromises()

    expect(wrapper.find('.notification-center__dot').exists()).toBe(true)
    await wrapper.find('.notification-center__bell').trigger('click')
    expect(wrapper.text()).toContain('You were shortlisted')
    expect(wrapper.text()).not.toContain('Job updated')

    await wrapper.findAll('[role="tab"]')[1].trigger('click')
    expect(wrapper.text()).toContain('Job updated')
    expect(wrapper.text()).not.toContain('You were shortlisted')

    await wrapper.findAll('[role="tab"]')[0].trigger('click')
    await wrapper.find('.notification-center__item').trigger('click')
    await flushPromises()

    expect(notificationsApi.markNotificationRead).toHaveBeenCalledWith('notification-1')
    expect(router.currentRoute.value.fullPath).toBe('/work/jobs/job-1')
    wrapper.unmount()
  })

  it('marks every unread notification as read', async () => {
    const wrapper = mount(NotificationCenter, { global: { plugins: [createPinia(), createTestRouter()] } })
    await flushPromises()
    await wrapper.find('.notification-center__bell').trigger('click')
    await wrapper.find('.notification-center__mark-all').trigger('click')
    await flushPromises()

    expect(notificationsApi.markAllNotificationsRead).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.notification-center__dot').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps the panel short and opens the full notifications page', async () => {
    const items = Array.from({ length: 6 }, (_, index) => ({ ...unreadItem, id: `notification-${index}` }))
    notificationsApi.getNotifications.mockResolvedValue({ data: { items, unreadCount: items.length } })
    const router = createTestRouter()
    await router.push('/')
    const wrapper = mount(NotificationCenter, { global: { plugins: [createPinia(), router] } })
    await flushPromises()
    await wrapper.find('.notification-center__bell').trigger('click')

    expect(wrapper.findAll('.notification-center__item')).toHaveLength(5)
    await wrapper.get('.notification-center__show-more').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/notifications?status=unread')
    wrapper.unmount()
  })
})
