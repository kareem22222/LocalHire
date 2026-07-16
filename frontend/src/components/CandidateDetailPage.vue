<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { useSavedCandidates } from '../composables/useSavedCandidates'
import BrandLogo from './BrandLogo.vue'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const { isSaved, add } = useSavedCandidates()

const loading = ref(false)
const error = ref('')
const candidate = ref(null)
const showContact = ref(route.query.contact === '1')

const candidateId = computed(() => route.params.id)
const shortlisted = computed(() => candidate.value && isSaved(candidate.value.id))

const initials = computed(() => {
  const name = candidate.value?.name || 'U'
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('')
})

const locationSummary = computed(() => {
  if (!candidate.value) return ''
  const parts = [candidate.value.area, candidate.value.state].filter(Boolean)
  const base = parts.join(', ')
  return candidate.value.pincode ? [base, candidate.value.pincode].filter(Boolean).join(' - ') : base
})

const dateOfBirth = computed(() => {
  const dob = candidate.value?.dateOfBirth
  if (!dob) return ''
  const date = new Date(dob)
  return Number.isNaN(date.getTime()) ? dob : date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
})

const memberSince = computed(() => {
  const created = candidate.value?.createdAt
  if (!created) return ''
  const date = new Date(created)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    candidate.value = await jobsStore.loadCandidate(candidateId.value, { force: true })
  } catch {
    error.value = 'We could not load this candidate.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

function shortlist() {
  if (candidate.value) add(candidate.value.id)
}

function contact() {
  showContact.value = true
}
</script>

<template>
  <div class="dash-shell">
    <header class="dash-header">
      <BrandLogo @click.prevent="router.push('/')" />
      <div class="dash-header__right">
        <button type="button" class="dash-btn dash-btn--primary" @click="goBack">Back</button>
      </div>
    </header>

    <main class="dash-main candidate-detail">
      <p v-if="error" class="job-form__error" role="alert">{{ error }}</p>

      <div v-if="loading" class="candidate-empty">
        <strong>Loading candidate...</strong>
        <p>Fetching this person's profile.</p>
      </div>

      <template v-else-if="candidate">
        <section class="candidate-detail__hero">
          <div class="candidate-detail__avatar" aria-hidden="true">{{ initials }}</div>
          <div class="candidate-detail__intro">
            <h1>{{ candidate.name }}</h1>
            <p v-if="candidate.role" class="candidate-detail__role">{{ candidate.role }}</p>
            <div class="candidate-detail__tags">
              <span v-if="locationSummary" class="profile-badge">{{ locationSummary }}</span>
              <span v-if="memberSince" class="profile-badge profile-badge--muted">Member since {{ memberSince }}</span>
              <span v-if="shortlisted" class="profile-badge profile-badge--role">Shortlisted</span>
            </div>
          </div>
          <div class="candidate-detail__actions">
            <button type="button" class="dash-btn dash-btn--primary" :disabled="shortlisted" @click="shortlist">
              {{ shortlisted ? 'Shortlisted' : 'Shortlist' }}
            </button>
            <button type="button" class="dash-btn dash-btn--outline" @click="contact">Contact</button>
          </div>
        </section>

        <section v-if="showContact" class="candidate-detail__card candidate-detail__contact">
          <h2>Contact</h2>
          <p class="candidate-detail__hint">Reach out to {{ candidate.name }} directly.</p>
          <div class="candidate-detail__grid">
            <div class="candidate-detail__field">
              <span class="candidate-detail__label">Email</span>
              <a :href="`mailto:${candidate.email}`" class="candidate-detail__value candidate-detail__link">{{ candidate.email }}</a>
            </div>
          </div>
        </section>

        <section class="candidate-detail__card">
          <h2>Candidate details</h2>
          <div class="candidate-detail__grid">
            <div class="candidate-detail__field">
              <span class="candidate-detail__label">Role</span>
              <p class="candidate-detail__value">{{ candidate.role || '—' }}</p>
            </div>
            <div class="candidate-detail__field">
              <span class="candidate-detail__label">Gender</span>
              <p class="candidate-detail__value">{{ candidate.gender || '—' }}</p>
            </div>
            <div class="candidate-detail__field">
              <span class="candidate-detail__label">Date of birth</span>
              <p class="candidate-detail__value">{{ dateOfBirth || '—' }}</p>
            </div>
            <div class="candidate-detail__field candidate-detail__field--full">
              <span class="candidate-detail__label">Address</span>
              <p class="candidate-detail__value">{{ candidate.addressLine || '—' }}</p>
            </div>
            <div class="candidate-detail__field">
              <span class="candidate-detail__label">City / Area</span>
              <p class="candidate-detail__value">{{ candidate.area || '—' }}</p>
            </div>
            <div class="candidate-detail__field">
              <span class="candidate-detail__label">State</span>
              <p class="candidate-detail__value">{{ candidate.state || '—' }}</p>
            </div>
            <div class="candidate-detail__field">
              <span class="candidate-detail__label">Pincode</span>
              <p class="candidate-detail__value">{{ candidate.pincode || '—' }}</p>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.candidate-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.candidate-detail__hero {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px;
  background: #ffffff;
  border: 1px solid rgba(18, 50, 74, 0.06);
  border-radius: 20px;
  box-shadow: 0 12px 32px rgba(18, 50, 74, 0.04);
  flex-wrap: wrap;
}

.candidate-detail__avatar {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-family: Manrope, sans-serif;
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  border-radius: 50%;
  background: linear-gradient(135deg, #07559a, #12ad59);
  box-shadow: 0 8px 24px rgba(7, 85, 154, 0.22);
}

.candidate-detail__intro {
  flex: 1;
  min-width: 220px;
}

.candidate-detail__intro h1 {
  color: #0b3658;
  font-family: Manrope, sans-serif;
  font-size: 28px;
  font-weight: 800;
}

.candidate-detail__role {
  margin-top: 4px;
  color: #5d7482;
  font-size: 15px;
  font-weight: 700;
}

.candidate-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.profile-badge {
  font-size: 12px;
  font-weight: 600;
  color: #12324a;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(18, 50, 74, 0.06);
}

.profile-badge--role {
  color: #fff;
  background: linear-gradient(135deg, #07559a, #0966ad);
}

.profile-badge--muted {
  color: #5d7482;
  background: rgba(18, 50, 74, 0.04);
}

.candidate-detail__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.candidate-detail__card {
  padding: 28px 32px;
  background: #ffffff;
  border: 1px solid rgba(18, 50, 74, 0.06);
  border-radius: 16px;
}

.candidate-detail__card h2 {
  color: #0b3658;
  font-family: Manrope, sans-serif;
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 6px;
}

.candidate-detail__contact {
  border-color: rgba(7, 85, 154, 0.25);
  background: #f5faff;
}

.candidate-detail__hint {
  color: #5d7482;
  font-size: 13px;
  margin-bottom: 18px;
}

.candidate-detail__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px 24px;
  margin-top: 16px;
}

.candidate-detail__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.candidate-detail__field--full {
  grid-column: 1 / -1;
}

.candidate-detail__label {
  font-size: 13px;
  font-weight: 600;
  color: #12324a;
}

.candidate-detail__value {
  font-size: 15px;
  color: #12324a;
  overflow-wrap: break-word;
}

.candidate-detail__link {
  color: #07559a;
  font-weight: 700;
  text-decoration: none;
}

.candidate-detail__link:hover {
  text-decoration: underline;
}

@media (max-width: 700px) {
  .candidate-detail__hero {
    padding: 24px;
  }
  .candidate-detail__card {
    padding: 24px 22px;
  }
  .candidate-detail__grid {
    grid-template-columns: 1fr;
  }
  .candidate-detail__actions {
    width: 100%;
  }
  .candidate-detail__actions .dash-btn {
    flex: 1;
  }
}
</style>
