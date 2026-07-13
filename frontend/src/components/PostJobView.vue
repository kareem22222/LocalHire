<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMe } from '../api/profile'
import { createJob as submitJobPost } from '../api/jobs'
import { buildJobPayload, emptyJobForm, validateJobForm } from '../utils/jobForm'
import { normalizeRole } from '../utils/role'
import { logout } from '../utils/session'
import BrandLogo from './BrandLogo.vue'
import PostJobPage from './PostJobPage.vue'

const router = useRouter()

const jobForm = ref(emptyJobForm())
const jobFormError = ref('')
const creating = ref(false)

// Only hiring accounts may post jobs. Send everyone else back to the dashboard.
onMounted(async () => {
  try {
    const { data } = await getMe()
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

async function createJob() {
  jobFormError.value = validateJobForm(jobForm.value)
  if (jobFormError.value) return

  creating.value = true
  try {
    await submitJobPost(buildJobPayload(jobForm.value))
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
