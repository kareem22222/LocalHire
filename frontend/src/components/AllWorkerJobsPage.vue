<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { useProfileStore } from '../stores/profile'
import { MAX_VISIBLE_JOBS } from '../utils/jobDisplay'
import { withMinimumDelay } from '../utils/minimumDelay'
import BrandLogo from './BrandLogo.vue'
import Pagination from './ui/Pagination.vue'
import WorkerDashboard from './WorkerDashboard.vue'
import '../hiring-dashboard.css'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const profileStore = useProfileStore()
const { myApplications, workerJobsPage } = storeToRefs(jobsStore)
const { profile } = storeToRefs(profileStore)
const loading = ref(true)
const applying = ref(null)
const error = ref('')

const jobs = computed(() => workerJobsPage.value.items)
const totalPages = computed(() => workerJobsPage.value.totalPages)
const currentPage = computed(() => Math.max(Number.parseInt(route.query.page, 10) || 1, 1))

function buildParams() {
  const params = {}
  if (profile.value?.latitude != null && profile.value?.longitude != null) {
    params.lat = profile.value.latitude
    params.lng = profile.value.longitude
  }
  if (route.query.search) params.search = route.query.search.toString()
  if (route.query.employmentType) params.employmentType = route.query.employmentType.toString()
  params.page = currentPage.value
  params.pageSize = MAX_VISIBLE_JOBS
  return params
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await withMinimumDelay(async () => {
      await profileStore.fetchProfile().catch(() => {})
      await jobsStore.loadWorkerJobsPage(buildParams(), { force: true })
      await jobsStore.loadMyApplications()
    })
  } catch {
    error.value = 'We could not load roles right now. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => route.query.page, load)
watch([() => route.query.search, () => route.query.employmentType], () => {
  if (route.query.page) router.replace({ query: { ...route.query, page: undefined } })
  else load()
})

function changePage(page) {
  router.push({ query: { ...route.query, page: page === 1 ? undefined : String(page) } })
}

async function apply(jobId) {
  error.value = ''
  applying.value = jobId
  try {
    await jobsStore.applyToJob(jobId)
    await jobsStore.loadMyApplications({ force: true })
  } catch (requestError) {
    error.value = requestError.response?.data?.message || 'Failed to apply.'
  } finally {
    applying.value = null
  }
}
</script>

<template>
  <div class="dash-shell worker-all-jobs">
    <header class="dash-header">
      <BrandLogo @click.prevent="router.push('/')" />
      <div class="dash-header__right">
        <button type="button" class="dash-btn dash-btn--primary" @click="router.push('/')">Back to dashboard</button>
      </div>
    </header>

    <p v-if="error" class="job-form__error worker-all-jobs__error" role="alert">{{ error }}</p>
    <WorkerDashboard
      list-only
      :jobs="jobs"
      :total-jobs="workerJobsPage.totalCount"
      :applications="myApplications"
      :loading="loading"
      :applying="applying"
      @open-job="router.push({ name: 'worker-job-detail', params: { id: $event } })"
      @apply="apply"
    >
      <Pagination :page="currentPage" :total-pages="totalPages" @change="changePage" />
    </WorkerDashboard>
  </div>
</template>

<style scoped>
.worker-all-jobs { --pagination-accent: var(--worker-role-green-text); }
.worker-all-jobs :deep(.dash-btn--primary) { background: var(--worker-role-gradient); }
.worker-all-jobs__error { max-width: 1052px; margin: 24px auto 0; }
</style>
