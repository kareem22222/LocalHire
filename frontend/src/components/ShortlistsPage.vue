<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOpenRoles } from '../composables/useOpenRoles'
import { useJobsStore } from '../stores/jobs'
import BrandLogo from './BrandLogo.vue'
import RoleCard from './RoleCard.vue'
import '../hiring-dashboard.css'

const router = useRouter()
const jobsStore = useJobsStore()
const { myJobs } = storeToRefs(jobsStore)
const loading = ref(false)

const openRoles = useOpenRoles(() => myJobs.value)

// Only roles that actually have shortlisted candidates are worth reviewing here.
const rolesWithShortlists = computed(() => openRoles.value.filter((role) => role.shortlisted > 0))
const totalShortlisted = computed(() =>
  rolesWithShortlists.value.reduce((sum, role) => sum + role.shortlisted, 0),
)

onMounted(async () => {
  loading.value = true
  try {
    await jobsStore.loadMyJobs({ force: true })
  } catch (err) {
    console.error('Failed to load roles.', err)
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

        <template v-else>
          <div class="hiring-role-grid">
            <RoleCard
              v-for="item in rolesWithShortlists"
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

          <div v-if="!rolesWithShortlists.length" class="candidate-empty">
            <strong>No shortlists yet</strong>
            <p>Open a role's applicants and shortlist the candidates you want to move forward.</p>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
