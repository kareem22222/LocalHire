<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import BrandLogo from './BrandLogo.vue'
import CandidateCard from './CandidateCard.vue'
import Pagination from './ui/Pagination.vue'
import { MAX_VISIBLE_CANDIDATES } from '../utils/jobDisplay'
import '../hiring-dashboard.css'

const props = defineProps({
  // 'all' shows every applicant; 'shortlisted' shows only shortlisted ones.
  filter: { type: String, default: 'all' },
})

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()

const loading = ref(false)
const error = ref('')
const job = ref(null)
const applicants = computed(() => jobsStore.jobApplicationsPage.items)
const deciding = ref(null)

const jobId = computed(() => route.params.id)
const isShortlistedView = computed(() => props.filter === 'shortlisted')

// Map an applicant DTO onto the shape CandidateCard expects. The card's `id` is
// the worker id (so clicking opens that worker's detail page); the application id
// is preserved separately for the server-side shortlist action.
function toCandidate(applicant) {
  return {
    id: applicant.workerId,
    applicationId: applicant.id,
    name: applicant.workerName,
    role: applicant.role,
    area: applicant.area,
    state: applicant.state,
    pincode: applicant.pincode,
    status: applicant.status,
    matchScore: null,
    distanceKm: null,
  }
}

const visibleApplicants = computed(() => applicants.value.map(toCandidate))
const totalPages = computed(() => jobsStore.jobApplicationsPage.totalPages)
const currentPage = computed(() => Math.max(Number.parseInt(route.query.page, 10) || 1, 1))
const paginatedApplicants = computed(() => visibleApplicants.value)

const heading = computed(() => {
  const roleTitle = job.value?.title ? `${job.value.title} - ` : ''
  const place = job.value ? `${roleTitle}${job.value.workplaceName || ''}`.trim() : ''
  return place || (isShortlistedView.value ? 'Shortlisted candidates' : 'Applied candidates')
})

const kicker = computed(() => (isShortlistedView.value ? 'Shortlisted' : 'Applicants'))
const emptyText = computed(() =>
  isShortlistedView.value
    ? 'No candidates shortlisted yet. Open the applicants list and shortlist the ones you like.'
    : 'No one has applied to this role yet.',
)

let loadGeneration = 0

async function load() {
  const generation = ++loadGeneration
  const id = jobId.value
  loading.value = true
  error.value = ''
  job.value = null
  try {
    const [jobData] = await Promise.all([
      jobsStore.loadJob(id).catch(() => null),
      jobsStore.loadJobApplicationsPage(id, {
        status: isShortlistedView.value ? 'Shortlisted' : undefined,
        page: currentPage.value,
        pageSize: MAX_VISIBLE_CANDIDATES,
      }, { force: true }),
    ])
    if (generation === loadGeneration) {
      job.value = jobData
    }
  } catch {
    if (generation === loadGeneration) error.value = 'We could not load the candidates for this role.'
  } finally {
    if (generation === loadGeneration) loading.value = false
  }
}

onMounted(load)
watch(currentPage, load)
watch([jobId, isShortlistedView], () => {
  if (route.query.page) router.replace({ query: { ...route.query, page: undefined } })
  else load()
})

function changePage(page) {
  router.push({ query: { ...route.query, page: page === 1 ? undefined : String(page) } })
}

function goBack() {
  router.push('/')
}

function openCandidate(candidate) {
  router.push({ name: 'candidate-detail', params: { id: candidate.id } })
}

function contact(candidate) {
  router.push({ name: 'candidate-detail', params: { id: candidate.id }, query: { contact: '1' } })
}

async function shortlist(candidate) {
  if (candidate.status !== 'Applied') return
  await decide(candidate, jobsStore.shortlistApplicant, 'Could not shortlist this candidate. Please try again.')
}

async function hire(candidate) {
  if (candidate.status !== 'Shortlisted') return
  await decide(candidate, jobsStore.hireApplicant, 'Could not hire this candidate. Please try again.')
}

async function reject(candidate) {
  if (!['Applied', 'Shortlisted'].includes(candidate.status)) return
  if (!window.confirm(`Reject ${candidate.name}? This decision cannot be undone.`)) return
  await decide(candidate, jobsStore.rejectApplicant, 'Could not reject this candidate. Please try again.')
}

async function decide(candidate, request, message) {
  if (deciding.value === candidate.applicationId) return
  error.value = ''
  deciding.value = candidate.applicationId
  try {
    await request(jobId.value, candidate.applicationId)
    await load()
    if (!applicants.value.length && currentPage.value > 1)
      changePage(currentPage.value - 1)
  } catch {
    error.value = message
  } finally {
    deciding.value = null
  }
}
</script>

<template>
  <div class="dash-shell">
    <header class="dash-header">
      <BrandLogo @click.prevent="goBack" />
      <div class="dash-header__right">
        <button type="button" class="dash-btn dash-btn--primary" @click="goBack">Back to dashboard</button>
      </div>
    </header>

    <main class="hiring-dashboard">
      <section class="candidate-list">
        <div class="candidate-list__head">
          <div>
            <span class="hiring-kicker">{{ kicker }}</span>
            <h2>{{ heading }}</h2>
          </div>
          <span>{{ jobsStore.jobApplicationsPage.totalCount }} {{ isShortlistedView ? 'shortlisted' : 'applicants' }}</span>
        </div>

        <p v-if="error" class="job-form__error" role="alert">{{ error }}</p>

        <div v-if="loading" class="candidate-empty">
          <strong>Loading candidates...</strong>
          <p>Fetching the people connected to this role.</p>
        </div>

        <template v-else>
          <CandidateCard
            v-for="candidate in paginatedApplicants"
            :key="candidate.applicationId"
            :candidate="candidate"
            :shortlisted="candidate.status === 'Shortlisted'"
            :busy="deciding === candidate.applicationId"
            @select="openCandidate"
            @shortlist="shortlist"
            @hire="hire"
            @reject="reject"
            @contact="contact"
          />

          <Pagination :page="currentPage" :total-pages="totalPages" @change="changePage" />

          <div v-if="!visibleApplicants.length" class="candidate-empty">
            <strong>Nothing here yet</strong>
            <p>{{ emptyText }}</p>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
