<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { useProfileStore } from '../stores/profile'
import { MAX_VISIBLE_JOBS } from '../utils/jobDisplay'
import { withMinimumDelay } from '../utils/minimumDelay'
import BrandLogo from './BrandLogo.vue'
import ListPagination from './ListPagination.vue'
import WorkerDashboard from './WorkerDashboard.vue'
import '../hiring-dashboard.css'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const profileStore = useProfileStore()
const { myApplications } = storeToRefs(jobsStore)
const { profile } = storeToRefs(profileStore)
const jobs = ref([])
const loading = ref(true)
const applying = ref(null)
const error = ref('')

const totalPages = computed(() => Math.ceil(jobs.value.length / MAX_VISIBLE_JOBS))
const currentPage = computed(() => Math.min(Math.max(Number.parseInt(route.query.page, 10) || 1, 1), totalPages.value || 1))
const visibleJobs = computed(() => jobs.value.slice((currentPage.value - 1) * MAX_VISIBLE_JOBS, currentPage.value * MAX_VISIBLE_JOBS))

function buildParams() {
  const params = {}
  if (profile.value?.latitude != null && profile.value?.longitude != null) {
    params.lat = profile.value.latitude
    params.lng = profile.value.longitude
  }
  if (route.query.search) params.search = route.query.search.toString()
  if (route.query.employmentType) params.employmentType = route.query.employmentType.toString()
  return params
}

onMounted(async () => {
  try {
    await withMinimumDelay(async () => {
      await profileStore.fetchProfile().catch(() => {})
      jobs.value = await jobsStore.loadNearbyJobs(buildParams(), { force: true })
      await jobsStore.loadMyApplications()
    })
  } catch {
    error.value = 'We could not load roles right now. Please try again.'
  } finally {
    loading.value = false
  }
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
      :jobs="visibleJobs"
      :total-jobs="jobs.length"
      :applications="myApplications"
      :loading="loading"
      :applying="applying"
      @open-job="router.push({ name: 'worker-job-detail', params: { id: $event } })"
      @apply="apply"
    >
      <ListPagination :page="currentPage" :total-pages="totalPages" @change="changePage" />
    </WorkerDashboard>
  </div>
</template>

<style scoped>
.worker-all-jobs { --pagination-accent: var(--worker-role-green-text); }
.worker-all-jobs :deep(.dash-btn--primary) { background: var(--worker-role-gradient); }
.worker-all-jobs__error { max-width: 1052px; margin: 24px auto 0; }
</style>
