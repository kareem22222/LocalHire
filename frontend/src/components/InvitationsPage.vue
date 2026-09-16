<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import BrandLogo from './BrandLogo.vue'
import '../hiring-dashboard.css'

const router = useRouter()
const jobs = useJobsStore()
const loading = ref(true)
const error = ref('')
const busy = ref(null)
const invitations = computed(() => jobs.invitations)

async function load() {
  loading.value = true
  error.value = ''
  try { await jobs.loadInvitations() }
  catch { error.value = 'Could not load your invitations.' }
  finally { loading.value = false }
}

async function decline(id) {
  if (!window.confirm('Decline this invitation? No application will be created.')) return
  busy.value = id
  try { await jobs.declineInvitation(id) }
  catch { error.value = 'Could not decline the invitation.' }
  finally { busy.value = null }
}

onMounted(load)
</script>

<template>
  <div class="dash-shell invitation-shell">
    <header class="dash-header">
      <BrandLogo @click.prevent="router.push('/')" />
      <button type="button" class="dash-btn invitation-outline" @click="router.push('/')">Back to jobs</button>
    </header>
    <main class="invitation-page">
      <header><span>Opportunities</span><h1>Invitations to apply</h1><p>You stay in control: view the role and apply through the usual application flow, or decline.</p></header>
      <p v-if="error" class="invitation-error" role="alert">{{ error }}</p>
      <p v-if="loading" role="status">Loading invitations...</p>
      <section v-else-if="invitations.length" class="invitation-list" aria-label="Job invitations">
        <article v-for="invitation in invitations" :key="invitation.id">
          <div><span>{{ invitation.status }}</span><h2>{{ invitation.jobTitle }}</h2><p>{{ invitation.workplaceName }} · Invited {{ new Date(invitation.createdAt).toLocaleDateString('en-IN') }}</p></div>
          <div class="invitation-actions">
            <button type="button" class="dash-btn invitation-outline" @click="router.push(`/work/jobs/${invitation.jobPostId}`)">View job</button>
            <button v-if="invitation.status === 'Pending'" type="button" class="dash-btn invitation-primary" :disabled="busy === invitation.id" @click="decline(invitation.id)">Decline</button>
          </div>
        </article>
      </section>
      <section v-else class="invitation-empty"><h2>No invitations yet</h2><p>When a local employer invites you to a role, it will appear here.</p></section>
    </main>
  </div>
</template>

<style scoped>
.invitation-shell { background: #eef9f2; min-height: 100vh; }.invitation-page { display: grid; gap: 20px; max-width: 900px; margin: auto; padding: 40px 24px 72px; }.invitation-page > header,.invitation-list article,.invitation-empty { padding: 28px; border: 1px solid rgba(18,50,74,.08); border-radius: 20px; background: #fff; }.invitation-page h1 { margin-top: 7px; color: #0b3658; font: 800 clamp(32px,6vw,52px)/1 Manrope,sans-serif; }.invitation-page header > span,.invitation-list article span { color: var(--worker-role-green-text); font-size: 11px; font-weight: 800; text-transform: uppercase; }.invitation-page p { margin-top: 8px; color: #526977; line-height: 1.6; }.invitation-list { display: grid; gap: 12px; }.invitation-list article { display: flex; align-items: center; justify-content: space-between; gap: 20px; }.invitation-list h2,.invitation-empty h2 { margin-top: 6px; color: #12324a; }.invitation-actions { display: flex; gap: 8px; }.invitation-primary { color: #fff; background: var(--worker-role-gradient); }.invitation-outline { color: var(--worker-role-green-text); border: 1px solid rgba(var(--worker-role-green-rgb),.3); background: #fff; }.invitation-error { padding: 14px; color: #b42318; background: #fff0ee; border-radius: 12px; }@media(max-width:640px){.invitation-list article{align-items:stretch;flex-direction:column}.invitation-actions .dash-btn{flex:1}}
</style>
