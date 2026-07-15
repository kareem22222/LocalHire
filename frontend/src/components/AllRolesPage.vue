<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { formatRoleStatus } from '../utils/jobDisplay'
import BrandLogo from './BrandLogo.vue'
import '../hiring-dashboard.css'

const router = useRouter()
const jobsStore = useJobsStore()
const { myJobs } = storeToRefs(jobsStore)
const loading = ref(false)

// Same shaping the dashboard uses, so the cards look identical here.
const openRoles = computed(() =>
  myJobs.value.map((job) => {
    const applicants = job.applicationCount ?? 0
    return {
      id: job.id,
      title: job.title,
      area: [job.cityArea, job.state].filter(Boolean).join(', '),
      workplaceName: job.workplaceName,
      applicants,
      shortlisted: Math.min(Math.round(applicants * 0.35), applicants),
      status: formatRoleStatus(job),
    }
  }),
)

onMounted(async () => {
  loading.value = true
  try {
    await jobsStore.loadMyJobs()
  } catch {
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
      <section class="hiring-roles">
        <div class="hiring-roles__head">
          <div>
            <span class="hiring-kicker">Hiring desk</span>
            <h2>All open roles you are hiring for</h2>
          </div>
          <span>{{ openRoles.length }} roles</span>
        </div>

        <div v-if="loading" class="candidate-empty">
          <strong>Loading roles...</strong>
          <p>Fetching every role you are currently hiring for.</p>
        </div>

        <template v-else>
          <div class="hiring-role-grid">
            <article v-for="item in openRoles" :key="item.id || item.title" class="hiring-role-card">
              <div class="hiring-role-card__actions">
                <button
                  type="button"
                  class="hiring-role-card__icon"
                  :aria-label="`View details for ${item.title}`"
                  title="View details"
                  @click="goViewJob(item.id)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <span>{{ item.status }}</span>
              <h3>{{ item.title }}</h3>
              <p>{{ item.workplaceName ? `${item.workplaceName} - ${item.area}` : item.area }}</p>
              <div>
                <strong>{{ item.applicants }}</strong>
                <small>applicants</small>
                <strong>{{ item.shortlisted }}</strong>
                <small>shortlisted</small>
              </div>
              <button type="button" class="hiring-role-card__link" @click="goViewJob(item.id)">
                View role
              </button>
            </article>
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
