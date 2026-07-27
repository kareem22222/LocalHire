import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as notificationsApi from '../api/notifications.js'

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref('')
  let pendingRequest = null

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

  async function markRead(id) {
    const index = items.value.findIndex((item) => item.id === id)
    if (index < 0 || items.value[index].isRead) return

    const { data } = await notificationsApi.markNotificationRead(id)
    items.value[index] = data
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  async function markAllRead() {
    if (!unreadCount.value) return
    await notificationsApi.markAllNotificationsRead()
    items.value = items.value.map((item) => ({ ...item, isRead: true }))
    unreadCount.value = 0
  }

  function clear() {
    items.value = []
    unreadCount.value = 0
    loading.value = false
    error.value = ''
    pendingRequest = null
  }

  return { items, unreadCount, loading, error, unread, read, load, markRead, markAllRead, clear }
})
