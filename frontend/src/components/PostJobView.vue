<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { useProfileStore } from '../stores/profile'
import { buildJobPayload, emptyJobForm, mapServerErrors, validateJobFormFields } from '../utils/jobForm'
import { normalizeRole } from '../utils/role'
import BrandLogo from './BrandLogo.vue'
import PostJobPage from './PostJobPage.vue'

const router = useRouter()
const profileStore = useProfileStore()
const jobsStore = useJobsStore()

const jobForm = ref(emptyJobForm())
const jobFormError = ref('')
const fieldErrors = ref({})
const creating = ref(false)

// Only hiring accounts may post jobs. Send everyone else back to the dashboard.
onMounted(async () => {
  try {
    const profile = await profileStore.fetchProfile()
    if (normalizeRole(profile.role) !== 'hiring') router.replace('/')
  } catch {
    // A 401 triggers a reload via the API interceptor; other errors return home.
    router.replace('/')
  }
})

function goDashboard() {
  router.push('/')
}

async function createJob() {
  fieldErrors.value = validateJobFormFields(jobForm.value)
  if (Object.keys(fieldErrors.value).length > 0) {
    jobFormError.value = 'Please fix the highlighted fields below.'
    return
  }
  jobFormError.value = ''

  creating.value = true
  try {
    await jobsStore.createJob(buildJobPayload(jobForm.value))
    jobForm.value = emptyJobForm()
    router.push('/')
  } catch (err) {
    const { fieldErrors: serverFields, generalMessage } = mapServerErrors(err.response?.data)
    fieldErrors.value = serverFields
    if (Object.keys(serverFields).length > 0) {
      jobFormError.value = generalMessage || 'Please fix the highlighted fields below.'
    } else {
      jobFormError.value = generalMessage || err.message || 'Failed to create job post.'
    }
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="dash-shell">
    <header class="dash-header">
      <BrandLogo @click.prevent="router.push('/')" />
    </header>

    <PostJobPage
      :job-form="jobForm"
      :job-form-error="jobFormError"
      :field-errors="fieldErrors"
      :creating="creating"
      @update:job-form="(value) => { jobForm = value; fieldErrors = {}; jobFormError = '' }"
      @submit="createJob"
      @back="goDashboard"
    />
  </div>
</template>
