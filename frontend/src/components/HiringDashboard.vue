<script setup>
import { computed, ref, watch } from 'vue'
import '../hiring-dashboard.css'

const props = defineProps({
  jobForm: { type: Object, required: true },
  jobFormError: { type: String, default: '' },
  creating: { type: Boolean, default: false },
  myJobs: { type: Array, default: () => [] },
  candidates: { type: Array, default: () => [] },
  showCreateForm: { type: Boolean, default: false },
})

const emit = defineEmits(['update:showCreateForm', 'create-job', 'view-applications', 'shortlist'])

const search = ref('')
const role = ref('All')
const availability = ref('All')
const pincodeStatus = ref('idle')
const pincodeError = ref('')
const areaOptions = ref([])
let pincodeRequestId = 0

const candidates = computed(() => props.candidates)

const roles = computed(() => ['All', ...new Set(candidates.value.map((candidate) => candidate.role))])
const availabilityOptions = ['All', 'Immediate', 'This week', 'Next week']
const indianStates = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]

const openRoles = computed(() => {
  return props.myJobs.map((job) => {
    const applicants = job.applicationCount ?? 0
    return {
      id: job.id,
      title: job.title,
      area: job.cityArea,
      workplaceName: job.workplaceName,
      applicants,
      shortlisted: Math.min(Math.round(applicants * 0.35), applicants),
      status: job.isActive === false ? 'Inactive' : applicants > 0 ? 'Review applicants' : 'New role',
      isBackendJob: true,
    }
  })
})

const filteredCandidates = computed(() => {
  const text = search.value.trim().toLowerCase()
  return candidates.value.filter((candidate) => {
    const matchesText = !text || [
      candidate.name,
      candidate.role,
      candidate.area,
      candidate.city,
      ...candidate.skills,
    ].join(' ').toLowerCase().includes(text)
    const matchesRole = role.value === 'All' || candidate.role === role.value
    const matchesAvailability = availability.value === 'All' || candidate.availability === availability.value
    return matchesText && matchesRole && matchesAvailability
  })
})

function shortlist(candidate) {
  emit('shortlist', candidate)
}

watch(
  () => props.jobForm.pincode,
  async (value) => {
    const requestId = ++pincodeRequestId
    const pincode = String(value || '').replace(/\D/g, '').slice(0, 6)
    if (pincode !== value) {
      props.jobForm.pincode = pincode
      return
    }

    props.jobForm.state = ''
    props.jobForm.cityArea = ''
    areaOptions.value = []
    pincodeError.value = ''

    if (!pincode) {
      pincodeStatus.value = 'idle'
      return
    }

    if (pincode.length !== 6) {
      pincodeStatus.value = 'idle'
      return
    }

    pincodeStatus.value = 'loading'

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await response.json()
      if (requestId !== pincodeRequestId) return

      const postOffices = data?.[0]?.PostOffice || []
      const postOffice = postOffices[0]
      if (!postOffice?.State || !postOffices.length) {
        pincodeStatus.value = 'error'
        pincodeError.value = 'No location found for this pincode.'
        return
      }

      areaOptions.value = postOffices
        .map((item) => ({
          label: [item.Name, item.Block, item.District].filter(Boolean).join(', '),
          value: [item.Name, item.District].filter(Boolean).join(', '),
        }))
        .filter((item, index, list) => item.value && list.findIndex((option) => option.value === item.value) === index)
      props.jobForm.state = postOffice.State
      props.jobForm.cityArea = areaOptions.value[0]?.value || ''
      pincodeStatus.value = 'done'
    } catch {
      if (requestId !== pincodeRequestId) return
      pincodeStatus.value = 'error'
      pincodeError.value = 'Could not fetch state for this pincode.'
    }
  },
)
</script>

