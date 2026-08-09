import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as notificationsApi from '../api/notifications.js'
import { useNotificationsStore } from './notifications.js'

vi.mock('../api/notifications.js', () => ({
  getNotifications: vi.fn(),
  getNotificationsPaged: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))

const unreadItem = { id: 'notification-1', title: 'New application', isRead: false }
const readItem = { id: 'notification-2', title: 'Job updated', isRead: true }

describe('notifications store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads and segregates unread and read notifications', async () => {
    notificationsApi.getNotifications.mockResolvedValue({ data: { items: [unreadItem, readItem], unreadCount: 1 } })
    const store = useNotificationsStore()

    await store.load()

    expect(store.unread.map(({ id }) => id)).toEqual(['notification-1'])
    expect(store.read.map(({ id }) => id)).toEqual(['notification-2'])
    expect(store.unreadCount).toBe(1)
  })

  it('marks one or all notifications as read', async () => {
    notificationsApi.getNotifications.mockResolvedValue({ data: { items: [unreadItem, readItem], unreadCount: 1 } })
    notificationsApi.markNotificationRead.mockResolvedValue({ data: { ...unreadItem, isRead: true } })
    notificationsApi.markAllNotificationsRead.mockResolvedValue({ data: null })
    const store = useNotificationsStore()
    await store.load()

    await store.markRead(unreadItem.id)
    expect(store.unreadCount).toBe(0)
    expect(store.read).toHaveLength(2)

    store.items = [{ ...unreadItem }, readItem]
    store.unreadCount = 1
    await store.markAllRead()
    expect(store.unreadCount).toBe(0)
    expect(store.items.every((item) => item.isRead)).toBe(true)
  })

  it('updates the matching current item when a read request resolves', async () => {
    let resolveRead
    notificationsApi.markNotificationRead.mockReturnValue(new Promise((resolve) => { resolveRead = resolve }))
    const store = useNotificationsStore()
    store.items = [{ ...unreadItem }, { ...readItem }]
    store.unreadCount = 1

    const pending = store.markRead(unreadItem.id)
    store.items = [{ ...readItem }, { ...unreadItem }]
    resolveRead({ data: { ...unreadItem, isRead: true } })
    await pending

    expect(store.items.map(({ id }) => id)).toEqual(['notification-2', 'notification-1'])
    expect(store.items[1].isRead).toBe(true)
    expect(store.unreadCount).toBe(0)
  })

  it('recalculates unread page metadata after removing an item', async () => {
    notificationsApi.getNotificationsPaged.mockResolvedValue({ data: {
      items: [{ ...unreadItem }], page: 2, pageSize: 1, totalCount: 2, totalPages: 2,
      unreadCount: 2, readCount: 0,
    } })
    notificationsApi.markNotificationRead.mockResolvedValue({ data: { ...unreadItem, isRead: true } })
    const store = useNotificationsStore()
    await store.loadPage({ status: 'unread', page: 2, pageSize: 1 })

    const lastPage = await store.markRead(unreadItem.id)

    expect(store.page).toMatchObject({ items: [], totalCount: 1, totalPages: 1 })
    expect(lastPage).toBe(1)
  })
})
