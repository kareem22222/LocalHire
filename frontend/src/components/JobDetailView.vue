<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { buildJobPayload, jobResponseToForm, validateJobForm } from '../utils/jobForm'
import { logout } from '../utils/session'
import BrandLogo from './BrandLogo.vue'
import PostJobPage from './PostJobPage.vue'

const props = defineProps({
  id: { type: String, required: true },
  mode: { type: String, default: 'view' },
})

const router = useRouter()
const jobsStore = useJobsStore()

const jobForm = ref(null)
// Snapshot of the last-saved values so "Cancel" can discard in-progress edits.
const originalForm = ref(null)
const jobFormError = ref('')
const saving = ref(false)
const loaded = ref(false)
const editing = ref(false)

// Load the job the card links to. The hiring-only endpoint returns 403 for
// workers and 404 for unknown/other-owner jobs; in every failure case we send
// the user back to the dashboard (a 401 reloads via the API interceptor).
onMounted(async () => {
  try {
    const data = await jobsStore.loadJob(props.id)
    jobForm.value = jobResponseToForm(data)
    originalForm.value = { ...jobForm.value }
    editing.value = props.mode === 'edit'
    loaded.value = true
  } catch {
    router.replace('/')
  }
})

function goDashboard() {
  router.push('/')
}

function startEdit() {
  jobFormError.value = ''
  editing.value = true
  router.replace(`/jobs/${props.id}/edit`)
}

function cancelEdit() {
  // Discard any in-progress edits by restoring the last-saved snapshot.
  jobForm.value = { ...originalForm.value }
  jobFormError.value = ''
  editing.value = false
  router.replace(`/jobs/${props.id}`)
}

async function saveJob() {
  jobFormError.value = validateJobForm(jobForm.value)
  if (jobFormError.value) return

  saving.value = true
  try {
    const data = await jobsStore.updateJob(props.id, buildJobPayload(jobForm.value))
    // Stay on this page: reflect the saved values in the read-only view.
    jobForm.value = jobResponseToForm(data)
    originalForm.value = { ...jobForm.value }
    editing.value = false
    router.replace(`/jobs/${props.id}`)
  } catch (err) {
    jobFormError.value = err.response?.data?.message || err.message || 'Failed to update job post.'
  } finally {
    saving.value = false
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
      v-if="loaded"
      :job-form="jobForm"
      :job-form-error="jobFormError"
      :creating="saving"
      :readonly="!editing"
      title="Job details"
      :kicker="''"
      :subtitle="''"
      :can-edit="!editing"
      :cancelable="editing"
      submit-label="Save changes"
      busy-label="Saving..."
      @update:job-form="(value) => (jobForm = value)"
      @submit="saveJob"
      @edit="startEdit"
      @cancel="cancelEdit"
      @back="goDashboard"
    />
    <p v-else class="job-detail-loading">Loading job details...</p>
  </div>
</template>

<style scoped>
.job-detail-loading {
  padding: 40px 20px;
  text-align: center;
  color: #5d7482;
}
</style>
