<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSavedJobs } from '../composables/useSavedJobs'
import { useJobsStore } from '../stores/jobs'
import {
  formatEmploymentType,
  formatExperience,
  formatJobLocation,
  formatSalary,
  formatShift,
} from '../utils/jobDisplay'
import BrandLogo from './BrandLogo.vue'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const jobsStore = useJobsStore()
const { isSaved: isJobSaved, toggle: toggleSavedJob } = useSavedJobs()
const job = ref(null)
const loading = ref(true)
const applying = ref(false)
const applied = ref(false)
const error = ref('')

const application = computed(() =>
  jobsStore.myApplications.find((item) => item.jobPostId === props.id) ||
  (applied.value ? { status: 'Applied' } : null))

onMounted(async () => {
  try {
    const [jobData] = await Promise.all([
      jobsStore.loadWorkerJob(props.id),
      jobsStore.loadMyApplications(),
    ])
    job.value = jobData
  } catch {
    error.value = 'This job is no longer available.'
  } finally {
    loading.value = false
  }
})

async function apply() {
  applying.value = true
  error.value = ''
  try {
    await jobsStore.applyToJob(props.id)
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not apply to this job.'
    applying.value = false
    return
  }

  applied.value = true
  try {
    await jobsStore.loadMyApplications({ force: true })
  } catch {
  } finally {
    applying.value = false
  }
}
</script>

