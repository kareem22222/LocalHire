<script setup>
import { computed, reactive, ref } from 'vue'
import { cancelAppointment, confirmAppointment, downloadAppointment, getAppointment, setAppointment } from '../api/jobs'
import { useProfileStore } from '../stores/profile'
import { apiErrorMessage } from '../utils/apiError'

const props = defineProps({ applicationId: { type: String, required: true }, role: { type: String, required: true }, disabled: { type: Boolean, default: false } })
const profile = useProfileStore()
const appointment = ref(null)
const busy = ref(false)
const error = ref('')
const form = reactive({ startsAt: '', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, venue: '', meetingUrl: '', notes: '' })
const canConfirm = computed(() => appointment.value?.status === 'Proposed' && appointment.value.proposedById !== profile.profile?.id)

const loaded = ref(false)
async function load() {
  if (loaded.value) return
  loaded.value = true
  try { appointment.value = (await getAppointment(props.applicationId, props.role)).data || null }
  catch (requestError) { if (requestError.response?.status !== 404) error.value = 'Could not load appointment details.' }
}
async function propose() {
  busy.value = true
  error.value = ''
  try { appointment.value = (await setAppointment(props.applicationId, { ...form, startsAt: new Date(form.startsAt).toISOString() }, props.role)).data }
  catch (requestError) { error.value = apiErrorMessage(requestError, 'Could not save the appointment.') }
  finally { busy.value = false }
}
async function act(request) {
  busy.value = true
  error.value = ''
  try { appointment.value = (await request(props.applicationId, props.role)).data }
  catch (requestError) { error.value = apiErrorMessage(requestError, 'Could not update the appointment.') }
  finally { busy.value = false }
}
async function download() {
  const { data } = await downloadAppointment(props.applicationId, props.role)
  const url = URL.createObjectURL(data)
  Object.assign(document.createElement('a'), { href: url, download: 'localhire-appointment.ics' }).click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <details class="appointment-panel" @toggle="$event.target.open && load()">
    <summary>Interview or trial shift <span v-if="appointment">· {{ appointment.status }}</span></summary>
    <p v-if="error" class="appointment-error" role="alert">{{ error }}</p>
    <div v-if="appointment" class="appointment-current">
      <strong>{{ new Date(appointment.startsAt).toLocaleString() }}</strong><span>{{ appointment.timeZone }}</span>
      <p>{{ appointment.venue || appointment.meetingUrl }}</p><p v-if="appointment.notes">{{ appointment.notes }}</p>
      <div class="appointment-actions">
        <button v-if="canConfirm" type="button" :disabled="busy" @click="act(confirmAppointment)">Confirm</button>
        <button v-if="appointment.status !== 'Cancelled'" type="button" :disabled="busy" @click="act(cancelAppointment)">Cancel</button>
        <button v-if="appointment.status !== 'Cancelled'" type="button" @click="download">Add to calendar</button>
      </div>
    </div>
    <form v-if="!disabled" class="appointment-form" @submit.prevent="propose">
      <label><span>{{ appointment ? 'Reschedule' : 'Propose a time' }}</span><input v-model="form.startsAt" type="datetime-local" required /></label>
      <label><span>Time zone</span><input v-model="form.timeZone" required /></label>
      <label><span>Venue</span><input v-model="form.venue" placeholder="Address or meeting point" /></label>
      <label><span>Meeting URL</span><input v-model="form.meetingUrl" type="url" placeholder="https://…" /></label>
      <label class="appointment-notes"><span>Notes</span><textarea v-model="form.notes" rows="2"></textarea></label>
      <button type="submit" :disabled="busy || (!form.venue && !form.meetingUrl)">{{ busy ? 'Saving…' : appointment ? 'Propose new time' : 'Send proposal' }}</button>
    </form>
  </details>
</template>

<style scoped>
.appointment-panel{margin-top:12px;padding:12px 14px;border:1px solid rgba(18,50,74,.12);border-radius:12px;background:#f8fbfa}.appointment-panel summary{color:#12324a;font-weight:800;cursor:pointer}.appointment-current{display:grid;gap:4px;margin-top:12px;color:#526977;font-size:13px}.appointment-current strong{color:#12324a}.appointment-actions,.appointment-form{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.appointment-actions button,.appointment-form button{padding:8px 11px;color:#07559a;border:1px solid rgba(7,85,154,.22);border-radius:8px;background:#fff;font-weight:700}.appointment-form label{display:grid;gap:4px;min-width:180px;flex:1;color:#526977;font-size:11px;font-weight:700}.appointment-form input,.appointment-form textarea{padding:9px;border:1px solid rgba(18,50,74,.15);border-radius:8px;background:#fff}.appointment-notes{flex-basis:100%!important}.appointment-error{margin-top:8px;color:#b42318}
</style>
