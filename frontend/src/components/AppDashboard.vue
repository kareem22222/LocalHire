<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { useProfileStore } from '../stores/profile'
import { normalizeRole } from '../utils/role'
import { logout } from '../utils/session'
import {
  formatEmploymentType,
  formatExperience,
  formatJobLocation,
  formatSalary,
  formatShift,
} from '../utils/jobDisplay'
import BrandLogo from './BrandLogo.vue'
import HiringDashboard from './HiringDashboard.vue'
import ProfilePage from './ProfilePage.vue'

const emit = defineEmits(['logout', 'profile'])
const router = useRouter()
const profileStore = useProfileStore()
const jobsStore = useJobsStore()
const { profile: user } = storeToRefs(profileStore)
const { myJobs, myApplications, candidates } = storeToRefs(jobsStore)

const userRole = computed(() => normalizeRole(user.value?.role))
const isHiringUser = computed(() => userRole.value === 'hiring')
const isWorkerUser = computed(() => userRole.value === 'worker')
const profileSaveError = ref('')
const resumeUploadError = ref('')

// --- Shared ---
const activeTab = ref(typeof localStorage !== 'undefined' ? (localStorage.getItem('dashboard_tab') || 'dashboard') : 'dashboard')

watch(activeTab, (tab) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem('dashboard_tab', tab)
})

async function fetchProfile() {
  try {
    const data = await profileStore.fetchProfile()
    const role = normalizeRole(data.role)
    if (role === 'hiring') {
      await loadMyJobs()
      await loadCandidates()
    } else if (role === 'worker') {
      if (data.isProfileComplete === false) activeTab.value = 'profile'
      await loadMyApplications()
      await loadNearbyJobs()
    }
  } catch {
  }
}

function handleLogout() {
  profileStore.clear()
  jobsStore.clear()
  logout()
}

function handleProfileClick() {
  profileSaveError.value = ''
  emit('profile', user.value)
  activeTab.value = 'profile'
}

function closeProfile() {
  if (isWorkerUser.value && user.value?.isProfileComplete === false) return
  activeTab.value = 'dashboard'
}

async function handleProfileSave(details) {
  profileSaveError.value = ''
  try {
    await profileStore.updateProfile(details)
    activeTab.value = 'profile'
  } catch (err) {
    user.value = { ...user.value, ...details }
    const reason = err.response?.data?.message || err.message
    profileSaveError.value = reason
      ? `Failed to save profile: ${reason}`
      : 'Failed to save profile. Your edits are kept locally.'
  }
}

async function handleResumeUpload(file) {
  resumeUploadError.value = ''
  try {
    await profileStore.uploadResume(file)
  } catch (err) {
    resumeUploadError.value = err.response?.data?.message || 'Failed to upload resume.'
  }
}

onMounted(fetchProfile)

// ============================================================
//  HIRING
// ============================================================
const selectedJobApplications = ref(null)

function goCreateJob() {
  router.push('/PostNewJob')
}

function goViewJob(id) {
  router.push(`/jobs/${id}`)
}

// Dedicated summary pages reachable from a role card's applicant/shortlisted
// counts, plus the candidate detail page.
function goJobApplicants(id) {
  router.push({ name: 'job-applicants', params: { id } })
}

function goJobShortlisted(id) {
  router.push({ name: 'job-shortlisted', params: { id } })
}

function goCandidateDetail(candidate) {
  const id = candidate?.id ?? candidate
  router.push({ name: 'candidate-detail', params: { id } })
}

function goCandidateContact(candidate) {
  const id = candidate?.id ?? candidate
  router.push({ name: 'candidate-detail', params: { id }, query: { contact: '1' } })
}

function goReviewShortlists() {
  router.push({ name: 'review-shortlists' })
}

// Dedicated "show all" pages for when the dashboard's trimmed lists overflow.
function goAllRoles() {
  router.push('/hiring/roles')
}

function goAllCandidates(payload = {}) {
  const query = {}
  if (payload.search) query.search = payload.search
  if (payload.role) query.role = payload.role
  router.push({ path: '/hiring/candidates', query })
}

async function loadMyJobs() {
  try {
    await jobsStore.loadMyJobs()
  } catch {
  }
}

// --- Talent search (candidates near the business) ---
const candidatesLoading = ref(false)
const candidateSearch = ref('')
const candidateRole = ref('')
const employerLocationStatus = ref('idle') // idle | prompt | denied | done
const employerCoords = ref(null)

