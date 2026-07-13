<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { clearAuth } from '../api'
import BrandLogo from './BrandLogo.vue'
import HiringDashboard from './HiringDashboard.vue'
import ProfilePage from './ProfilePage.vue'

const emit = defineEmits(['logout', 'profile'])

const router = useRouter()

const user = ref(null)
const userRole = computed(() => normalizeRole(user.value?.role))
const isHiringUser = computed(() => userRole.value === 'hiring')
const isWorkerUser = computed(() => userRole.value === 'worker')
const profileSaveError = ref('')

// --- Shared ---
const activeTab = ref(typeof localStorage!=='undefined'?(localStorage.getItem('dashboard_tab') || 'dashboard'):'dashboard')

async function fetchProfile() {
  try {
    const { data } = await api.get('/auth/me')
    user.value = data

    // Auto-load role-specific data after profile fetch
    const role = normalizeRole(data.role)
    if (role === 'hiring') {
      await loadMyJobs()
    } else if (role === 'worker') {
      await loadMyApplications()
      await loadNearbyJobs()
    }
  } catch {
  }
}

function normalizeRole(role) {
  if (role === 1 || role === '1') return 'hiring'
  if (role === 0 || role === '0') return 'worker'

  const value = String(role || '').trim().toLowerCase()
  if (['hiring', 'employer'].includes(value)) return 'hiring'
  if (['lookingforwork', 'looking_for_work', 'worker'].includes(value)) return 'worker'
  return ''
}

function handleLogout() {
  clearAuth()
  window.location.reload()
}

function handleProfileClick() {
  profileSaveError.value = ''
  emit('profile', user.value)
  activeTab.value = 'profile'
  if(typeof localStorage!=='undefined'){
  localStorage.setItem('dashboard_tab','profile')
  }
}

function closeProfile() {
  activeTab.value = 'dashboard'
  if(typeof localStorage!=='undefined'){
  localStorage.setItem('dashboard_tab','dashboard')
}
}

async function handleProfileSave(details) {
  // Persist the edited profile through the API, then reflect the saved values.
  // If the request fails, keep the user's edits locally so their input isn't lost.
  profileSaveError.value = ''
  try {
    const { data } = await api.put('/me/profile', details)
    Object.assign(user.value,data)
    activeTab.value='profile'
    if(typeof localStorage!=='undefined'){
    localStorage.setItem('dashboard_tab','profile')
    }
  } catch (err) {
    user.value = { ...user.value, ...details }
    const reason = err.response?.data?.message || err.message
    profileSaveError.value = reason
      ? `Failed to save profile: ${reason}`
      : 'Failed to save profile. Your edits are kept locally.'
  }
}

onMounted(fetchProfile)

// ============================================================
//  HIRING
// ============================================================
const myJobs = ref([])
const selectedJobApplications = ref(null)

function goCreateJob() {
  router.push('/PostNewJob')
}

function goViewJob(id) {
  router.push(`/jobs/${id}`)
}

async function loadMyJobs() {
  try {
    const { data } = await api.get('/hiring/jobs')
    myJobs.value = data
  } catch {
  }
}

async function viewApplications(jobId) {
  try {
    const { data } = await api.get(`/hiring/jobs/${jobId}/applications`)
    selectedJobApplications.value = data
    activeTab.value = 'applications'
  } catch {
  }
}

function closeApplications() {
  selectedJobApplications.value = null
  activeTab.value = 'dashboard'
}

// Return to the main dashboard view (used by the brand logo in the header).
function goToDashboard() {
  selectedJobApplications.value = null
  activeTab.value = 'dashboard'
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('dashboard_tab', 'dashboard')
  }
}

// ============================================================
//  WORKER
// ============================================================
const locationStatus = ref('idle') // idle | prompt | denied | done
const nearbyJobs = ref([])
const myApplications = ref([])
const workerCoords = ref(null)
const applying = ref(null)

function requestLocation() {
  if (!navigator.geolocation) {
    locationStatus.value = 'denied'
    return
  }
  locationStatus.value = 'prompt'
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = Math.round(pos.coords.latitude * 1000) / 1000
      const lng = Math.round(pos.coords.longitude * 1000) / 1000
      workerCoords.value = { lat, lng }
      locationStatus.value = 'done'
      try {
        await api.put('/me/location', { latitude: lat, longitude: lng })
      } catch {
      }
      await loadNearbyJobs(lat, lng)
      await loadMyApplications()
    },
    () => {
      locationStatus.value = 'denied'
      loadNearbyJobs()
      loadMyApplications()
    },
    { enableHighAccuracy: false, timeout: 10000 },
  )
}

async function loadNearbyJobs(lat, lng) {
  try {
    const params = lat != null && lng != null ? { lat, lng } : {}
    const { data } = await api.get('/work/jobs/nearby', { params })
    nearbyJobs.value = data
  } catch {
  }
}

