<script setup>
import { computed, ref, onMounted } from 'vue'
import api from '../api'
import BrandLogo from './BrandLogo.vue'
import HiringDashboard from './HiringDashboard.vue'
import ProfilePage from './ProfilePage.vue'

const emit = defineEmits(['logout', 'profile'])

const user = ref(null)
const userRole = computed(() => normalizeRole(user.value?.role))
const isHiringUser = computed(() => userRole.value === 'hiring')
const isWorkerUser = computed(() => userRole.value === 'worker')

// --- Shared ---
const activeTab = ref('dashboard')

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
  emit('logout')
}

function handleProfileClick() {
  emit('profile', user.value)
  activeTab.value = 'profile'
}

function closeProfile() {
  activeTab.value = 'dashboard'
}

onMounted(fetchProfile)

// ============================================================
//  HIRING
// ============================================================
const jobForm = ref({
  title: '',
  description: '',
  workplaceName: '',
  cityArea: '',
  pincode: '',
  state: '',
  latitude: null,
  longitude: null,
})
const jobFormError = ref('')
const creating = ref(false)
const myJobs = ref([])
const selectedJobApplications = ref(null)
const showCreateForm = ref(false)

async function loadMyJobs() {
  try {
    const { data } = await api.get('/hiring/jobs')
    myJobs.value = data
  } catch {
  }
}

function hasValidCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === '' || longitude === '') return false
  const lat = Number(latitude)
  const lng = Number(longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

async function createJob() {
  jobFormError.value = ''
  if (!jobForm.value.title.trim() || !jobForm.value.description.trim() || !jobForm.value.workplaceName.trim() || !jobForm.value.cityArea.trim()) {
    jobFormError.value = 'Please fill in all required fields.'
    return
  }
  if (!/^\d{6}$/.test(String(jobForm.value.pincode || '').trim())) {
    jobFormError.value = 'Please enter a valid 6-digit pincode.'
    return
  }
  if (!jobForm.value.state.trim()) {
    jobFormError.value = 'Please wait for the state to load from the pincode.'
    return
  }

  creating.value = true
  try {
    const location = `${jobForm.value.cityArea.trim()}, ${jobForm.value.state.trim()} - ${jobForm.value.pincode.trim()}`
    const hasCoords = hasValidCoordinates(jobForm.value.latitude, jobForm.value.longitude)
    const payload = {
      title: jobForm.value.title.trim(),
      description: jobForm.value.description.trim(),
      workplaceName: jobForm.value.workplaceName.trim(),
      cityArea: location,
      latitude: hasCoords ? Number(jobForm.value.latitude) : null,
      longitude: hasCoords ? Number(jobForm.value.longitude) : null,
    }
    await api.post('/hiring/jobs', payload)
    jobForm.value = { title: '', description: '', workplaceName: '', cityArea: '', pincode: '', state: '', latitude: null, longitude: null }
    showCreateForm.value = false
    await loadMyJobs()
  } catch (err) {
    jobFormError.value = err.response?.data?.message || err.message || 'Failed to create job post.'
  } finally {
    creating.value = false
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
</script>

<template>
  <div class="dash-shell">
    <header class="dash-header">
      <BrandLogo />
      <div class="dash-header__right">
        <span class="dash-btn dash-btn--primary dash-role-badge">{{ isHiringUser ? 'Hiring' : isWorkerUser ? 'Worker' : 'Account' }}</span>
        <button type="button" class="dash-user-name" @click="handleProfileClick">{{ user?.name || 'User' }}</button>
        <button class="dash-logout-btn" @click="handleLogout">Sign out</button>
      </div>
    </header>

    <ProfilePage v-if="activeTab === 'profile'" :user="user" @back="closeProfile" />

    <HiringDashboard
      v-if="isHiringUser && activeTab !== 'profile'"
      v-model:show-create-form="showCreateForm"
      :job-form="jobForm"
      :job-form-error="jobFormError"
      :creating="creating"
      :my-jobs="myJobs"
      @create-job="createJob"
      @view-applications="viewApplications"
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
              <p class="job-card__meta">{{ job.workplaceName }} &middot; {{ job.cityArea }}</p>
              <p class="job-card__desc">{{ job.description }}</p>
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
