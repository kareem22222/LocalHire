<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { useProfileStore } from '../stores/profile'
import { useSavedCandidates } from '../composables/useSavedCandidates'
import { MAX_VISIBLE_CANDIDATES } from '../utils/jobDisplay'
import BrandLogo from './BrandLogo.vue'
import CandidateCard from './CandidateCard.vue'
import '../hiring-dashboard.css'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const profileStore = useProfileStore()
const { candidates } = storeToRefs(jobsStore)
const { profile } = storeToRefs(profileStore)
const { isSaved, add: saveCandidate } = useSavedCandidates()
const loading = ref(false)

const searchTerm = computed(() => (route.query.search ?? '').toString())
const roleTerm = computed(() => (route.query.role ?? '').toString())
const visibleCandidates = computed(() => candidates.value.slice(0, MAX_VISIBLE_CANDIDATES))

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
    await profileStore.fetchProfile().catch(() => {})
    await jobsStore.loadNearbyCandidates(buildParams(), { force: true })
  } catch {
  } finally {
    loading.value = false
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

function shortlist(candidate) {
  saveCandidate(candidate.id)
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
            <span class="hiring-kicker">Recommended</span>
            <h2>{{ heading }}</h2>
          </div>
          <span>{{ candidates.length }} results</span>
        </div>

        <div v-if="loading" class="candidate-empty">
          <strong>Searching talent...</strong>
          <p>Finding every worker that matches your search.</p>
        </div>

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

          <div v-if="!candidates.length" class="candidate-empty">
            <strong>No talent found</strong>
            <p>Try a wider area search, a different role, or use your location on the dashboard.</p>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