const candidateLocationLabel = computed(() => {
  if (employerLocationStatus.value === 'done' && employerCoords.value) return 'Using your current location'
  if (employerLocationStatus.value === 'prompt') return 'Getting your location...'
  if (employerLocationStatus.value === 'denied') return 'Location unavailable - showing latest talent'
  const profileArea = [user.value?.cityArea, user.value?.state].filter(Boolean).join(', ')
  if (user.value?.latitude != null && user.value?.longitude != null && profileArea) {
    return `Near your business - ${profileArea}`
  }
  return 'Showing latest talent'
})

function candidateParams() {
  const params = {}
  const coords = employerCoords.value
    ?? (user.value?.latitude != null && user.value?.longitude != null
      ? { lat: user.value.latitude, lng: user.value.longitude }
      : null)
  if (coords) {
    params.lat = coords.lat
    params.lng = coords.lng
  }
  const term = candidateSearch.value.trim()
  if (term) params.search = term
  const role = candidateRole.value.trim()
  if (role) params.role = role
  return params
}

async function loadCandidates(options = {}) {
  candidatesLoading.value = true
  try {
    await jobsStore.loadNearbyCandidates(candidateParams(), options)
  } catch {
  } finally {
    candidatesLoading.value = false
  }
}

async function searchCandidates(payload = {}) {
  candidateSearch.value = payload.search ?? ''
  candidateRole.value = payload.role ?? ''
  await loadCandidates({ force: true })
}

function useEmployerLocation() {
  if (!navigator.geolocation) {
    employerLocationStatus.value = 'denied'
    loadCandidates({ force: true })
    return
  }
  employerLocationStatus.value = 'prompt'
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = Math.round(pos.coords.latitude * 1000) / 1000
      const lng = Math.round(pos.coords.longitude * 1000) / 1000
      employerCoords.value = { lat, lng }
      employerLocationStatus.value = 'done'
      try {
        await profileStore.updateLocation({ latitude: lat, longitude: lng })
      } catch {
      }
      await loadCandidates({ force: true })
    },
    () => {
      employerLocationStatus.value = 'denied'
      loadCandidates({ force: true })
    },
    { enableHighAccuracy: false, timeout: 10000 },
  )
}

async function viewApplications(jobId) {
  try {
    selectedJobApplications.value = await jobsStore.loadJobApplications(jobId)
    activeTab.value = 'applications'
  } catch {
  }
}

function closeApplications() {
  selectedJobApplications.value = null
  activeTab.value = 'dashboard'
}

function goToDashboard() {
  selectedJobApplications.value = null
  activeTab.value = 'dashboard'
}

// ============================================================
//  WORKER
// ============================================================
const locationStatus = ref('idle') // idle | prompt | denied | done
const nearbyJobs = ref([])
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
        await profileStore.updateLocation({ latitude: lat, longitude: lng })
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
    nearbyJobs.value = await jobsStore.loadNearbyJobs(params)
  } catch {
  }
}

async function loadMyApplications() {
  try {
    await jobsStore.loadMyApplications()
  } catch {
  }
}

async function applyToJob(jobId) {
  applying.value = jobId
  try {
    await jobsStore.applyToJob(jobId)
    await loadMyApplications()
    await loadNearbyJobs(workerCoords.value?.lat, workerCoords.value?.lng)
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to apply.')
  } finally {
    applying.value = null
  }
}

function hasApplied(jobId) {
  return myApplications.value.some((application) => application.jobPostId === jobId)
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

    <ProfilePage v-if="activeTab === 'profile'" :user="user" @back="closeProfile" @save="handleProfileSave" @upload-resume="handleResumeUpload" />
    <p v-if="profileSaveError" class="job-form__error" role="alert">{{ profileSaveError }}</p>
    <p v-if="resumeUploadError" class="job-form__error" role="alert">{{ resumeUploadError }}</p>

    <HiringDashboard
      v-if="isHiringUser && activeTab !== 'profile'"
      :my-jobs="myJobs"
      :candidates="candidates"
      :candidates-loading="candidatesLoading"
      :location-label="candidateLocationLabel"
      :locating="employerLocationStatus === 'prompt'"
      @open-create-job="goCreateJob"
      @view-applications="viewApplications"
      @view-applicants="goJobApplicants"
      @view-shortlisted="goJobShortlisted"
      @open-candidate="goCandidateDetail"
      @contact="goCandidateContact"
      @review-shortlists="goReviewShortlists"
      @view-job="goViewJob"
      @search-candidates="searchCandidates"
      @use-my-location="useEmployerLocation"
      @view-all-roles="goAllRoles"
      @view-all-candidates="goAllCandidates"
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
