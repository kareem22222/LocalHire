<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOpenRoles } from '../composables/useOpenRoles'
import { useJobsStore } from '../stores/jobs'
import { withMinimumDelay } from '../utils/minimumDelay'
import BrandLogo from './BrandLogo.vue'
import Pagination from './ui/Pagination.vue'
import RoleCard from './RoleCard.vue'
import SkeletonShimmer from './ui/SkeletonShimmer.vue'
import '../hiring-dashboard.css'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const { employerJobsPage } = storeToRefs(jobsStore)
const loading = ref(true)
const ROLES_PER_PAGE = 15

const openRoles = useOpenRoles(() => employerJobsPage.value.items)
const totalPages = computed(() => employerJobsPage.value.totalPages)
const currentPage = computed(() => Math.max(Number.parseInt(route.query.page, 10) || 1, 1))

async function load() {
  loading.value = true
  try {
    await withMinimumDelay(() => jobsStore.loadEmployerJobsPage({
      status: 'open', page: currentPage.value, pageSize: ROLES_PER_PAGE,
    }, { force: true }))
  } catch (error) {
    console.error('Failed to load roles.', error)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(currentPage, load)

function goBack() {
  router.push('/')
}

function goViewJob(id) {
  router.push(`/jobs/${id}`)
}

function goApplicants(id) {
  router.push({ name: 'job-applicants', params: { id } })
}

function goShortlisted(id) {
  router.push({ name: 'job-shortlisted', params: { id } })
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
      <section class="hiring-roles" :aria-busy="loading">
        <div class="hiring-roles__head">
          <div>
            <span class="hiring-kicker">Hiring desk</span>
            <h2>All open roles you are hiring for</h2>
          </div>
          <span>{{ employerJobsPage.totalCount }} roles</span>
        </div>

        <SkeletonShimmer v-if="loading" variant="role" :count="Math.min(openRoles.length || ROLES_PER_PAGE, ROLES_PER_PAGE)" label="Loading roles" />

        <template v-else>
          <div class="hiring-role-grid">
            <RoleCard
              v-for="item in openRoles"
              :key="item.id || item.title"
              :item="item"
              action-label="View role"
              counts-clickable
              @view="goViewJob"
              @action="goViewJob"
              @view-applicants="goApplicants"
              @view-shortlisted="goShortlisted"
            />
          </div>

          <Pagination :page="currentPage" :total-pages="totalPages" @change="changePage" />

          <div v-if="!openRoles.length" class="candidate-empty">
            <strong>No open roles yet</strong>
            <p>Post a role to start tracking applicants and matches.</p>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
