<script setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '../stores/notifications.js'

const store = useNotificationsStore()
const router = useRouter()
const root = useTemplateRef('root')
const open = ref(false)
const tab = ref('unread')
const visibleItems = computed(() => tab.value === 'unread' ? store.unread : store.read)
const previewItems = computed(() => visibleItems.value.slice(0, 5))
let refreshTimer

function toggle() {
  open.value = !open.value
}

function closeOnOutsideClick(event) {
  if (!root.value?.contains(event.target)) open.value = false
}

function formatTime(value) {
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

async function selectNotification(notification) {
  if (!notification.isRead) await store.markRead(notification.id)
  open.value = false
  if (notification.link) await router.push(notification.link)
}

function showAll() {
  open.value = false
  router.push({ name: 'notifications', query: { status: tab.value } })
}

onMounted(() => {
  store.load().catch(() => {})
  document.addEventListener('click', closeOnOutsideClick)
  // ponytail: polling is enough at current scale; replace with push when sub-30-second delivery matters.
  refreshTimer = window.setInterval(() => store.load({ silent: true }).catch(() => {}), 30_000)
})

onUnmounted(() => {
  document.removeEventListener('click', closeOnOutsideClick)
  window.clearInterval(refreshTimer)
})
</script>

<template>
  <div ref="root" class="notification-center" @keydown.esc="open = false">
    <button
      type="button"
      class="notification-center__bell"
      :aria-label="`Notifications, ${store.unreadCount} unread`"
      :aria-expanded="open"
      aria-controls="notification-panel"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
      <span v-if="store.unreadCount" class="notification-center__dot"></span>
    </button>

    <section v-if="open" id="notification-panel" class="notification-center__panel" aria-label="Notifications">
      <header>
        <div>
          <span>Activity</span>
          <h2>Notifications</h2>
        </div>
        <button v-if="store.unreadCount" type="button" class="notification-center__mark-all" @click="store.markAllRead()">
          Mark all read
        </button>
      </header>

      <div class="notification-center__tabs" role="tablist" aria-label="Notification status">
        <button
          v-for="status in ['unread', 'read']"
          :key="status"
          type="button"
          role="tab"
          :aria-selected="tab === status"
          :class="{ active: tab === status }"
          @click="tab = status"
        >
          {{ status }} <span>{{ status === 'unread' ? store.unread.length : store.read.length }}</span>
        </button>
      </div>

      <div class="notification-center__list" role="tabpanel">
        <p v-if="store.loading && !store.items.length" class="notification-center__state">Loading notifications…</p>
        <p v-else-if="store.error && !store.items.length" class="notification-center__state">{{ store.error }}</p>
        <p v-else-if="!visibleItems.length" class="notification-center__state">
          {{ tab === 'unread' ? 'You are all caught up.' : 'No read notifications yet.' }}
        </p>
        <button
          v-for="notification in previewItems"
          v-else
          :key="notification.id"
          type="button"
          class="notification-center__item"
          :class="{ unread: !notification.isRead }"
          @click="selectNotification(notification)"
        >
          <span class="notification-center__item-dot"></span>
          <span>
            <strong>{{ notification.title }}</strong>
            <small>{{ notification.message }}</small>
            <time :datetime="notification.createdAt">{{ formatTime(notification.createdAt) }}</time>
          </span>
          <b aria-hidden="true">→</b>
        </button>
        <button v-if="visibleItems.length > 5" type="button" class="notification-center__show-more" @click="showAll">
          Show more {{ tab }} notifications ({{ visibleItems.length }} total)
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.notification-center { position: fixed; top: 82px; right: 24px; z-index: 185; }
.notification-center__bell { position: relative; display: grid; width: 44px; height: 44px; place-items: center; color: #12324a; border: 1px solid rgba(18,50,74,.12); border-radius: 999px; background: rgba(255,255,255,.94); box-shadow: 0 10px 30px rgba(7,85,154,.12); cursor: pointer; }
.notification-center__bell svg { width: 20px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
.notification-center__bell:hover { color: #07559a; border-color: rgba(7,85,154,.28); }
.notification-center__bell:focus-visible,.notification-center button:focus-visible { outline: 2px solid #07559a; outline-offset: 3px; }
.notification-center__dot { position: absolute; top: 6px; right: 5px; width: 10px; height: 10px; border: 2px solid #fff; border-radius: 50%; background: #dc3545; }
.notification-center__panel { position: absolute; top: 56px; right: 0; width: min(420px,calc(100vw - 32px)); overflow: hidden; color: #12324a; border: 1px solid rgba(7,85,154,.12); border-radius: 22px; background: #f8fcfd; box-shadow: 0 28px 80px rgba(7,85,154,.2); animation: enter .2s ease-out; }
.notification-center__panel header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px 22px 16px; }
.notification-center__panel header span { color: #168caa; font: 700 10px ui-monospace,monospace; text-transform: uppercase; letter-spacing: .12em; }
.notification-center__panel h2 { margin: 3px 0 0; font: 800 22px/1.2 Manrope,sans-serif; letter-spacing: -.03em; }
.notification-center__mark-all { padding: 0; color: #07559a; border: 0; background: none; font-size: 12px; font-weight: 800; cursor: pointer; }
.notification-center__tabs { display: flex; gap: 4px; padding: 0 18px 14px; border-bottom: 1px solid rgba(18,50,74,.09); }
.notification-center__tabs button { padding: 8px 10px; color: #718894; border: 0; border-radius: 999px; background: transparent; font-size: 12px; font-weight: 800; text-transform: capitalize; cursor: pointer; }
.notification-center__tabs button.active { color: #07559a; background: #e4f2f7; }
.notification-center__tabs span { display: inline-grid; min-width: 20px; height: 20px; margin-left: 3px; place-items: center; border-radius: 999px; background: rgba(7,85,154,.09); font-size: 10px; }
.notification-center__list { max-height: min(520px,calc(100vh - 180px)); overflow-y: auto; padding: 8px; }
.notification-center__item { display: grid; grid-template-columns: auto 1fr auto; gap: 11px; align-items: start; width: 100%; padding: 14px; color: inherit; text-align: left; border: 0; border-radius: 15px; background: transparent; cursor: pointer; }
.notification-center__item:hover { background: #edf6f8; }
.notification-center__item.unread { background: #eaf5fa; }
.notification-center__item > span:nth-child(2) { display: grid; gap: 4px; }
.notification-center__item-dot { width: 8px; height: 8px; margin-top: 5px; border-radius: 50%; background: #b9ccd5; }
.notification-center__item.unread .notification-center__item-dot { background: #dc3545; }
.notification-center__item strong { font-size: 13px; }
.notification-center__item small { color: #526b78; font-size: 12px; line-height: 1.45; }
.notification-center__item time { color: #80939d; font-size: 10px; }
.notification-center__item b { margin-top: 2px; color: #168caa; }
.notification-center__state { margin: 0; padding: 48px 20px; color: #718894; text-align: center; font-size: 13px; }
.notification-center__show-more { width: calc(100% - 12px); margin: 6px; padding: 11px 14px; color: #07559a; border: 1px solid rgba(7,85,154,.2); border-radius: 999px; background: #fff; font-size: 12px; font-weight: 800; cursor: pointer; }
.notification-center__show-more:hover { background: #edf6f8; border-color: rgba(7,85,154,.4); }
@keyframes enter { from { opacity: 0; transform: translateY(-6px) scale(.98); } }
@media (max-width: 520px) { .notification-center { right: 16px; }.notification-center__panel { position: fixed; top: 138px; right: 16px; left: 16px; width: auto; max-height: calc(100dvh - 154px); overflow-y: auto; } }
@media (prefers-reduced-motion: reduce) { .notification-center__panel { animation: none; } }
</style>
