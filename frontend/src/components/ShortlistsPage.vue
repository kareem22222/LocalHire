<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOpenRoles } from '../composables/useOpenRoles'
import { useJobsStore } from '../stores/jobs'
import { MAX_VISIBLE_ROLES } from '../utils/jobDisplay'
import BrandLogo from './BrandLogo.vue'
import Pagination from './ui/Pagination.vue'
import RoleCard from './RoleCard.vue'
import '../hiring-dashboard.css'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const { myJobs } = storeToRefs(jobsStore)
const loading = ref(false)
const error = ref('')

const openRoles = useOpenRoles(() => myJobs.value)

// Only roles that actually have shortlisted candidates are worth reviewing here.
const rolesWithShortlists = computed(() => openRoles.value.filter((role) => role.shortlisted > 0))
const totalPages = computed(() => Math.ceil(rolesWithShortlists.value.length / MAX_VISIBLE_ROLES))
const currentPage = computed(() => Math.min(Math.max(Number.parseInt(route.query.page, 10) || 1, 1), totalPages.value || 1))
const visibleRoles = computed(() => rolesWithShortlists.value.slice((currentPage.value - 1) * MAX_VISIBLE_ROLES, currentPage.value * MAX_VISIBLE_ROLES))
const totalShortlisted = computed(() =>
  rolesWithShortlists.value.reduce((sum, role) => sum + role.shortlisted, 0),
)

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    await jobsStore.loadMyJobs({ force: true })
  } catch {
    error.value = 'We could not load your shortlists.'
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push('/')
}

function goViewJob(id) {
  router.push(`/jobs/${id}`)
}

function goShortlisted(id) {
  router.push({ name: 'job-shortlisted', params: { id } })
}

function goApplicants(id) {
  router.push({ name: 'job-applicants', params: { id } })
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
      <section class="hiring-roles">
        <div class="hiring-roles__head">
          <div>
            <span class="hiring-kicker">Shortlists</span>
            <h2>Review your shortlists</h2>
          </div>
          <span>{{ totalShortlisted }} shortlisted across {{ rolesWithShortlists.length }} role{{ rolesWithShortlists.length === 1 ? '' : 's' }}</span>
        </div>

        <div v-if="loading" class="candidate-empty">
          <strong>Loading shortlists...</strong>
          <p>Gathering the candidates you have shortlisted.</p>
        </div>

        <p v-else-if="error" class="job-form__error" role="alert">{{ error }}</p>

        <template v-else>
          <div class="hiring-role-grid">
            <RoleCard
              v-for="item in visibleRoles"
              :key="item.id || item.title"
              :item="item"
              action-label="View shortlisted"
              counts-clickable
              @view="goViewJob"
              @action="goShortlisted(item.id)"
              @view-applicants="goApplicants"
              @view-shortlisted="goShortlisted"
            />
          </div>

          <Pagination :page="currentPage" :total-pages="totalPages" @change="changePage" />

          <div v-if="!rolesWithShortlists.length" class="candidate-empty">
            <strong>No shortlists yet</strong>
            <p>Open a role's applicants and shortlist the candidates you want to move forward.</p>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
