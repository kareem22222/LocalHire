<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSavedCandidates } from '../composables/useSavedCandidates'
import { useJobsStore } from '../stores/jobs'
import { MAX_VISIBLE_CANDIDATES } from '../utils/jobDisplay'
import BrandLogo from './BrandLogo.vue'
import CandidateCard from './CandidateCard.vue'
import Pagination from './ui/Pagination.vue'
import SkeletonShimmer from './ui/SkeletonShimmer.vue'
import '../hiring-dashboard.css'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const { saved, load: loadSavedCandidates } = useSavedCandidates()
const candidates = ref([])
const loading = ref(true)
const error = ref('')

const savedCandidates = computed(() => candidates.value.filter((candidate) => saved.value.has(candidate.id)))
const totalPages = computed(() => Math.ceil(savedCandidates.value.length / MAX_VISIBLE_CANDIDATES))
const currentPage = computed(() => Math.min(Math.max(Number.parseInt(route.query.page, 10) || 1, 1), totalPages.value || 1))
const visibleCandidates = computed(() => savedCandidates.value.slice((currentPage.value - 1) * MAX_VISIBLE_CANDIDATES, currentPage.value * MAX_VISIBLE_CANDIDATES))

onMounted(async () => {
  try {
    await loadSavedCandidates()
    const results = await Promise.allSettled([...saved.value].map((id) => jobsStore.loadCandidate(id)))
    candidates.value = results.filter((result) => result.status === 'fulfilled').map((result) => result.value)
    if (results.some((result) => result.status === 'rejected')) error.value = 'Some saved candidates are no longer available.'
  } catch {
    error.value = 'We could not load your saved candidates.'
  } finally {
    loading.value = false
  }
})

function openCandidate(candidate, contact = false) {
  router.push({
    name: 'candidate-detail',
    params: { id: candidate.id },
    query: contact ? { contact: '1' } : undefined,
  })
}

function changePage(page) {
  router.push({ query: { page: page === 1 ? undefined : String(page) } })
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

    <main class="hiring-dashboard">
      <p v-if="error" class="job-form__error" role="alert">{{ error }}</p>
      <section class="candidate-list" :aria-busy="loading">
        <div class="candidate-list__head">
          <div>
            <span class="hiring-kicker">Saved for later</span>
            <h2>Saved candidates</h2>
          </div>
          <span>{{ savedCandidates.length }} results</span>
        </div>

        <SkeletonShimmer v-if="loading" label="Loading saved candidates" />
        <template v-else>
          <CandidateCard
            v-for="candidate in visibleCandidates"
            :key="candidate.id"
            :candidate="candidate"
            shortlisted
            @select="openCandidate"
            @contact="openCandidate($event, true)"
          />
          <Pagination :page="currentPage" :total-pages="totalPages" @change="changePage" />
          <div v-if="!savedCandidates.length" class="candidate-empty">
            <strong>No saved candidates yet</strong>
            <p>Save a candidate from the talent list or candidate details to find them here.</p>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
