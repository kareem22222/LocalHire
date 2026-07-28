<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { useProfileStore } from '../stores/profile'
import { useSavedCandidates } from '../composables/useSavedCandidates'
import { MAX_VISIBLE_CANDIDATES } from '../utils/jobDisplay'
import { withMinimumDelay } from '../utils/minimumDelay'
import BrandLogo from './BrandLogo.vue'
import CandidateCard from './CandidateCard.vue'
import Pagination from './ui/Pagination.vue'
import SkeletonShimmer from './ui/SkeletonShimmer.vue'
import '../hiring-dashboard.css'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const profileStore = useProfileStore()
const { candidates } = storeToRefs(jobsStore)
const { profile } = storeToRefs(profileStore)
const { isSaved, add: saveCandidate } = useSavedCandidates()
const loading = ref(true)

const searchTerm = computed(() => (route.query.search ?? '').toString())
const roleTerm = computed(() => (route.query.role ?? '').toString())
const totalPages = computed(() => Math.ceil(candidates.value.length / MAX_VISIBLE_CANDIDATES))
const currentPage = computed(() => Math.min(Math.max(Number.parseInt(route.query.page, 10) || 1, 1), totalPages.value || 1))
const visibleCandidates = computed(() => candidates.value.slice((currentPage.value - 1) * MAX_VISIBLE_CANDIDATES, currentPage.value * MAX_VISIBLE_CANDIDATES))

const heading = computed(() => {
  const parts = []
  if (roleTerm.value) parts.push(roleTerm.value)
  if (searchTerm.value) parts.push(`"${searchTerm.value}"`)
  return parts.length ? `Talent matching ${parts.join(' · ')}` : 'All talent near your business'
})

// Mirror the dashboard's request: reuse the employer's saved coordinates (set
// when they last used "Use my location") plus the search/role from the query so
// this page shows the same filtered result set.
function buildParams() {
  const params = {}
  if (profile.value?.latitude != null && profile.value?.longitude != null) {
    params.lat = profile.value.latitude
    params.lng = profile.value.longitude
  }
  if (searchTerm.value) params.search = searchTerm.value
  if (roleTerm.value) params.role = roleTerm.value
  return params
}

async function load() {
  loading.value = true
  try {
    await withMinimumDelay(async () => {
      await profileStore.fetchProfile().catch(() => {})
      await jobsStore.loadNearbyCandidates(buildParams(), { force: true })
    })
  } catch {
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([searchTerm, roleTerm], load)

function goBack() {
  router.push('/')
}

function openCandidate(candidate) {
  router.push({ name: 'candidate-detail', params: { id: candidate.id } })
}

function contact(candidate) {
  router.push({ name: 'candidate-detail', params: { id: candidate.id }, query: { contact: '1' } })
}

function shortlist(candidate) {
  saveCandidate(candidate.id)
}

function changePage(page) {
  router.push({ query: { ...route.query, page: page === 1 ? undefined : String(page) } })
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
      <section class="candidate-list" :aria-busy="loading">
        <div class="candidate-list__head">
          <div>
            <span class="hiring-kicker">Recommended</span>
            <h2>{{ heading }}</h2>
          </div>
          <span>{{ candidates.length }} results</span>
        </div>

        <SkeletonShimmer v-if="loading" label="Searching talent" />

        <template v-else>
          <CandidateCard
            v-for="candidate in visibleCandidates"
            :key="candidate.id"
            :candidate="candidate"
            :shortlisted="isSaved(candidate.id)"
            @select="openCandidate"
            @shortlist="shortlist"
            @contact="contact"
          />

          <Pagination :page="currentPage" :total-pages="totalPages" @change="changePage" />

          <div v-if="!candidates.length" class="candidate-empty">
            <strong>No talent found</strong>
            <p>Try a wider area search, a different role, or use your location on the dashboard.</p>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
