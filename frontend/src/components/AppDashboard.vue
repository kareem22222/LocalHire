<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { useProfileStore } from '../stores/profile'
import { normalizeRole } from '../utils/role'
import { withMinimumDelay } from '../utils/minimumDelay'
import BrandLogo from './BrandLogo.vue'
import HiringDashboard from './HiringDashboard.vue'
import ProfilePage from './ProfilePage.vue'
import WorkerDashboard from './WorkerDashboard.vue'

const route = useRoute()
const router = useRouter()
const profileStore = useProfileStore()
const jobsStore = useJobsStore()
const { profile: user } = storeToRefs(profileStore)
const { myJobs, myApplications, candidates } = storeToRefs(jobsStore)

const userRole = computed(() => normalizeRole(user.value?.role))
const isHiringUser = computed(() => userRole.value === 'hiring')
const isWorkerUser = computed(() => userRole.value === 'worker')
const profileSaveErrors = ref([])
const profileSaving = ref(false)
const profileSaveVersion = ref(0)
const resumeUploadError = ref('')
const resumeUploading = ref(false)
const resumeUploadProgress = ref(0)

// --- Shared ---
const savedTab = typeof localStorage === 'undefined' ? 'dashboard' : (localStorage.getItem('dashboard_tab') || 'dashboard')
const activeTab = ref(route.query.tab === 'profile' ? 'profile' : savedTab)

watch(activeTab, (tab) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem('dashboard_tab', tab)
})

watch(() => route.query.tab, (tab) => {
  if (tab === 'profile') handleProfileClick()
  else if (activeTab.value === 'profile') activeTab.value = 'dashboard'
})

async function fetchProfile() {
  try {
    const data = await profileStore.fetchProfile()
    const role = normalizeRole(data.role)
    if (role === 'hiring') {
      await Promise.all([loadMyJobs(), loadCandidates()])
    } else if (role === 'worker') {
      await Promise.all([loadMyApplications(), loadNearbyJobs()])
    }
  } catch {
  }
}

function handleProfileClick() {
  profileSaveErrors.value = []
  activeTab.value = 'profile'
  if (route.query.tab !== 'profile') router.push({ query: { ...route.query, tab: 'profile' } })
}

function closeProfile() {
  activeTab.value = 'dashboard'
  if (route.query.tab === 'profile') router.replace('/')
}

function clearProfileErrors() {
  profileSaveErrors.value = []
}

function profileErrorMessages(err) {
  const data = err.response?.data
  const validation = Object.values(data?.errors || {}).flat().filter(Boolean)
  if (validation.length) return validation
  return [data?.detail || data?.message || data?.error || data?.title || err.message || 'Failed to save profile.']
}

async function handleProfileSave(details) {
  profileSaveErrors.value = []
  profileSaving.value = true
  try {
    await profileStore.updateProfile(details)
    profileSaveVersion.value += 1
    activeTab.value = 'profile'
  } catch (err) {
    profileSaveErrors.value = profileErrorMessages(err)
  } finally {
    profileSaving.value = false
  }
}

async function handleResumeUpload(file) {
  resumeUploadError.value = ''
  resumeUploadProgress.value = 0
  resumeUploading.value = true
  try {
    await profileStore.uploadResume(file, (event) => {
      const ratio = event.progress ?? (event.total ? event.loaded / event.total : 0)
      resumeUploadProgress.value = Math.min(Math.round(ratio * 100), 99)
    })
    resumeUploadProgress.value = 100
  } catch (err) {
    resumeUploadError.value = err.response?.data?.message || 'Failed to upload resume.'
  } finally {
    resumeUploading.value = false
  }
}

onMounted(fetchProfile)

// ============================================================
//  HIRING
// ============================================================
const selectedJobApplications = ref(null)
const selectedJobId = ref(null)
const visibleSelectedApplications = computed(() => selectedJobApplications.value?.slice(0, 5) || [])
const rolesLoading = ref(true)

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
  rolesLoading.value = true
  try {
    await withMinimumDelay(() => jobsStore.loadMyJobs())
  } catch {
  } finally {
    rolesLoading.value = false
  }
}

// --- Talent search (candidates near the business) ---
const candidatesLoading = ref(true)
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
    await withMinimumDelay(() => jobsStore.loadNearbyCandidates(candidateParams(), options))
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
    selectedJobId.value = jobId
    activeTab.value = 'applications'
  } catch {
  }
}

function closeApplications() {
  selectedJobApplications.value = null
  selectedJobId.value = null
  activeTab.value = 'dashboard'
}

function goToDashboard() {
  selectedJobApplications.value = null
  selectedJobId.value = null
  activeTab.value = 'dashboard'
  if (route.path !== '/' || route.query.tab) router.push('/')
}

// ============================================================
//  WORKER
// ============================================================
const locationStatus = ref('idle') // idle | prompt | denied | done
const nearbyJobs = ref([])
const workerCoords = ref(null)
const applying = ref(null)
const workerApplyError = ref('')
const workerJobsLoading = ref(true)
const workerSearch = ref('')
const workerEmploymentType = ref('')