<template>
  <div class="dash-shell worker-page-shell">
    <header class="dash-header">
      <BrandLogo @click.prevent="router.push('/')" />
    </header>

    <main class="worker-detail-page">
      <div v-if="loading" class="worker-page-empty">Loading job details...</div>
      <div v-else-if="!job" class="worker-page-empty">
        <h1>Job unavailable</h1>
        <p>{{ error }}</p>
        <button type="button" class="dash-btn worker-outline" @click="router.push('/')">Back to jobs</button>
      </div>

      <template v-else>
        <section class="worker-detail-hero">
          <div>
            <span class="worker-eyebrow">Now hiring</span>
            <h1>{{ job.title }}</h1>
            <p>{{ job.workplaceName }} · {{ formatJobLocation(job) }}</p>
          </div>
          <div class="worker-detail-actions">
            <button type="button" class="dash-btn worker-outline" @click="router.push('/')">Back</button>
            <button
              type="button"
              class="dash-btn worker-outline"
              :aria-pressed="isJobSaved(job.id)"
              @click="toggleSavedJob(job.id)"
            >
              {{ isJobSaved(job.id) ? 'Saved' : 'Save job' }}
            </button>
            <button type="button" class="dash-btn worker-primary" :disabled="application || applying" @click="apply">
              {{ application ? 'Applied' : applying ? 'Applying...' : 'Apply now' }}
            </button>
          </div>
        </section>

        <p v-if="error" class="worker-detail-error" role="alert">{{ error }}</p>

        <section v-if="application" class="worker-application-notice">
          Application status: <strong>{{ application.status }}</strong>
        </section>

        <section class="worker-detail-card">
          <h2>About this job</h2>
          <p class="worker-detail-description">{{ job.description }}</p>
        </section>

        <section class="worker-detail-card">
          <h2>Job details</h2>
          <dl class="worker-detail-grid">
            <div v-if="formatEmploymentType(job)"><dt>Employment type</dt><dd>{{ formatEmploymentType(job) }}</dd></div>
            <div v-if="formatSalary(job)"><dt>Salary</dt><dd>{{ formatSalary(job) }}</dd></div>
            <div v-if="formatExperience(job)"><dt>Experience</dt><dd>{{ formatExperience(job) }}</dd></div>
            <div v-if="job.minEducation"><dt>Education</dt><dd>{{ job.minEducation }}</dd></div>
            <div v-if="formatShift(job)"><dt>Schedule</dt><dd>{{ formatShift(job) }}</dd></div>
            <div v-if="job.openings"><dt>Openings</dt><dd>{{ job.openings }}</dd></div>
            <div><dt>Location</dt><dd>{{ formatJobLocation(job) }}</dd></div>
          </dl>
        </section>

        <section v-if="job.requiredSkills?.length || job.languages?.length || job.benefits?.length" class="worker-detail-card">
          <h2>Requirements and benefits</h2>
          <div v-if="job.requiredSkills?.length" class="worker-detail-group">
            <h3>Skills</h3>
            <div class="worker-detail-chips"><span v-for="skill in job.requiredSkills" :key="skill">{{ skill }}</span></div>
          </div>
          <div v-if="job.languages?.length" class="worker-detail-group">
            <h3>Languages</h3>
            <div class="worker-detail-chips"><span v-for="language in job.languages" :key="language">{{ language }}</span></div>
          </div>
          <div v-if="job.benefits?.length" class="worker-detail-group">
            <h3>Benefits</h3>
            <div class="worker-detail-chips"><span v-for="benefit in job.benefits" :key="benefit">{{ benefit }}</span></div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.worker-page-shell { background: #eef9f2; }
.worker-primary { color: #fff; background: var(--worker-role-gradient); }
.worker-outline { color: var(--worker-role-green-text); border: 1.5px solid rgba(var(--worker-role-green-rgb), 0.3); background: #fff; }
.worker-detail-page { display: grid; gap: 20px; max-width: 960px; margin: 0 auto; padding: 40px 24px 72px; }
.worker-detail-hero, .worker-detail-card, .worker-page-empty { padding: 30px; border: 1px solid rgba(18, 50, 74, 0.08); border-radius: 20px; background: #fff; box-shadow: 0 14px 40px rgba(18, 50, 74, 0.06); }
.worker-detail-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.worker-eyebrow { display: inline-flex; margin-bottom: 10px; padding: 6px 10px; color: var(--worker-role-green-text); border-radius: 999px; background: rgba(var(--worker-role-green-rgb), 0.1); font-size: 11px; font-weight: 800; text-transform: uppercase; }
.worker-detail-hero h1 { color: #0b3658; font-family: Manrope, sans-serif; font-size: clamp(30px, 5vw, 44px); }
.worker-detail-hero p, .worker-detail-description, .worker-page-empty p { margin-top: 8px; color: #526977; line-height: 1.7; }
.worker-detail-actions { display: flex; gap: 10px; flex-shrink: 0; }
.worker-detail-card h2, .worker-page-empty h1 { color: #0b3658; font-family: Manrope, sans-serif; font-size: 22px; }
.worker-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
.worker-detail-grid div { padding: 16px; border-radius: 14px; background: #f4faf6; }
.worker-detail-grid dt, .worker-detail-group h3 { color: #526977; font-size: 11px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
.worker-detail-grid dd { margin-top: 6px; color: #12324a; font-weight: 700; }
.worker-detail-group { margin-top: 20px; }
.worker-detail-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.worker-detail-chips span { padding: 7px 11px; color: var(--worker-role-green-text); border-radius: 999px; background: rgba(var(--worker-role-green-rgb), 0.09); font-size: 12px; font-weight: 700; }
.worker-application-notice { padding: 16px 20px; color: var(--worker-role-green-text); border: 1px solid rgba(var(--worker-role-green-rgb), 0.25); border-radius: 14px; background: #fff; }
.worker-detail-error { padding: 14px 18px; color: #b42318; border-radius: 12px; background: #fff0ee; }
.worker-page-empty { text-align: center; }
.worker-page-empty .dash-btn { margin-top: 20px; }
@media (max-width: 640px) { .worker-detail-hero { align-items: stretch; flex-direction: column; } .worker-detail-actions { width: 100%; } .worker-detail-actions .dash-btn { flex: 1; } .worker-detail-grid { grid-template-columns: 1fr; } }
</style>
