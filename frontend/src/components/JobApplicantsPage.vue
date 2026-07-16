<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import BrandLogo from './BrandLogo.vue'
import CandidateCard from './CandidateCard.vue'
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
const applicants = ref([])
const shortlisting = ref(null)

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

const visibleApplicants = computed(() => {
  const mapped = applicants.value.map(toCandidate)
  return isShortlistedView.value
    ? mapped.filter((a) => a.status === 'Shortlisted')
    : mapped
})

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
  applicants.value = []
  try {
    const [jobData, applicantData] = await Promise.all([
      jobsStore.loadJob(id).catch(() => null),
      jobsStore.loadJobApplications(id, { force: true }),
    ])
    if (generation === loadGeneration) {
      job.value = jobData
      applicants.value = applicantData || []
    }
  } catch {
    if (generation === loadGeneration) error.value = 'We could not load the candidates for this role.'
  } finally {
    if (generation === loadGeneration) loading.value = false
  }
}

onMounted(load)
watch(() => route.fullPath, load)

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
  if (candidate.status === 'Shortlisted' || shortlisting.value === candidate.applicationId) return
  shortlisting.value = candidate.applicationId
  try {
    await jobsStore.shortlistApplicant(jobId.value, candidate.applicationId)
    await load()
  } catch {
    error.value = 'Could not shortlist this candidate. Please try again.'
  } finally {
    shortlisting.value = null
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
          <span>{{ visibleApplicants.length }} {{ isShortlistedView ? 'shortlisted' : 'applicants' }}</span>
        </div>

        <p v-if="error" class="job-form__error" role="alert">{{ error }}</p>

        <div v-if="loading" class="candidate-empty">
          <strong>Loading candidates...</strong>
          <p>Fetching the people connected to this role.</p>
        </div>

        <template v-else>
          <CandidateCard
            v-for="candidate in visibleApplicants"
            :key="candidate.applicationId"
            :candidate="candidate"
            :shortlisted="candidate.status === 'Shortlisted'"
            @select="openCandidate"
            @shortlist="shortlist"
            @contact="contact"
          />

          <div v-if="!visibleApplicants.length" class="candidate-empty">
            <strong>Nothing here yet</strong>
            <p>{{ emptyText }}</p>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
