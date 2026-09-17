<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
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
const DRAFT_KEY = 'localhire.jobDraft'
const savedDraft = ref(readDraft())
const baseline = ref(emptyJobForm())
const dirty = computed(() => JSON.stringify(jobForm.value) !== JSON.stringify(baseline.value))

function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) }
  catch { return null }
}

function persistDraft(value) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(value)) }
  catch { /* Storage can be unavailable in private mode. */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) }
  catch { /* Ignore storage errors. */ }
  savedDraft.value = null
}

// Only hiring accounts may post jobs. Send everyone else back to the dashboard.
onMounted(async () => {
  try {
    const profile = await profileStore.fetchProfile()
    if (normalizeRole(profile.role) !== 'hiring') router.replace('/')
    else jobForm.value = {
      ...jobForm.value,
      workplaceName: profile.businessName || '',
      cityArea: profile.businessLocation || profile.cityArea || '',
      state: profile.state || '',
      pincode: profile.pincode || '',
    }
    baseline.value = { ...jobForm.value }
  } catch {
    // A 401 triggers a reload via the API interceptor; other errors return home.
    router.replace('/')
  }
})

function updateJobForm(value) {
  jobForm.value = value
  fieldErrors.value = {}
  jobFormError.value = ''
  persistDraft(value)
}

function resumeDraft() {
  jobForm.value = { ...emptyJobForm(), ...savedDraft.value }
  savedDraft.value = null
}

function discardDraft() {
  clearDraft()
}

function confirmLeave() {
  return !dirty.value || window.confirm('Leave this page? Your draft is saved and can be resumed later.')
}

function handleBeforeUnload(event) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(confirmLeave)
onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))

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
    baseline.value = { ...jobForm.value }
    clearDraft()
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

    <section v-if="savedDraft" class="draft-notice" role="status">
      <div><strong>Resume saved draft?</strong><p>Your unfinished job post is stored on this device.</p></div>
      <div class="draft-notice__actions">
        <button type="button" class="dash-btn dash-btn--primary" @click="resumeDraft">Resume draft</button>
        <button type="button" class="dash-btn dash-btn--outline" @click="discardDraft">Discard</button>
      </div>
    </section>

    <PostJobPage
      :job-form="jobForm"
      :job-form-error="jobFormError"
      :field-errors="fieldErrors"
      :creating="creating"
      @update:job-form="updateJobForm"
      @submit="createJob"
      @back="goDashboard"
    />
  </div>
</template>

<style scoped>
.draft-notice { display: flex; align-items: center; justify-content: space-between; gap: 20px; max-width: 1052px; margin: 24px auto 0; padding: 18px 20px; border: 1px solid rgba(7,85,154,.2); border-radius: 16px; background: #fff; box-shadow: 0 12px 34px rgba(18,50,74,.06); }
.draft-notice strong { color: #0b3658; }
.draft-notice p { margin-top: 3px; color: #5d7482; font-size: 13px; }
.draft-notice__actions { display: flex; gap: 8px; }
@media (max-width: 640px) { .draft-notice { align-items: stretch; flex-direction: column; margin-inline: 16px; } .draft-notice__actions .dash-btn { flex: 1; } }
</style>
