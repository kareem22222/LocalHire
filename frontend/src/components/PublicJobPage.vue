<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authRole, hasAuthToken } from '../api'
import { getPublicJob } from '../api/jobs'
import { formatEmploymentType, formatExperience, formatJobLocation, formatSalary, formatShift } from '../utils/jobDisplay'
import { normalizeRole } from '../utils/role'
import { t } from '../i18n'
import BrandLogo from './BrandLogo.vue'
import '../hiring-dashboard.css'

const props = defineProps({ id: { type: String, required: true } })
const emit = defineEmits(['request-auth'])
const router = useRouter()
const job = ref(null)
const loading = ref(true)
const error = ref('')
const sharing = ref(false)
const originalTitle = document.title
let metadata = []

const shareUrl = computed(() => window.location.href)

function setMeta(jobData) {
  document.title = `${jobData.title} at ${jobData.workplaceName} | LocalHire`
  const entries = [
    ['meta[name="description"]', 'name', 'description', jobData.description.slice(0, 155)],
    ['meta[property="og:title"]', 'property', 'og:title', document.title],
    ['meta[property="og:description"]', 'property', 'og:description', jobData.description.slice(0, 200)],
    ['meta[property="og:url"]', 'property', 'og:url', shareUrl.value],
  ]
  metadata = entries.map(([selector, attr, name, content]) => {
    const existing = document.head.querySelector(selector)
    const node = existing || document.head.appendChild(document.createElement('meta'))
    node.setAttribute(attr, name)
    const previous = node.getAttribute('content')
    node.setAttribute('content', content)
    return { node, existing: Boolean(existing), previous }
  })
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.dataset.localhireJob = props.id
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: jobData.title,
    description: jobData.description,
    datePosted: jobData.createdAt,
    hiringOrganization: { '@type': 'Organization', name: jobData.workplaceName },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: jobData.cityArea, addressRegion: jobData.state || undefined, addressCountry: 'IN' } },
  })
  document.head.appendChild(script)
  metadata.push({ node: script, existing: false })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await getPublicJob(props.id)
    job.value = data
    setMeta(data)
  } catch (requestError) {
    job.value = null
    error.value = requestError.response?.status === 404
      ? t('This vacancy is closed or no longer available.')
      : t('We could not load this vacancy. Please try again.')
  } finally {
    loading.value = false
  }
}

function apply() {
  if (!hasAuthToken()) return emit('request-auth', { role: 'LookingForWork', mode: 'login' })
  if (normalizeRole(authRole()) !== 'worker') {
    error.value = t('Sign in with a worker account to apply.')
    return
  }
  router.push({ name: 'worker-job-detail', params: { id: props.id } })
}

async function share() {
  sharing.value = true
  try {
    if (navigator.share) await navigator.share({ title: job.value.title, text: job.value.description, url: shareUrl.value })
    else await navigator.clipboard.writeText(shareUrl.value)
  } catch {
    error.value = t('We could not share this vacancy. Copy the page address instead.')
  } finally {
    sharing.value = false
  }
}

watch(() => props.id, load, { immediate: true })
onBeforeUnmount(() => {
  document.title = originalTitle
  for (const item of metadata) {
    if (item.existing) item.node.setAttribute('content', item.previous || '')
    else item.node.remove()
  }
})
</script>

