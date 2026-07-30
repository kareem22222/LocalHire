<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSavedJobs } from '../composables/useSavedJobs'
import { useJobsStore } from '../stores/jobs'
import { MAX_VISIBLE_JOBS } from '../utils/jobDisplay'
import BrandLogo from './BrandLogo.vue'
import Pagination from './ui/Pagination.vue'
import WorkerDashboard from './WorkerDashboard.vue'
import '../hiring-dashboard.css'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const { myApplications } = storeToRefs(jobsStore)
const { saved, load: loadSavedJobs } = useSavedJobs()
const jobs = ref([])
const loading = ref(true)
const applying = ref(null)
const error = ref('')

const savedJobs = computed(() => jobs.value.filter((job) => saved.value.has(job.id)))
const totalPages = computed(() => Math.ceil(savedJobs.value.length / MAX_VISIBLE_JOBS))
const currentPage = computed(() => Math.min(Math.max(Number.parseInt(route.query.page, 10) || 1, 1), totalPages.value || 1))
const visibleJobs = computed(() => savedJobs.value.slice((currentPage.value - 1) * MAX_VISIBLE_JOBS, currentPage.value * MAX_VISIBLE_JOBS))

onMounted(async () => {
  try {
    await loadSavedJobs()
    const [jobResults] = await Promise.all([
      Promise.allSettled([...saved.value].map((id) => jobsStore.loadWorkerJob(id))),
      jobsStore.loadMyApplications().catch(() => []),
    ])
    jobs.value = jobResults.filter((result) => result.status === 'fulfilled').map((result) => result.value)
    if (jobResults.some((result) => result.status === 'rejected')) error.value = 'Some saved jobs are no longer available.'
  } catch {
    error.value = 'We could not load your saved jobs.'
  } finally {
    loading.value = false
  }
})

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
      :jobs="visibleJobs"
      :total-jobs="savedJobs.length"
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
