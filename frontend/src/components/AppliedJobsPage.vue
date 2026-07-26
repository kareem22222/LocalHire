<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import BrandLogo from './BrandLogo.vue'

const router = useRouter()
const jobsStore = useJobsStore()
const loading = ref(true)
const error = ref('')

const applications = computed(() => jobsStore.myApplications)
const shortlisted = computed(() => applications.value.filter((item) => item.status === 'Shortlisted').length)
const hired = computed(() => applications.value.filter((item) => item.status === 'Hired').length)

const statusSummary = {
  Applied: 'Application sent. The employer has not reviewed it yet.',
  Shortlisted: 'You were shortlisted. The employer may contact you next.',
  Rejected: 'The employer did not select you for this role.',
  Hired: 'You were selected for this role.',
}

onMounted(async () => {
  try {
    await jobsStore.loadMyApplications({ force: true })
  } catch {
    error.value = 'Could not load your applications.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dash-shell applied-shell">
    <header class="dash-header">
      <BrandLogo @click.prevent="router.push('/')" />
    </header>

    <main class="applied-page">
      <section class="applied-heading">
        <div><span>Application history</span><h1>Applied jobs</h1><p>Track every role and see what happened after you applied.</p></div>
        <button type="button" class="dash-btn applied-outline" @click="router.push('/')">Back to jobs</button>
      </section>

      <section class="applied-metrics">
        <div><strong>{{ applications.length }}</strong><span>Total applications</span></div>
        <div><strong>{{ shortlisted }}</strong><span>Shortlisted</span></div>
        <div><strong>{{ hired }}</strong><span>Hired</span></div>
      </section>

      <p v-if="error" class="applied-error" role="alert">{{ error }}</p>
      <div v-if="loading" class="applied-empty">Loading applications...</div>
      <div v-else-if="applications.length" class="applied-list">
        <a
          v-for="application in applications"
          :key="application.id"
          class="applied-card"
          :href="`/work/jobs/${application.jobPostId}`"
          @click.prevent="router.push({ name: 'worker-job-detail', params: { id: application.jobPostId } })"
        >
          <div>
            <span class="applied-card__status" :class="`applied-card__status--${application.status.toLowerCase()}`">{{ application.status }}</span>
            <h2>{{ application.jobTitle }}</h2>
            <p>{{ application.workplaceName }} · {{ application.cityArea }}</p>
          </div>
          <div class="applied-card__summary">
            <strong>What happened</strong>
            <p>{{ statusSummary[application.status] || 'Your application status was updated.' }}</p>
            <small>Applied {{ new Date(application.createdAt).toLocaleDateString() }}</small>
          </div>
        </a>
      </div>
      <div v-else class="applied-empty"><h2>No applications yet</h2><p>Apply to a job and it will appear here.</p></div>
    </main>
  </div>
</template>

<style scoped>
.applied-shell { background: #eef9f2; }
.applied-primary { color: #fff; background: var(--worker-role-gradient); }
.applied-outline { color: var(--worker-role-green-text); border: 1.5px solid rgba(var(--worker-role-green-rgb), .3); background: #fff; }
.applied-page { display: grid; gap: 22px; max-width: 1040px; margin: 0 auto; padding: 40px 24px 72px; }
.applied-heading { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.applied-heading > div > span { color: var(--worker-role-green-text); font-size: 11px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
.applied-heading h1 { margin-top: 6px; color: #0b3658; font-family: Manrope, sans-serif; font-size: 38px; }
.applied-heading p, .applied-card p, .applied-empty p { margin-top: 6px; color: #526977; }
.applied-metrics { display: grid; grid-template-columns: repeat(3, 1fr); overflow: hidden; border: 1px solid rgba(18, 50, 74, .08); border-radius: 18px; background: #fff; }
.applied-metrics div { padding: 22px; text-align: center; border-right: 1px solid rgba(18, 50, 74, .08); }
.applied-metrics div:last-child { border: 0; }
.applied-metrics strong { display: block; color: var(--worker-role-green-text); font-family: Manrope, sans-serif; font-size: 30px; }
.applied-metrics span { color: #526977; font-size: 13px; font-weight: 700; }
.applied-list { display: grid; gap: 12px; }
.applied-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .8fr); gap: 24px; padding: 24px; color: inherit; text-decoration: none; border: 1px solid rgba(18, 50, 74, .08); border-radius: 18px; background: #fff; box-shadow: 0 10px 30px rgba(18, 50, 74, .05); cursor: pointer; }
.applied-card:hover { border-color: rgba(var(--worker-role-green-rgb), .3); box-shadow: 0 14px 34px rgba(var(--worker-role-green-rgb), .09); }
.applied-card:focus-visible { outline: 3px solid rgba(var(--worker-role-green-rgb), .25); outline-offset: 2px; }
.applied-card h2 { margin-top: 10px; color: #0b3658; font-family: Manrope, sans-serif; font-size: 21px; }
.applied-card__status { display: inline-flex; padding: 6px 10px; color: #07559a; border-radius: 999px; background: rgba(7, 85, 154, .09); font-size: 11px; font-weight: 800; text-transform: uppercase; }
.applied-card__status--shortlisted, .applied-card__status--hired { color: var(--worker-role-green-text); background: rgba(var(--worker-role-green-rgb), .1); }
.applied-card__status--rejected { color: #b42318; background: #fff0ee; }
.applied-card__summary { padding-left: 24px; border-left: 1px solid rgba(18, 50, 74, .08); }
.applied-card__summary strong { color: #12324a; font-size: 13px; }
.applied-card__summary small { display: block; margin-top: 12px; color: #526977; }
.applied-empty, .applied-error { padding: 40px 24px; text-align: center; border-radius: 16px; background: #fff; }
.applied-empty h2 { color: #0b3658; }
.applied-error { color: #b42318; }
@media (max-width: 700px) { .applied-heading { align-items: stretch; flex-direction: column; } .applied-metrics, .applied-card { grid-template-columns: 1fr; } .applied-metrics div { border-right: 0; border-bottom: 1px solid rgba(18, 50, 74, .08); } .applied-card__summary { padding: 18px 0 0; border-top: 1px solid rgba(18, 50, 74, .08); border-left: 0; } }
</style>