<template>
  <div class="dash-shell worker-page-shell public-job-page">
    <header class="dash-header"><BrandLogo @click.prevent="router.push('/')" /></header>
    <main class="worker-detail-page">
      <div v-if="loading" class="worker-page-empty">{{ t('Loading vacancy…') }}</div>
      <div v-else-if="!job" class="worker-page-empty" role="alert">
        <h1>{{ t('Job unavailable') }}</h1><p>{{ error }}</p>
        <button type="button" class="dash-btn worker-outline" @click="router.push('/')">{{ t('Visit LocalHire') }}</button>
      </div>
      <template v-else>
        <section class="worker-detail-hero">
          <div><span class="worker-eyebrow">{{ t('Now hiring') }}</span><h1>{{ job.title }}</h1><p>{{ job.workplaceName }} · {{ formatJobLocation(job) }}</p></div>
          <div class="worker-detail-actions">
            <button type="button" class="dash-btn worker-outline" :disabled="sharing" @click="share">{{ t(sharing ? 'Sharing' : 'Share') }}</button>
            <button type="button" class="dash-btn worker-primary" @click="apply">{{ t('Apply now') }}</button>
          </div>
        </section>
        <p v-if="error" class="worker-detail-error" role="alert">{{ error }}</p>
        <section class="worker-detail-card"><h2>{{ t('About this job') }}</h2><p class="worker-detail-description">{{ job.description }}</p></section>
        <section class="worker-detail-card">
          <h2>{{ t('Job details') }}</h2>
          <dl class="worker-detail-grid">
            <div v-if="formatEmploymentType(job)"><dt>{{ t('Employment type') }}</dt><dd>{{ formatEmploymentType(job) }}</dd></div>
            <div v-if="formatSalary(job)"><dt>{{ t('Salary') }}</dt><dd>{{ formatSalary(job) }}</dd></div>
            <div v-if="formatExperience(job)"><dt>{{ t('Experience') }}</dt><dd>{{ formatExperience(job) }}</dd></div>
            <div v-if="job.minEducation"><dt>{{ t('Education') }}</dt><dd>{{ job.minEducation }}</dd></div>
            <div v-if="formatShift(job)"><dt>{{ t('Schedule') }}</dt><dd>{{ formatShift(job) }}</dd></div>
            <div v-if="job.openings"><dt>{{ t('Openings') }}</dt><dd>{{ job.openings }}</dd></div>
          </dl>
        </section>
        <section v-if="job.requiredSkills?.length || job.languages?.length || job.benefits?.length" class="worker-detail-card">
          <h2>{{ t('Requirements and benefits') }}</h2>
          <div v-if="job.requiredSkills?.length" class="worker-detail-group"><h3>{{ t('Skills') }}</h3><div class="worker-detail-chips"><span v-for="item in job.requiredSkills" :key="item">{{ item }}</span></div></div>
          <div v-if="job.languages?.length" class="worker-detail-group"><h3>{{ t('Languages') }}</h3><div class="worker-detail-chips"><span v-for="item in job.languages" :key="item">{{ item }}</span></div></div>
          <div v-if="job.benefits?.length" class="worker-detail-group"><h3>{{ t('Benefits') }}</h3><div class="worker-detail-chips"><span v-for="item in job.benefits" :key="item">{{ item }}</span></div></div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.public-job-page { min-height: 100vh; background: #f7fbf8; }
.worker-detail-page { display: grid; gap: 20px; max-width: 960px; margin: 0 auto; padding: 40px 24px 72px; }
.worker-detail-hero, .worker-detail-card, .worker-page-empty { padding: 30px; border: 1px solid rgba(18,50,74,.08); border-radius: 20px; background: #fff; box-shadow: 0 14px 40px rgba(18,50,74,.06); }
.worker-detail-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.worker-detail-hero h1, .worker-detail-card h2, .worker-page-empty h1 { color: #0b3658; font-family: Manrope,sans-serif; }
.worker-detail-hero h1 { font-size: clamp(30px,5vw,44px); }
.worker-detail-hero p, .worker-detail-description, .worker-page-empty p { margin-top: 8px; color: #526977; line-height: 1.7; }
.worker-detail-actions, .worker-detail-chips { display: flex; flex-wrap: wrap; gap: 10px; }
.worker-eyebrow { display: inline-flex; margin-bottom: 10px; padding: 6px 10px; color: var(--worker-role-green-text); border-radius: 999px; background: rgba(var(--worker-role-green-rgb),.1); font-size: 11px; font-weight: 800; text-transform: uppercase; }
.worker-primary { color: #fff; background: var(--worker-role-gradient); }
.worker-outline { color: var(--worker-role-green-text); border: 1.5px solid rgba(var(--worker-role-green-rgb),.28); background: #fff; }
.worker-detail-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; margin-top: 20px; }
.worker-detail-grid div { padding: 16px; border-radius: 14px; background: #f4faf6; }
.worker-detail-grid dt, .worker-detail-group h3 { color: #526977; font-size: 11px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
.worker-detail-grid dd { margin-top: 6px; color: #12324a; font-weight: 700; }
.worker-detail-group { margin-top: 20px; }
.worker-detail-chips { margin-top: 10px; }
.worker-detail-chips span { padding: 7px 11px; color: var(--worker-role-green-text); border-radius: 999px; background: rgba(var(--worker-role-green-rgb),.09); font-size: 12px; font-weight: 700; }
.worker-detail-error { padding: 14px 18px; color: #b42318; border-radius: 12px; background: #fff0ee; }
.worker-page-empty { text-align: center; }
.worker-page-empty .dash-btn { margin-top: 20px; }
@media (max-width: 640px) { .worker-detail-hero { align-items: stretch; flex-direction: column; } .worker-detail-actions .dash-btn { flex: 1; } .worker-detail-grid { grid-template-columns: 1fr; } }
</style>
