import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as notificationsApi from '../api/notifications.js'

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref([])
  const unreadCount = ref(0)
  const readCount = ref(0)
  const page = ref({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 })
  const loading = ref(false)
  const error = ref('')
  let pendingRequest = null
  let latestPageRequest = 0
  let pageStatus = 'all'

  const unread = computed(() => items.value.filter((item) => !item.isRead))
  const read = computed(() => items.value.filter((item) => item.isRead))

  async function load({ silent = false } = {}) {
    if (pendingRequest) return pendingRequest
    if (!silent) loading.value = true
    error.value = ''

    const request = notificationsApi.getNotifications()
      .then(({ data }) => {
        if (pendingRequest === request) {
          items.value = data.items || []
          unreadCount.value = data.unreadCount || 0
        }
        return data
      })
      .catch((requestError) => {
        if (pendingRequest === request) error.value = 'Could not load notifications.'
        throw requestError
      })
      .finally(() => {
        if (pendingRequest === request) {
          pendingRequest = null
          loading.value = false
        }
      })

    pendingRequest = request
    return request
  }

  async function loadPage(params = {}) {
    const requestId = ++latestPageRequest
    loading.value = true
    error.value = ''
    try {
      const { data } = await notificationsApi.getNotificationsPaged(params)
      if (requestId === latestPageRequest) {
        page.value = data
        pageStatus = params.status || 'all'
        unreadCount.value = data.unreadCount || 0
        readCount.value = data.readCount || 0
      }
      return data
    } catch (requestError) {
      if (requestId === latestPageRequest) error.value = 'Could not load notifications.'
      throw requestError
    } finally {
      if (requestId === latestPageRequest) loading.value = false
    }
  }

  async function markRead(id) {
    const item = items.value.find((notification) => notification.id === id)
      || page.value.items.find((notification) => notification.id === id)
    if (!item || item.isRead) return

    const { data } = await notificationsApi.markNotificationRead(id)
    const index = items.value.findIndex((notification) => notification.id === id)
    const wasUnread = !item.isRead
    if (index >= 0) items.value[index] = data
    if (wasUnread) unreadCount.value = Math.max(0, unreadCount.value - 1)
    const pageIndex = page.value.items.findIndex((notification) => notification.id === id)
    if (pageIndex >= 0) {
      if (wasUnread) readCount.value += 1
      if (pageStatus === 'unread') {
        const totalCount = Math.max(0, page.value.totalCount - 1)
        const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / page.value.pageSize)
        page.value = {
          ...page.value,
          items: page.value.items.filter((notification) => notification.id !== id),
          totalCount,
          totalPages,
        }
        return Math.max(totalPages, 1)
      } else {
        page.value.items[pageIndex] = data
      }
    }
  }

  async function markAllRead() {
    if (!unreadCount.value) return
    await notificationsApi.markAllNotificationsRead()
    items.value = items.value.map((item) => ({ ...item, isRead: true }))
    readCount.value += unreadCount.value
    unreadCount.value = 0
    if (pageStatus === 'unread') page.value = { ...page.value, items: [], totalCount: 0, totalPages: 0 }
    else page.value = { ...page.value, items: page.value.items.map((item) => ({ ...item, isRead: true })) }
  }

  function clear() {
    items.value = []
    unreadCount.value = 0
    readCount.value = 0
    page.value = { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 }
    loading.value = false
    error.value = ''
    pendingRequest = null
    latestPageRequest++
    pageStatus = 'all'
  }

  return { items, unreadCount, readCount, page, loading, error, unread, read, load, loadPage, markRead, markAllRead, clear }
})
