<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { MAX_VISIBLE_JOBS } from '../utils/jobDisplay'
import BrandLogo from './BrandLogo.vue'
import Pagination from './ui/Pagination.vue'
import WorkerDashboard from './WorkerDashboard.vue'
import '../hiring-dashboard.css'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const { myApplications, savedJobsPage } = storeToRefs(jobsStore)
const loading = ref(true)
const applying = ref(null)
const error = ref('')

const savedJobs = computed(() => savedJobsPage.value.items)
const totalPages = computed(() => savedJobsPage.value.totalPages)
const currentPage = computed(() => Math.max(Number.parseInt(route.query.page, 10) || 1, 1))

async function load() {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([
      jobsStore.loadSavedJobsPage({ page: currentPage.value, pageSize: MAX_VISIBLE_JOBS }, { force: true }),
      jobsStore.loadMyApplications().catch(() => []),
    ])
  } catch {
    error.value = 'We could not load your saved jobs.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(currentPage, load)

function changePage(page) {
  router.push({ query: { page: page === 1 ? undefined : String(page) } })
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
  <div class="dash-shell worker-saved-jobs">
    <header class="dash-header">
      <BrandLogo @click.prevent="router.push('/')" />
      <div class="dash-header__right">
        <button type="button" class="dash-btn dash-btn--primary" @click="router.push('/')">Back to dashboard</button>
      </div>
    </header>

    <p v-if="error" class="job-form__error worker-saved-jobs__error" role="alert">{{ error }}</p>
    <WorkerDashboard
      list-only
      list-kicker="Saved for later"
      list-title="Saved jobs"
      empty-title="No saved jobs yet"
      empty-text="Save a role from the jobs list or job details to find it here."
      :jobs="savedJobs"
      :total-jobs="savedJobsPage.totalCount"
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
.worker-saved-jobs { --pagination-accent: var(--worker-role-green-text); }
.worker-saved-jobs :deep(.dash-btn--primary) { background: var(--worker-role-gradient); }
.worker-saved-jobs__error { max-width: 1052px; margin: 24px auto 0; }
</style>
