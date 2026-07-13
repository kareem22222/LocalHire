<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { clearAuth } from '../api'
import BrandLogo from './BrandLogo.vue'
import PostJobPage from './PostJobPage.vue'

const router = useRouter()

function emptyJobForm() {
  return {
    title: '',
    description: '',
    workplaceName: '',
    cityArea: '',
    pincode: '',
    state: '',
    latitude: null,
    longitude: null,
    employmentType: '',
    salaryMin: '',
    salaryMax: '',
    salaryPeriod: '',
    minEducation: '',
    experienceMinYears: '',
    experienceMaxYears: '',
    workingDays: '',
    shiftStartTime: '',
    shiftEndTime: '',
    openings: '',
    requiredSkills: '',
    languages: '',
    benefits: '',
  }
}

const jobForm = ref(emptyJobForm())
const jobFormError = ref('')
const creating = ref(false)

function normalizeRole(role) {
  if (role === 1 || role === '1') return 'hiring'
  if (role === 0 || role === '0') return 'worker'

  const value = String(role || '').trim().toLowerCase()
  if (['hiring', 'employer'].includes(value)) return 'hiring'
  if (['lookingforwork', 'looking_for_work', 'worker'].includes(value)) return 'worker'
  return ''
}

// Only hiring accounts may post jobs. Send everyone else back to the dashboard.
onMounted(async () => {
  try {
    const { data } = await api.get('/auth/me')
    if (normalizeRole(data.role) !== 'hiring') {
      router.replace('/')
    }
  } catch {
    // A 401 triggers a reload via the API interceptor; other errors return home.
    router.replace('/')
  }
})

function goDashboard() {
  router.push('/')
}

function logout() {
  clearAuth()
  window.location.reload()
}

function hasValidCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === '' || longitude === '') return false
  const lat = Number(latitude)
  const lng = Number(longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

function numberOrNull(value) {
  const text = String(value ?? '').trim()
  if (text === '') return null
  const num = Number(text)
  return Number.isFinite(num) ? num : null
}

function splitList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
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
    const hasCoords = hasValidCoordinates(jobForm.value.latitude, jobForm.value.longitude)
    const payload = {
      title: jobForm.value.title.trim(),
      description: jobForm.value.description.trim(),
      workplaceName: jobForm.value.workplaceName.trim(),
      cityArea: jobForm.value.cityArea.trim(),
      state: jobForm.value.state.trim() || null,
      pincode: jobForm.value.pincode.trim() || null,
      latitude: hasCoords ? Number(jobForm.value.latitude) : null,
      longitude: hasCoords ? Number(jobForm.value.longitude) : null,
      employmentType: jobForm.value.employmentType || null,
      salaryMin: numberOrNull(jobForm.value.salaryMin),
      salaryMax: numberOrNull(jobForm.value.salaryMax),
      salaryPeriod: jobForm.value.salaryPeriod || null,
      minEducation: jobForm.value.minEducation.trim() || null,
      experienceMinYears: numberOrNull(jobForm.value.experienceMinYears),
      experienceMaxYears: numberOrNull(jobForm.value.experienceMaxYears),
      workingDays: jobForm.value.workingDays.trim() || null,
      shiftStartTime: jobForm.value.shiftStartTime || null,
      shiftEndTime: jobForm.value.shiftEndTime || null,
      openings: numberOrNull(jobForm.value.openings),
      requiredSkills: splitList(jobForm.value.requiredSkills),
      languages: splitList(jobForm.value.languages),
      benefits: splitList(jobForm.value.benefits),
    }
    await api.post('/hiring/jobs', payload)
    jobForm.value = emptyJobForm()
    router.push('/')
  } catch (err) {
    jobFormError.value = err.response?.data?.message || err.message || 'Failed to create job post.'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="dash-shell">
    <header class="dash-header">
      <BrandLogo />
      <div class="dash-header__right">
        <button type="button" class="dash-btn dash-btn--primary dash-role-badge" @click="goDashboard">Dashboard</button>
        <button class="dash-logout-btn" @click="logout">Sign out</button>
      </div>
    </header>

    <PostJobPage
      :job-form="jobForm"
      :job-form-error="jobFormError"
      :creating="creating"
      @update:job-form="(value) => (jobForm = value)"
      @submit="createJob"
      @back="goDashboard"
    />
  </div>
</template>
