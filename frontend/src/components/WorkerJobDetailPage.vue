<script setup>
import { computed, ref, watch } from 'vue'
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
import { apiErrorMessage } from '../utils/apiError.js'
import { getBusinessProfile } from '../api/jobs.js'
import AppointmentPanel from './AppointmentPanel.vue'
import { t } from '../i18n'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const jobsStore = useJobsStore()
const { isSaved: isJobSaved, toggle: toggleSavedJob } = useSavedJobs()
const job = ref(null)
const loading = ref(true)
const applying = ref(false)
const applied = ref(false)
const error = ref('')
const business = ref(null)
const withdrawing = ref(false)
const loadError = ref('')
const notFound = ref(false)
let loadGeneration = 0

const application = computed(() =>
  jobsStore.myApplications.find((item) => item.jobPostId === props.id) ||
  (applied.value ? { status: 'Applied' } : null))
const isOpen = computed(() => job.value?.isActive !== false)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/work/jobs')
}

async function load() {
  const generation = ++loadGeneration
  loading.value = true
  job.value = null
  applied.value = false
  error.value = ''
  loadError.value = ''
  notFound.value = false
  try {
    const [jobData] = await Promise.all([
      jobsStore.loadWorkerJob(props.id, { force: true }),
      jobsStore.loadMyApplications({ force: true }),
    ])
    if (generation === loadGeneration) job.value = jobData
    if (generation === loadGeneration && jobData.employerId) {
      business.value = (await getBusinessProfile(jobData.employerId)).data
    }
  } catch (err) {
    if (generation !== loadGeneration) return
    notFound.value = err.response?.status === 404
    loadError.value = notFound.value
      ? 'This job is unavailable or you do not have access to it.'
      : apiErrorMessage(err, 'We could not load this job. Please try again.')
  } finally {
    if (generation === loadGeneration) loading.value = false
  }
}

async function withdraw() {
  if (!application.value || !window.confirm('Withdraw this application? You cannot reapply to this role.')) return
  withdrawing.value = true
  error.value = ''
  try {
    await jobsStore.withdrawApplication(application.value.id)
    await jobsStore.loadMyApplications({ force: true })
  } catch (err) { error.value = apiErrorMessage(err, 'Could not withdraw this application.') }
  finally { withdrawing.value = false }
}

watch(() => props.id, load, { immediate: true })

async function apply() {
  applying.value = true
  error.value = ''
  try {
    await jobsStore.applyToJob(props.id)
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not apply to this job.')
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
      <div v-if="loading" class="worker-page-empty">{{ t('Loading job details...') }}</div>
      <div v-else-if="!job" class="worker-page-empty">
        <h1>{{ t(notFound ? 'Job unavailable' : 'Could not load job') }}</h1>
        <p>{{ loadError }}</p>
        <button v-if="!notFound" type="button" class="dash-btn worker-primary" @click="load">{{ t('Retry') }}</button>
        <button type="button" class="dash-btn worker-outline" @click="goBack">{{ t('Back to jobs') }}</button>
      </div>

      <template v-else>
        <section class="worker-detail-hero">
          <div>
            <span class="worker-eyebrow">{{ t(isOpen ? 'Now hiring' : 'Vacancy closed') }}</span>
            <h1>{{ job.title }}</h1>
            <p>{{ job.workplaceName }} · {{ formatJobLocation(job) }}</p>
          </div>
          <div class="worker-detail-actions">
            <button type="button" class="dash-btn worker-outline" @click="goBack">{{ t('Back') }}</button>
            <button
              type="button"
              class="dash-btn worker-outline"
              :aria-pressed="isJobSaved(job.id)"
              :disabled="isJobSaved(job.id) || !isOpen"
              @click="toggleSavedJob(job.id)"
            >
              {{ t(isJobSaved(job.id) ? 'Saved job' : 'Save job') }}
            </button>
            <button type="button" class="dash-btn worker-primary" :disabled="application || applying || !isOpen" @click="apply">
              {{ t(application ? 'Applied' : !isOpen ? 'Closed' : applying ? 'Applying...' : 'Apply now') }}
            </button>
            <button
              v-if="['Applied', 'Shortlisted'].includes(application?.status)"
              type="button"
              class="dash-btn worker-danger"
              :disabled="withdrawing"
              @click="withdraw"
            >{{ t(withdrawing ? 'Withdrawing' : 'Withdraw') }}</button>
          </div>
        </section>

        <p v-if="error" class="worker-detail-error" role="alert">{{ error }}</p>

        <section v-if="application" class="worker-application-notice">
          {{ t('Application status') }}: <strong>{{ t(application.status) }}</strong>
          <AppointmentPanel
            v-if="application.id && ['Applied', 'Shortlisted'].includes(application.status)"
            :application-id="application.id"
            role="work"
          />
        </section>
        <section v-if="!isOpen" class="worker-application-notice" role="status">
          {{ t('This vacancy is closed and no longer accepts applications.') }}
        </section>

        <section class="worker-detail-card">
          <h2>{{ t('About this job') }}</h2>
          <p class="worker-detail-description">{{ job.description }}</p>
        </section>

        <section v-if="business" class="worker-detail-card">
          <h2>About {{ business.name }}</h2>
          <p class="worker-detail-description">{{ business.description || 'This business has not added a description yet.' }}</p>
          <dl class="worker-detail-grid">
            <div v-if="business.location"><dt>Business location</dt><dd>{{ business.location }}</dd></div>
            <div v-if="business.contact"><dt>Public contact</dt><dd>{{ business.contact }}</dd></div>
          </dl>
        </section>

        <section class="worker-detail-card">
          <h2>{{ t('Job details') }}</h2>
          <dl class="worker-detail-grid">
            <div v-if="formatEmploymentType(job)"><dt>{{ t('Employment type') }}</dt><dd>{{ formatEmploymentType(job) }}</dd></div>
            <div v-if="formatSalary(job)"><dt>{{ t('Salary') }}</dt><dd>{{ formatSalary(job) }}</dd></div>
            <div v-if="formatExperience(job)"><dt>{{ t('Experience') }}</dt><dd>{{ formatExperience(job) }}</dd></div>
            <div v-if="job.minEducation"><dt>{{ t('Education') }}</dt><dd>{{ job.minEducation }}</dd></div>
            <div v-if="formatShift(job)"><dt>{{ t('Schedule') }}</dt><dd>{{ formatShift(job) }}</dd></div>
            <div v-if="job.openings"><dt>{{ t('Openings') }}</dt><dd>{{ job.openings }}</dd></div>
            <div><dt>{{ t('Location') }}</dt><dd>{{ formatJobLocation(job) }}</dd></div>
          </dl>
        </section>

        <section v-if="job.requiredSkills?.length || job.languages?.length || job.benefits?.length" class="worker-detail-card">
          <h2>{{ t('Requirements and benefits') }}</h2>
          <div v-if="job.requiredSkills?.length" class="worker-detail-group">
            <h3>{{ t('Skills') }}</h3>
            <div class="worker-detail-chips"><span v-for="skill in job.requiredSkills" :key="skill">{{ skill }}</span></div>
          </div>
          <div v-if="job.languages?.length" class="worker-detail-group">
            <h3>{{ t('Languages') }}</h3>
            <div class="worker-detail-chips"><span v-for="language in job.languages" :key="language">{{ language }}</span></div>
          </div>
          <div v-if="job.benefits?.length" class="worker-detail-group">
            <h3>{{ t('Benefits') }}</h3>
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
.worker-danger { color: #b42318; border: 1px solid rgba(180,35,24,.25); background: #fff; }
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
