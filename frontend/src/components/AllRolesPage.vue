<script setup>
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOpenRoles } from '../composables/useOpenRoles'
import { useJobsStore } from '../stores/jobs'
import { withMinimumDelay } from '../utils/minimumDelay'
import BrandLogo from './BrandLogo.vue'
import RoleCard from './RoleCard.vue'
import SkeletonShimmer from './ui/SkeletonShimmer.vue'
import '../hiring-dashboard.css'

const router = useRouter()
const jobsStore = useJobsStore()
const { myJobs } = storeToRefs(jobsStore)
const loading = ref(true)

const openRoles = useOpenRoles(() => myJobs.value)

onMounted(async () => {
  loading.value = true
  try {
    await withMinimumDelay(() => jobsStore.loadMyJobs())
  } catch (error) {
    console.error('Failed to load roles.', error)
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
          <span>{{ openRoles.length }} roles</span>
        </div>

        <SkeletonShimmer v-if="loading" variant="role" :count="openRoles.length || 3" label="Loading roles" />

        <template v-else>
          <div class="hiring-role-grid">
            <RoleCard
              v-for="item in openRoles"
              :key="item.id || item.title"
              :item="item"
              action-label="View role"
              @view="goViewJob"
              @action="goViewJob"
            />
          </div>

          <div v-if="!openRoles.length" class="candidate-empty">
            <strong>No open roles yet</strong>
            <p>Post a role to start tracking applicants and matches.</p>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
