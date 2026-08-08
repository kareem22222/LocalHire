<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
const loading = ref(true)
const error = ref('')

const savedCandidates = computed(() => jobsStore.savedCandidatesPage.items)
const totalPages = computed(() => jobsStore.savedCandidatesPage.totalPages)
const currentPage = computed(() => Math.max(Number.parseInt(route.query.page, 10) || 1, 1))

async function load() {
  loading.value = true
  try {
    await jobsStore.loadSavedCandidatesPage({
      page: currentPage.value, pageSize: MAX_VISIBLE_CANDIDATES,
    }, { force: true })
  } catch {
    error.value = 'We could not load your saved candidates.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(currentPage, load)

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
          <span>{{ jobsStore.savedCandidatesPage.totalCount }} results</span>
        </div>

        <SkeletonShimmer v-if="loading" label="Loading saved candidates" />
        <template v-else>
          <CandidateCard
            v-for="candidate in savedCandidates"
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
