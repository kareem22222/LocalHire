<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
import BrandLogo from './BrandLogo.vue'

const emit = defineEmits(['logout'])

const user = ref(null)

// --- Shared ---
const activeTab = ref('dashboard')

async function fetchProfile() {
  try {
    const { data } = await api.get('/auth/me')
    user.value = data

    // Auto-load role-specific data after profile fetch
    if (data.role === 'Hiring') {
      await loadMyJobs()
    } else if (data.role === 'LookingForWork') {
      await loadMyApplications()
      await loadNearbyJobs()
    }
  } catch {
  }
}

function handleLogout() {
  emit('logout')
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

async function createJob() {
  jobFormError.value = ''
  if (!jobForm.value.title.trim() || !jobForm.value.description.trim() || !jobForm.value.workplaceName.trim() || !jobForm.value.cityArea.trim()) {
    jobFormError.value = 'Please fill in all required fields.'
    return
  }

  creating.value = true
  try {
    await api.post('/hiring/jobs', {
      title: jobForm.value.title.trim(),
      description: jobForm.value.description.trim(),
      workplaceName: jobForm.value.workplaceName.trim(),
      cityArea: jobForm.value.cityArea.trim(),
      latitude: jobForm.value.latitude ?? null,
      longitude: jobForm.value.longitude ?? null,
    })
    jobForm.value = { title: '', description: '', workplaceName: '', cityArea: '', latitude: null, longitude: null }
    showCreateForm.value = false
    await loadMyJobs()
  } catch (err) {
    jobFormError.value = err.response?.data?.message || 'Failed to create job post.'
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
        <span class="dash-user-name">{{ user?.name || 'User' }}</span>
        <span class="dash-role-badge">{{ user?.role === 'Hiring' ? 'Employer' : 'Worker' }}</span>
        <button class="dash-logout-btn" @click="handleLogout">Sign out</button>
      </div>
    </header>

    <main class="dash-main">

      <!-- ===== HIRING DASHBOARD ===== -->
      <template v-if="user?.role === 'Hiring'">
        <div class="dash-welcome">
          <h1 class="dash-welcome__title">
            Employer Dashboard,
            <span class="dash-welcome__name">{{ user?.name }}</span>
          </h1>
          <p class="dash-welcome__desc">
            Post local job openings and review applications from nearby workers.
          </p>
        </div>

        <div class="dash-section">
          <div class="dash-section__header">
            <h2 class="dash-section__title">Your Job Posts</h2>
            <button class="dash-btn dash-btn--primary" @click="showCreateForm = !showCreateForm">
              {{ showCreateForm ? 'Cancel' : '+ New Job Post' }}
            </button>
          </div>

          <div v-if="showCreateForm" class="job-form">
            <div class="job-form__field">
              <label>Title</label>
              <input v-model="jobForm.title" placeholder="e.g. Store Associate" />
            </div>
            <div class="job-form__field">
              <label>Description</label>
              <textarea v-model="jobForm.description" placeholder="Describe the role, hours, pay..." rows="3"></textarea>
            </div>
            <div class="job-form__field">
              <label>Workplace name</label>
              <input v-model="jobForm.workplaceName" placeholder="e.g. FreshMart Store" />
            </div>
            <div class="job-form__field">
              <label>City / Area</label>
              <input v-model="jobForm.cityArea" placeholder="e.g. Andheri West, Mumbai" />
            </div>
            <div class="job-form__row">
              <div class="job-form__field">
                <label>Latitude <span class="job-form__optional">(optional)</span></label>
                <input v-model.number="jobForm.latitude" type="number" step="any" placeholder="19.113" />
              </div>
              <div class="job-form__field">
                <label>Longitude <span class="job-form__optional">(optional)</span></label>
                <input v-model.number="jobForm.longitude" type="number" step="any" placeholder="72.869" />
              </div>
            </div>
            <p v-if="jobFormError" class="job-form__error">{{ jobFormError }}</p>
            <button class="dash-btn dash-btn--primary" :disabled="creating" @click="createJob">
              {{ creating ? 'Posting...' : 'Post Job' }}
            </button>
          </div>

          <div v-if="myJobs.length === 0 && !showCreateForm" class="dash-empty">
            No job posts yet. Create your first one!
          </div>

          <div v-for="job in myJobs" :key="job.id" class="job-card">
            <div class="job-card__body">
              <h3 class="job-card__title">{{ job.title }}</h3>
              <p class="job-card__meta">{{ job.workplaceName }} &middot; {{ job.cityArea }}</p>
              <p class="job-card__desc">{{ job.description }}</p>
              <span v-if="!job.isActive" class="job-card__badge job-card__badge--inactive">Inactive</span>
            </div>
            <div class="job-card__actions">
              <span class="job-card__count">{{ job.applicationCount }} applicant{{ job.applicationCount !== 1 ? 's' : '' }}</span>
              <button class="dash-btn dash-btn--outline" @click="viewApplications(job.id)">View</button>
            </div>
          </div>
        </div>

        <!-- Applicants Modal -->
        <div v-if="selectedJobApplications !== null" class="auth-overlay" @click.self="closeApplications">
          <div class="auth-modal" style="max-width: 520px;">
            <button class="auth-modal__close" @click="closeApplications">&times;</button>
            <h2 class="auth-modal__title" style="margin-bottom: 20px;">Applicants</h2>
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
      </template>

      <!-- ===== WORKER DASHBOARD ===== -->
      <template v-else-if="user?.role === 'LookingForWork'">
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
      </template>

    </main>
  </div>
</template>