async function loadMyApplications() {
  try {
    const { data } = await api.get('/work/applications')
    myApplications.value = data
  } catch {
  }
}

async function applyToJob(jobId) {
  applying.value = jobId
  try {
    await api.post(`/work/jobs/${jobId}/apply`)
    await loadMyApplications()
    await loadNearbyJobs(workerCoords.value?.lat, workerCoords.value?.lng)
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to apply.')
  } finally {
    applying.value = null
  }
}

function hasApplied(jobId) {
  return myApplications.value.some((a) => a.jobPostId === jobId)
}

function formatJobLocation(job) {
  const base = [job.cityArea, job.state].filter(Boolean).join(', ')
  return job.pincode ? [base, job.pincode].filter(Boolean).join(' - ') : base
}

const EMPLOYMENT_TYPE_LABELS = {
  FullTime: 'Full-time',
  PartTime: 'Part-time',
  Contract: 'Contract',
  Temporary: 'Temporary',
  Internship: 'Internship',
  Daily: 'Daily wage',
}

function formatEmploymentType(job) {
  if (!job.employmentType) return ''
  return EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType
}

function formatSalary(job) {
  if (job.salaryMin == null && job.salaryMax == null) return ''
  const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`
  const range = job.salaryMin != null && job.salaryMax != null
    ? `${money(job.salaryMin)} – ${money(job.salaryMax)}`
    : money(job.salaryMin ?? job.salaryMax)
  return job.salaryPeriod ? `${range} / ${job.salaryPeriod.toLowerCase()}` : range
}

function formatExperience(job) {
  if (job.experienceMinYears == null && job.experienceMaxYears == null) return ''
  if (job.experienceMinYears != null && job.experienceMaxYears != null) {
    return `${job.experienceMinYears}–${job.experienceMaxYears} yrs exp`
  }
  return `${job.experienceMinYears ?? job.experienceMaxYears}+ yrs exp`
}

function formatShift(job) {
  const time = job.shiftStartTime && job.shiftEndTime
    ? `${job.shiftStartTime}–${job.shiftEndTime}`
    : (job.shiftStartTime || '')
  return [job.workingDays, time].filter(Boolean).join(', ')
}
</script>

<template>
  <div class="dash-shell">
    <header class="dash-header">
      <BrandLogo @click.prevent="goToDashboard" />
      <div class="dash-header__right">
        <button type="button" class="dash-btn dash-btn--primary dash-role-badge" @click="closeProfile">{{ isHiringUser ? 'Hiring' : isWorkerUser ? 'Worker' : 'Account' }}</button>
        <button type="button" class="dash-user-name" @click="handleProfileClick">{{ user?.name || 'User' }}</button>
        <button class="dash-logout-btn" @click="handleLogout">Sign out</button>
      </div>
    </header>

    <ProfilePage v-if="activeTab === 'profile'" :user="user" @back="closeProfile" @save="handleProfileSave" />
    <p v-if="profileSaveError" class="job-form__error" role="alert">{{ profileSaveError }}</p>

    <HiringDashboard
      v-if="isHiringUser && activeTab !== 'profile'"
      :my-jobs="myJobs"
      @open-create-job="goCreateJob"
      @view-applications="viewApplications"
      @view-job="goViewJob"
      @shortlist="() => {}"
    />

    <div v-if="selectedJobApplications !== null" class="auth-overlay" @click.self="closeApplications">
      <div class="auth-modal" style="max-width: 520px;" role="dialog" aria-modal="true" aria-labelledby="applicants-dialog-title">
        <button class="auth-modal__close" @click="closeApplications" aria-label="Close applicants dialog">&times;</button>
        <h2 id="applicants-dialog-title" class="auth-modal__title" style="margin-bottom: 20px;">Applicants</h2>
        <div v-if="selectedJobApplications.length === 0" class="dash-empty">No applications yet.</div>
        <div v-for="app in selectedJobApplications" :key="app.id" class="applicant-row">
          <div class="applicant-row__info">
            <strong>{{ app.workerName }}</strong>
            <span class="applicant-row__status">{{ app.status }}</span>
          </div>
          <span class="applicant-row__date">{{ new Date(app.appliedAt).toLocaleDateString() }}</span>
        </div>
      </div>
    </div>

    <main v-if="isWorkerUser && activeTab !== 'profile'" class="dash-main">

      <!-- ===== WORKER DASHBOARD ===== -->
        <div class="dash-welcome">
          <h1 class="dash-welcome__title">
            Worker Dashboard,
            <span class="dash-welcome__name">{{ user?.name }}</span>
          </h1>
          <p class="dash-welcome__desc">
            Find nearby job opportunities and manage your applications.
          </p>
        </div>

        <!-- Location prompt -->
        <div v-if="locationStatus === 'idle'" class="location-prompt">
          <p class="location-prompt__text">Enable location to see nearby jobs in your area.</p>
          <button class="dash-btn dash-btn--primary" @click="requestLocation">Share Location</button>
        </div>
        <div v-else-if="locationStatus === 'prompt'" class="location-prompt">
          <p class="location-prompt__text">Requesting location access...</p>
        </div>
        <div v-else-if="locationStatus === 'denied'" class="location-prompt location-prompt--denied">
          <p class="location-prompt__text">Location access denied. You can still browse all active jobs, or enable location in your browser settings.</p>
          <button class="dash-btn dash-btn--outline" @click="requestLocation">Try again</button>
        </div>

        <!-- Nearby Jobs -->
        <div class="dash-section">
          <h2 class="dash-section__title">Nearby Jobs</h2>
          <div v-if="nearbyJobs.length === 0" class="dash-empty">
            No active jobs found{{ locationStatus === 'denied' ? '. Try enabling location or check back later.' : ' in your area.' }}
          </div>
          <div v-for="job in nearbyJobs" :key="job.id" class="job-card">
            <div class="job-card__body">
              <h3 class="job-card__title">{{ job.title }}</h3>
              <p class="job-card__meta">{{ job.workplaceName }} &middot; {{ formatJobLocation(job) }}</p>
              <p class="job-card__desc">{{ job.description }}</p>
              <div class="job-detail-tags">
                <span v-if="formatEmploymentType(job)" class="job-detail-tag">{{ formatEmploymentType(job) }}</span>
                <span v-if="formatSalary(job)" class="job-detail-tag job-detail-tag--salary">{{ formatSalary(job) }}</span>
                <span v-if="formatExperience(job)" class="job-detail-tag">{{ formatExperience(job) }}</span>
                <span v-if="job.minEducation" class="job-detail-tag">{{ job.minEducation }}</span>
                <span v-if="formatShift(job)" class="job-detail-tag">{{ formatShift(job) }}</span>
                <span v-if="job.openings" class="job-detail-tag">{{ job.openings }} opening{{ job.openings !== 1 ? 's' : '' }}</span>
                <span v-for="lang in job.languages || []" :key="`lang-${lang}`" class="job-detail-tag">{{ lang }}</span>
              </div>
              <div v-if="(job.requiredSkills || []).length" class="job-detail-chips">
                <span v-for="skill in job.requiredSkills" :key="skill">{{ skill }}</span>
              </div>
              <div v-if="(job.benefits || []).length" class="job-detail-benefits">
                <strong>Benefits:</strong> {{ job.benefits.join(', ') }}
              </div>
            </div>
            <div class="job-card__actions">
              <span class="job-card__count">{{ job.applicationCount }} applicant{{ job.applicationCount !== 1 ? 's' : '' }}</span>
              <button
                class="dash-btn"
                :class="hasApplied(job.id) ? 'dash-btn--disabled' : 'dash-btn--primary'"
                :disabled="hasApplied(job.id) || applying === job.id"
                @click="applyToJob(job.id)"
              >
                {{ hasApplied(job.id) ? 'Applied' : applying === job.id ? 'Applying...' : 'Apply' }}
              </button>
            </div>
          </div>
        </div>

        <!-- My Applications -->
        <div class="dash-section">
          <h2 class="dash-section__title">My Applications</h2>
          <div v-if="myApplications.length === 0" class="dash-empty">You haven't applied to any jobs yet.</div>
          <div v-for="app in myApplications" :key="app.id" class="job-card">
            <div class="job-card__body">
              <h3 class="job-card__title">{{ app.jobTitle }}</h3>
              <p class="job-card__meta">{{ app.workplaceName }} &middot; {{ app.cityArea }}</p>
            </div>
            <div class="job-card__actions">
              <span class="job-card__badge" :class="`job-card__badge--${app.status.toLowerCase()}`">{{ app.status }}</span>
              <span class="job-card__date">{{ new Date(app.createdAt).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
    </main>

    <main v-else-if="user && !isHiringUser && activeTab !== 'profile'" class="dash-main">
      <div class="dash-empty">
        We could not identify this account type. Please sign out and sign in again with the correct role.
      </div>
    </main>
  </div>
</template>

<style scoped>
.job-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.job-detail-tag {
  font-size: 12px;
  font-weight: 600;
  color: #0e2638;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef3f5;
}

.job-detail-tag--salary {
  color: #064b29;
  background: #e7f6ee;
}

.job-detail-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.job-detail-chips span {
  font-size: 12px;
  color: #07559a;
  padding: 3px 9px;
  border-radius: 8px;
  border: 1px solid rgba(7, 85, 154, 0.2);
}

.job-detail-benefits {
  margin-top: 10px;
  font-size: 13px;
  color: #40545f;
}

.job-detail-benefits strong {
  color: #12324a;
}
</style>
