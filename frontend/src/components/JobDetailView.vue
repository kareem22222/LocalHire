<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { buildJobPayload, jobResponseToForm, mapServerErrors, validateJobFormFields } from '../utils/jobForm'
import { apiErrorMessage } from '../utils/apiError'
import BrandLogo from './BrandLogo.vue'
import PostJobPage from './PostJobPage.vue'

const props = defineProps({
  id: { type: String, required: true },
  mode: { type: String, default: 'view' },
})

const router = useRouter()
const jobsStore = useJobsStore()

const jobForm = ref(null)
const job = ref(null)
// Snapshot of the last-saved values so "Cancel" can discard in-progress edits.
const originalForm = ref(null)
const jobFormError = ref('')
const fieldErrors = ref({})
const saving = ref(false)
const loaded = ref(false)
const editing = ref(false)
const loadError = ref('')
const statusChanging = ref(false)
const conflictJob = ref(null)
let loadGeneration = 0

const conflictFields = computed(() => {
  if (!conflictJob.value || !jobForm.value) return []
  const latest = jobResponseToForm(conflictJob.value)
  return Object.keys(latest).filter((key) => JSON.stringify(latest[key]) !== JSON.stringify(jobForm.value[key]))
})

// Load the job the card links to. The hiring-only endpoint returns 403 for
// workers and 404 for unknown/other-owner jobs; a 401 reloads via the API interceptor.
async function load() {
  const generation = ++loadGeneration
  loaded.value = false
  loadError.value = ''
  job.value = null
  jobForm.value = null
  originalForm.value = null
  jobFormError.value = ''
  fieldErrors.value = {}
  conflictJob.value = null
  try {
    const data = await jobsStore.loadJob(props.id)
    if (generation !== loadGeneration) return
    job.value = data
    jobForm.value = jobResponseToForm(data)
    originalForm.value = { ...jobForm.value }
    editing.value = props.mode === 'edit'
    loaded.value = true
  } catch (err) {
    if (generation === loadGeneration) loadError.value = apiErrorMessage(err, 'We could not load this job.')
  }
}

watch(() => props.id, load, { immediate: true })
watch(() => props.mode, (mode) => {
  if (loaded.value) editing.value = mode === 'edit'
})

function goDashboard() {
  router.push('/')
}

function startEdit() {
  jobFormError.value = ''
  fieldErrors.value = {}
  editing.value = true
  router.replace(`/jobs/${props.id}/edit`)
}

function cancelEdit() {
  // Discard any in-progress edits by restoring the last-saved snapshot.
  jobForm.value = { ...originalForm.value }
  jobFormError.value = ''
  fieldErrors.value = {}
  editing.value = false
  router.replace(`/jobs/${props.id}`)
}

async function saveJob() {
  fieldErrors.value = validateJobFormFields(jobForm.value)
  if (Object.keys(fieldErrors.value).length > 0) {
    jobFormError.value = 'Please fix the highlighted fields below.'
    return
  }
  jobFormError.value = ''

  saving.value = true
  try {
    const data = await jobsStore.updateJob(props.id, { ...buildJobPayload(jobForm.value), version: job.value.version })
    job.value = data
    // Stay on this page: reflect the saved values in the read-only view.
    jobForm.value = jobResponseToForm(data)
    originalForm.value = { ...jobForm.value }
    editing.value = false
    router.replace(`/jobs/${props.id}`)
  } catch (err) {
    if (err.response?.status === 409) {
      conflictJob.value = await jobsStore.loadJob(props.id, { force: true }).catch(() => null)
      jobFormError.value = err.response?.data?.error || 'This job changed after you opened it. Compare your edits with the latest version.'
      return
    }
    const { fieldErrors: serverFields, generalMessage } = mapServerErrors(err.response?.data)
    fieldErrors.value = serverFields
    if (Object.keys(serverFields).length > 0) {
      jobFormError.value = generalMessage || 'Please fix the highlighted fields below.'
    } else {
      jobFormError.value = generalMessage || err.message || 'Failed to update job post.'
    }
  } finally {
    saving.value = false
  }
}

function reloadLatest() {
  if (!conflictJob.value) return
  job.value = conflictJob.value
  jobForm.value = jobResponseToForm(conflictJob.value)
  originalForm.value = { ...jobForm.value }
  conflictJob.value = null
  jobFormError.value = ''
}

async function changeStatus(isActive) {
  statusChanging.value = true
  jobFormError.value = ''
  try {
    job.value = await jobsStore.setJobActive(props.id, isActive)
  } catch (err) {
    jobFormError.value = apiErrorMessage(err, 'Could not update this vacancy.')
  } finally {
    statusChanging.value = false
  }
}
</script>

<template>
  <div class="dash-shell">
    <header class="dash-header">
      <BrandLogo @click.prevent="router.push('/')" />
    </header>

    <section v-if="conflictJob" class="job-conflict" role="alert">
      <div>
        <strong>This job was updated elsewhere.</strong>
        <p>Your edits are still here. Latest values differ in: {{ conflictFields.join(', ') || 'saved fields' }}.</p>
      </div>
      <button type="button" class="dash-btn dash-btn--outline" @click="reloadLatest">Reload latest</button>
    </section>

    <PostJobPage
      v-if="loaded"
      :job-form="jobForm"
      :job-form-error="jobFormError"
      :field-errors="fieldErrors"
      :creating="saving"
      :readonly="!editing"
      title="Job details"
      :kicker="''"
      :subtitle="''"
      :can-edit="!editing"
      :cancelable="editing"
      :job-active="job?.isActive"
      :status-changing="statusChanging"
      submit-label="Save changes"
      busy-label="Saving..."
      @update:job-form="(value) => (jobForm = value)"
      @submit="saveJob"
      @edit="startEdit"
      @cancel="cancelEdit"
      @status="changeStatus"
      @back="goDashboard"
    />
    <section v-else-if="loadError" class="job-detail-loading" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" class="dash-btn dash-btn--primary" @click="load">Retry</button>
    </section>
    <p v-else class="job-detail-loading">Loading job details...</p>
  </div>
</template>

<style scoped>
.job-detail-loading {
  padding: 40px 20px;
  text-align: center;
  color: #5d7482;
}
.job-conflict { display: flex; align-items: center; justify-content: space-between; gap: 20px; max-width: 1052px; margin: 24px auto 0; padding: 18px 20px; color: #7a3e00; border: 1px solid #f1b56b; border-radius: 14px; background: #fff8ed; }
.job-conflict p { margin-top: 4px; font-size: 13px; }
@media (max-width: 640px) { .job-conflict { align-items: stretch; flex-direction: column; margin-inline: 16px; } }
</style>