const workerLocationLabel = computed(() => {
  if (locationStatus.value === 'done') return 'Using your current location'
  if (locationStatus.value === 'prompt') return 'Getting your location...'
  if (locationStatus.value === 'denied') return user.value?.state ? `Roles in ${user.value.state}` : 'Location unavailable'
  return user.value?.state ? `Roles in ${user.value.state}` : 'Add your state to see local roles'
})

function workerJobParams() {
  const params = {}
  const lat = workerCoords.value?.lat ?? user.value?.latitude
  const lng = workerCoords.value?.lng ?? user.value?.longitude
  if (lat != null && lng != null) {
    params.lat = lat
    params.lng = lng
  }
  if (workerSearch.value) params.search = workerSearch.value
  if (workerEmploymentType.value) params.employmentType = workerEmploymentType.value
  return params
}

function goWorkerJob(id) {
  router.push({ name: 'worker-job-detail', params: { id } })
}

function goWorkerApplications() {
  router.push({ name: 'worker-applications' })
}

function showAllSelectedApplications() {
  const id = selectedJobId.value
  closeApplications()
  if (id) goJobApplicants(id)
}

function goAllWorkerJobs(payload = {}) {
  const query = {}
  if (payload.search) query.search = payload.search
  if (payload.employmentType) query.employmentType = payload.employmentType
  router.push({ path: '/work/jobs', query })
}

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
      await loadNearbyJobs({ force: true })
      await loadMyApplications()
    },
    () => {
      locationStatus.value = 'denied'
      workerCoords.value = null
      loadNearbyJobs({ force: true })
      loadMyApplications()
    },
    { enableHighAccuracy: false, timeout: 10000 },
  )
}

async function loadNearbyJobs(options = {}) {
  workerJobsLoading.value = true
  try {
    nearbyJobs.value = await withMinimumDelay(() => jobsStore.loadNearbyJobs(workerJobParams(), options))
  } catch {
  } finally {
    workerJobsLoading.value = false
  }
}

async function searchJobs(payload) {
  workerSearch.value = payload.search || ''
  workerEmploymentType.value = payload.employmentType || ''
  await loadNearbyJobs({ force: true })
}

async function loadMyApplications() {
  try {
    await jobsStore.loadMyApplications()
  } catch {
  }
}

async function applyToJob(jobId) {
  workerApplyError.value = ''
  applying.value = jobId
  try {
    await jobsStore.applyToJob(jobId)
    await loadMyApplications()
    await loadNearbyJobs({ force: true })
  } catch (err) {
    workerApplyError.value = err.response?.data?.message || 'Failed to apply.'
  } finally {
    applying.value = null
  }
}

</script>

<template>
  <div class="dash-shell" :class="{ 'dash-shell--worker': isWorkerUser }">
    <header class="dash-header">
      <BrandLogo @click.prevent="goToDashboard" />
    </header>

    <ProfilePage
      v-if="activeTab === 'profile'"
      :user="user"
      :saving="profileSaving"
      :save-version="profileSaveVersion"
      :save-errors="profileSaveErrors"
      :resume-uploading="resumeUploading"
      :resume-upload-progress="resumeUploadProgress"
      :resume-upload-error="resumeUploadError"
      @back="closeProfile"
      @save="handleProfileSave"
      @clear-errors="clearProfileErrors"
      @upload-resume="handleResumeUpload"
    />

    <HiringDashboard
      v-if="isHiringUser && activeTab !== 'profile'"
      :my-jobs="myJobs"
      :roles-loading="rolesLoading"
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
        <div v-for="app in visibleSelectedApplications" :key="app.id" class="applicant-row">
          <div class="applicant-row__info">
            <strong>{{ app.workerName }}</strong>
            <span class="applicant-row__status">{{ app.status }}</span>
          </div>
          <span class="applicant-row__date">{{ new Date(app.appliedAt).toLocaleDateString() }}</span>
        </div>
        <button v-if="selectedJobApplications.length > 5" type="button" class="dash-btn dash-btn--primary" @click="showAllSelectedApplications">
          Show more applicants ({{ selectedJobApplications.length }} total)
        </button>
      </div>
    </div>

    <p v-if="isWorkerUser && activeTab !== 'profile' && workerApplyError" class="job-form__error" role="alert">{{ workerApplyError }}</p>
    <WorkerDashboard
      v-if="isWorkerUser && activeTab !== 'profile'"
      :user="user"
      :jobs="nearbyJobs"
      :applications="myApplications"
      :loading="workerJobsLoading"
      :location-label="workerLocationLabel"
      :locating="locationStatus === 'prompt'"
      :applying="applying"
      @search-jobs="searchJobs"
      @use-my-location="requestLocation"
      @apply="applyToJob"
      @open-profile="handleProfileClick"
      @open-job="goWorkerJob"
      @view-applications="goWorkerApplications"
      @view-all-jobs="goAllWorkerJobs"
    />

    <main v-else-if="user && !isHiringUser && activeTab !== 'profile'" class="dash-main">
      <div class="dash-empty">
        We could not identify this account type. Please sign out and sign in again with the correct role.
      </div>
    </main>
  </div>
</template>