<template>
  <main class="hiring-dashboard">
    <section class="hiring-search-panel">
      <div class="hiring-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="search" type="search" placeholder="Search candidate, role, area, or skill" aria-label="Search candidates" />
      </div>

      <label>
        <span>Role</span>
        <select v-model="role">
          <option v-for="item in roles" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>

      <label>
        <span>Availability</span>
        <select v-model="availability">
          <option v-for="item in availabilityOptions" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
    </section>

    <section class="hiring-metrics">
      <div>
        <strong>{{ filteredCandidates.length }}</strong>
        <span>matching candidates</span>
      </div>
      <div>
        <strong>{{ openRoles.length }}</strong>
        <span>open hiring roles</span>
      </div>
      <div>
        <strong>24h</strong>
        <span>avg response time</span>
      </div>
    </section>

    <section class="hiring-roles">
      <div class="hiring-roles__head">
        <div>
          <span class="hiring-kicker">Hiring desk</span>
          <h2>Open roles you are hiring for</h2>
        </div>
        <button type="button" class="dash-btn dash-btn--primary" @click="emit('update:showCreateForm', !showCreateForm)">
          {{ showCreateForm ? 'Cancel' : 'Post new role' }}
        </button>
      </div>

      <div v-if="showCreateForm" class="job-form">
        <div class="job-form__field">
          <label for="job-title">Title</label>
          <input id="job-title" v-model="jobForm.title" placeholder="e.g. Store Associate" />
        </div>
        <div class="job-form__field">
          <label for="job-description">Description</label>
          <textarea id="job-description" v-model="jobForm.description" placeholder="Describe the role, hours, pay..." rows="3"></textarea>
        </div>
        <div class="job-form__field">
          <label for="job-workplace">Workplace name</label>
          <input id="job-workplace" v-model="jobForm.workplaceName" placeholder="e.g. FreshMart Store" />
        </div>
        <div class="job-form__row">
          <div class="job-form__field">
            <label for="job-pincode">Pincode</label>
            <input id="job-pincode" v-model="jobForm.pincode" inputmode="numeric" maxlength="6" placeholder="" />
            <span v-if="pincodeStatus === 'loading'" class="job-form__hint">Fetching area and state...</span>
            <span v-else-if="pincodeError" class="job-form__error-text">{{ pincodeError }}</span>
          </div>
          <div class="job-form__field">
            <label for="job-state">State</label>
            <select id="job-state" v-model="jobForm.state">
              <option value="">Select state</option>
              <option v-for="state in indianStates" :key="state" :value="state">{{ state }}</option>
            </select>
          </div>
        </div>
        <div class="job-form__field">
          <label for="job-city-area">City / Village / Area</label>
          <select v-if="areaOptions.length" id="job-city-area" v-model="jobForm.cityArea">
            <option v-for="area in areaOptions" :key="area.value" :value="area.value">{{ area.label }}</option>
          </select>
          <input v-else id="job-city-area" v-model="jobForm.cityArea" placeholder="" />
          <span v-if="areaOptions.length > 1" class="job-form__hint">Choose the nearest area for this role.</span>
        </div>
        <p v-if="jobFormError" class="job-form__error">{{ jobFormError }}</p>
        <button class="dash-btn dash-btn--primary" :disabled="creating" @click="emit('create-job')">
          {{ creating ? 'Posting...' : 'Post Job' }}
        </button>
      </div>

      <div class="hiring-role-grid">
        <article v-for="item in openRoles" :key="item.id || item.title" class="hiring-role-card">
          <span>{{ item.status }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.workplaceName ? `${item.workplaceName} - ${item.area}` : item.area }}</p>
          <div>
            <strong>{{ item.applicants }}</strong>
            <small>applicants</small>
            <strong>{{ item.shortlisted }}</strong>
            <small>shortlisted</small>
          </div>
          <button v-if="item.isBackendJob" type="button" class="hiring-role-card__link" @click="emit('view-applications', item.id)">
            View applications
          </button>
        </article>
      </div>
      <div v-if="!openRoles.length" class="candidate-empty">
        <strong>No open roles yet</strong>
        <p>Post a role to start tracking applicants and matches.</p>
      </div>
    </section>

    <section class="hiring-layout">
      <aside class="hiring-sidebar">
        <h2>Hiring pipeline</h2>
        <p>Move fast: shortlist high-match candidates, schedule interviews, and keep the role status current.</p>
        <div class="hiring-progress">
          <span>Pipeline health</span>
          <strong>88%</strong>
          <i><b></b></i>
        </div>
      </aside>

      <div class="candidate-list">
        <div class="candidate-list__head">
          <div>
            <span class="hiring-kicker">Recommended</span>
            <h2>Talent near your business</h2>
          </div>
          <span>{{ filteredCandidates.length }} results</span>
        </div>

        <article v-for="candidate in filteredCandidates" :key="candidate.id" class="candidate-card">
          <div class="candidate-card__avatar">{{ candidate.name.slice(0, 1) }}</div>
          <div class="candidate-card__body">
            <div class="candidate-card__top">
              <div>
                <h3>{{ candidate.name }}</h3>
                <p>{{ candidate.role }} - {{ candidate.area }}, {{ candidate.city }}</p>
              </div>
              <span>{{ candidate.match }}% match</span>
            </div>

            <div class="candidate-card__meta">
              <span>{{ candidate.experience }}</span>
              <span>{{ candidate.availability }}</span>
              <span>{{ candidate.rate }}</span>
            </div>

            <div class="candidate-card__skills">
              <span v-for="skill in candidate.skills" :key="skill">{{ skill }}</span>
            </div>
          </div>
          <div class="candidate-actions">
            <button type="button" @click="shortlist(candidate)">Shortlist</button>
            <button type="button" class="candidate-actions__ghost">Interview</button>
          </div>
        </article>

        <div v-if="!filteredCandidates.length" class="candidate-empty">
          <strong>No talent found</strong>
          <p>Try a wider role, availability, or area search.</p>
        </div>
      </div>
    </section>
  </main>
</template>
