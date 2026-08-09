<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationsStore } from '../stores/notifications.js'
import BrandLogo from './BrandLogo.vue'
import Pagination from './ui/Pagination.vue'
import '../hiring-dashboard.css'

const route = useRoute()
const router = useRouter()
const store = useNotificationsStore()
const pageSize = 10

const status = computed(() => route.query.status === 'read' ? 'read' : 'unread')
const items = computed(() => store.page.items)
const totalPages = computed(() => store.page.totalPages)
const currentPage = computed(() => Math.max(Number.parseInt(route.query.page, 10) || 1, 1))

const load = () => store.loadPage({ status: status.value, page: currentPage.value, pageSize }).catch(() => {})
onMounted(load)
watch([status, currentPage], load)

function changeStatus(nextStatus) {
  router.push({ query: { status: nextStatus, page: undefined } })
}

function changePage(page) {
  router.push({ query: { ...route.query, page: page === 1 ? undefined : String(page) } })
}

function formatTime(value) {
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

async function selectNotification(notification) {
  const lastPage = !notification.isRead && await store.markRead(notification.id)
  if (!notification.link && lastPage && currentPage.value > lastPage) {
    await router.replace({ query: { ...route.query, page: lastPage === 1 ? undefined : String(lastPage) } })
  }
  if (notification.link) await router.push(notification.link)
}
</script>

<template>
  <div class="dash-shell">
    <header class="dash-header">
      <BrandLogo @click.prevent="router.push('/')" />
      <div class="dash-header__right">
        <button type="button" class="dash-btn dash-btn--primary" @click="router.push('/')">Back to dashboard</button>
      </div>
    </header>

    <main class="hiring-dashboard notifications-page">
      <section class="notifications-page__card">
        <header class="notifications-page__head">
          <div><span class="hiring-kicker">Activity</span><h1>All notifications</h1></div>
          <button v-if="store.unreadCount" type="button" class="notifications-page__mark-all" @click="store.markAllRead()">Mark all read</button>
        </header>

        <div class="notifications-page__tabs" role="tablist" aria-label="Notification status">
          <button v-for="itemStatus in ['unread','read']" :key="itemStatus" type="button" role="tab" :aria-selected="status === itemStatus" :class="{ active: status === itemStatus }" @click="changeStatus(itemStatus)">
            {{ itemStatus }} <span>{{ itemStatus === 'unread' ? store.unreadCount : store.readCount }}</span>
          </button>
        </div>

        <p v-if="store.loading && !store.items.length" class="notifications-page__state">Loading notifications…</p>
        <p v-else-if="store.error && !store.items.length" class="notifications-page__state" role="alert">{{ store.error }}</p>
        <p v-else-if="!items.length" class="notifications-page__state">{{ status === 'unread' ? 'You are all caught up.' : 'No read notifications yet.' }}</p>
        <div v-else class="notifications-page__list">
          <button v-for="notification in items" :key="notification.id" type="button" class="notifications-page__item" :class="{ unread: !notification.isRead }" @click="selectNotification(notification)">
            <i></i>
            <span><strong>{{ notification.title }}</strong><small>{{ notification.message }}</small><time :datetime="notification.createdAt">{{ formatTime(notification.createdAt) }}</time></span>
            <b aria-hidden="true">→</b>
          </button>
        </div>

        <Pagination :page="currentPage" :total-pages="totalPages" @change="changePage" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.notifications-page__card { padding: clamp(20px,4vw,34px); border: 1px solid rgba(18,50,74,.08); border-radius: 24px; background: rgba(255,255,255,.9); box-shadow: 0 18px 54px rgba(7,85,154,.08); }
.notifications-page__head { display: flex; align-items: end; justify-content: space-between; gap: 20px; }.notifications-page__head h1 { color: #0b3658; font: 800 clamp(30px,5vw,44px)/1.1 Manrope,sans-serif; letter-spacing: -.04em; }
.notifications-page__mark-all { padding: 10px 14px; color: #07559a; border: 1px solid rgba(7,85,154,.2); border-radius: 999px; background: #fff; font-weight: 800; cursor: pointer; }
.notifications-page__tabs { display: flex; gap: 7px; margin-top: 24px; padding-bottom: 18px; border-bottom: 1px solid rgba(18,50,74,.09); }.notifications-page__tabs button { padding: 9px 13px; color: #718894; border: 0; border-radius: 999px; background: transparent; font-weight: 800; text-transform: capitalize; cursor: pointer; }.notifications-page__tabs button.active { color: #07559a; background: #e4f2f7; }.notifications-page__tabs span { display: inline-grid; min-width: 21px; height: 21px; margin-left: 4px; place-items: center; border-radius: 999px; background: rgba(7,85,154,.09); font-size: 10px; }
.notifications-page__list { display: grid; gap: 10px; margin-top: 18px; }.notifications-page__item { display: grid; grid-template-columns: auto 1fr auto; gap: 13px; align-items: start; width: 100%; padding: 18px; color: #12324a; text-align: left; border: 1px solid rgba(18,50,74,.08); border-radius: 16px; background: #fff; cursor: pointer; }.notifications-page__item:hover { border-color: rgba(7,85,154,.25); background: #f6fbfc; }.notifications-page__item.unread { background: #edf7fa; }.notifications-page__item i { width: 9px; height: 9px; margin-top: 5px; border-radius: 50%; background: #b9ccd5; }.notifications-page__item.unread i { background: #dc3545; }.notifications-page__item > span { display: grid; gap: 5px; }.notifications-page__item small { color: #526b78; line-height: 1.5; }.notifications-page__item time { color: #80939d; font-size: 11px; }.notifications-page__item b { color: #168caa; }
.notifications-page__item:focus-visible,.notifications-page__tabs button:focus-visible,.notifications-page__mark-all:focus-visible { outline: 3px solid rgba(7,85,154,.24); outline-offset: 2px; }.notifications-page__state { padding: 64px 20px; color: #718894; text-align: center; }
@media (max-width: 560px) { .notifications-page__head { align-items: start; flex-direction: column; }.notifications-page__item { padding: 14px; } }
</style>
