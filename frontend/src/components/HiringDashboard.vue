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

const emit = defineEmits(['update:showCreateForm', 'update:jobForm', 'create-job', 'view-applications', 'shortlist'])

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
const employmentTypeOptions = [
  { value: 'FullTime', label: 'Full-time' },
  { value: 'PartTime', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Temporary', label: 'Temporary' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Daily', label: 'Daily wage' },
]
const salaryPeriodOptions = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Yearly']
const educationOptions = [
  'No formal education',
  'Below 10th',
  '10th pass',
  '12th pass',
  'Diploma',
  'Graduate',
  'Post Graduate',
]
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
      area: [job.cityArea, job.state].filter(Boolean).join(', '),
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

function updateJobForm(patch) {
  emit('update:jobForm', { ...props.jobForm, ...patch })
}

function updateJobFormField(field, event) {
  updateJobForm({ [field]: event.target.value })
}

watch(
  () => props.jobForm.pincode,
  async (value) => {
    const requestId = ++pincodeRequestId
    const pincode = String(value || '').replace(/\D/g, '').slice(0, 6)
    if (pincode !== value) {
      updateJobForm({ pincode })
      return
    }

    updateJobForm({ state: '', cityArea: '', latitude: null, longitude: null })
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
      updateJobForm({ state: postOffice.State, cityArea: areaOptions.value[0]?.value || '' })
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

      <div class="hiring-side-stack">
        <aside class="hiring-sidebar">
          <h2>Hiring pipeline</h2>
          <p>Move fast: shortlist high-match candidates, schedule interviews, and keep the role status current.</p>
          <div class="hiring-progress">
            <span>Pipeline health</span>
            <strong>88%</strong>
            <i><b></b></i>
          </div>
        </aside>

        <aside class="hiring-sidebar hiring-quick">
          <h2>Quick actions</h2>
          <p>Jump straight into the work that keeps candidates moving.</p>
          <div class="hiring-quick__actions">
            <button type="button" class="dash-btn dash-btn--primary" @click="emit('update:showCreateForm', !showCreateForm)">{{ showCreateForm ? 'Cancel' : 'Post new role' }}</button>
            <button type="button" class="hiring-quick__link">Review shortlists</button>
            <button type="button" class="hiring-quick__link">Schedule interviews</button>
          </div>
        </aside>
      </div>

    <section class="hiring-roles">
      <div class="hiring-roles__head">
        <div>
          <span class="hiring-kicker">Hiring desk</span>
          <h2>Open roles you are hiring for</h2>
        </div>
      </div>

      <div v-if="showCreateForm" class="job-form">
        <div class="job-form__field">
          <label for="job-title">Title</label>
          <input id="job-title" :value="props.jobForm.title" placeholder="e.g. Store Associate" @input="updateJobFormField('title', $event)" />
        </div>
        <div class="job-form__field">
          <label for="job-description">Description</label>
          <textarea id="job-description" :value="props.jobForm.description" placeholder="Describe the role, hours, pay..." rows="3" @input="updateJobFormField('description', $event)"></textarea>
        </div>
        <div class="job-form__field">
          <label for="job-workplace">Workplace name</label>
          <input id="job-workplace" :value="props.jobForm.workplaceName" placeholder="e.g. FreshMart Store" @input="updateJobFormField('workplaceName', $event)" />
        </div>
        <div class="job-form__row">
          <div class="job-form__field">
            <label for="job-pincode">Pincode</label>
            <input id="job-pincode" :value="props.jobForm.pincode" inputmode="numeric" maxlength="6" placeholder="" @input="updateJobFormField('pincode', $event)" />
            <span v-if="pincodeStatus === 'loading'" class="job-form__hint">Fetching area and state...</span>
            <span v-else-if="pincodeError" class="job-form__error-text">{{ pincodeError }}</span>
          </div>
          <div class="job-form__field">
            <label for="job-state">State</label>
            <select id="job-state" :value="props.jobForm.state" @change="updateJobFormField('state', $event)">
              <option value="">Select state</option>
              <option v-for="state in indianStates" :key="state" :value="state">{{ state }}</option>
            </select>
          </div>
        </div>
        <div class="job-form__field">
          <label for="job-city-area">City / Village / Area</label>
          <select v-if="areaOptions.length" id="job-city-area" :value="props.jobForm.cityArea" @change="updateJobFormField('cityArea', $event)">
            <option v-for="area in areaOptions" :key="area.value" :value="area.value">{{ area.label }}</option>
          </select>
          <input v-else id="job-city-area" :value="props.jobForm.cityArea" placeholder="" @input="updateJobFormField('cityArea', $event)" />
          <span v-if="areaOptions.length > 1" class="job-form__hint">Choose the nearest area for this role.</span>
        </div>

        <div class="job-form__row">
          <div class="job-form__field">
            <label for="job-employment-type">Employment type</label>
            <select id="job-employment-type" :value="props.jobForm.employmentType" @change="updateJobFormField('employmentType', $event)">
              <option value="">Select type</option>
              <option v-for="opt in employmentTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="job-form__field">
            <label for="job-openings">Number of openings</label>
            <input id="job-openings" :value="props.jobForm.openings" type="number" min="1" inputmode="numeric" placeholder="e.g. 3" @input="updateJobFormField('openings', $event)" />
          </div>
        </div>

        <div class="job-form__row">
          <div class="job-form__field">
            <label for="job-salary-min">Salary (min)</label>
            <input id="job-salary-min" :value="props.jobForm.salaryMin" type="number" min="0" inputmode="numeric" placeholder="e.g. 15000" @input="updateJobFormField('salaryMin', $event)" />
          </div>
          <div class="job-form__field">
            <label for="job-salary-max">Salary (max)</label>
            <input id="job-salary-max" :value="props.jobForm.salaryMax" type="number" min="0" inputmode="numeric" placeholder="e.g. 25000" @input="updateJobFormField('salaryMax', $event)" />
          </div>
          <div class="job-form__field">
            <label for="job-salary-period">Pay period</label>
            <select id="job-salary-period" :value="props.jobForm.salaryPeriod" @change="updateJobFormField('salaryPeriod', $event)">
              <option value="">Select period</option>
              <option v-for="period in salaryPeriodOptions" :key="period" :value="period">{{ period }}</option>
            </select>
          </div>
        </div>

        <div class="job-form__row">
          <div class="job-form__field">
            <label for="job-education">Minimum education</label>
            <input id="job-education" :value="props.jobForm.minEducation" list="job-education-options" placeholder="e.g. 10th pass" @input="updateJobFormField('minEducation', $event)" />
            <datalist id="job-education-options">
              <option v-for="edu in educationOptions" :key="edu" :value="edu"></option>
            </datalist>
          </div>
          <div class="job-form__field">
            <label for="job-exp-min">Experience (min yrs)</label>
            <input id="job-exp-min" :value="props.jobForm.experienceMinYears" type="number" min="0" max="60" inputmode="numeric" placeholder="e.g. 0" @input="updateJobFormField('experienceMinYears', $event)" />
          </div>
          <div class="job-form__field">
            <label for="job-exp-max">Experience (max yrs)</label>
            <input id="job-exp-max" :value="props.jobForm.experienceMaxYears" type="number" min="0" max="60" inputmode="numeric" placeholder="e.g. 3" @input="updateJobFormField('experienceMaxYears', $event)" />
          </div>
        </div>

        <div class="job-form__row">
          <div class="job-form__field">
            <label for="job-working-days">Working days</label>
            <input id="job-working-days" :value="props.jobForm.workingDays" placeholder="e.g. Mon–Sat" @input="updateJobFormField('workingDays', $event)" />
          </div>
          <div class="job-form__field">
            <label for="job-shift-start">Shift start</label>
            <input id="job-shift-start" :value="props.jobForm.shiftStartTime" type="time" @input="updateJobFormField('shiftStartTime', $event)" />
          </div>
          <div class="job-form__field">
            <label for="job-shift-end">Shift end</label>
            <input id="job-shift-end" :value="props.jobForm.shiftEndTime" type="time" @input="updateJobFormField('shiftEndTime', $event)" />
          </div>
        </div>

        <div class="job-form__field">
          <label for="job-skills">Required skills</label>
          <input id="job-skills" :value="props.jobForm.requiredSkills" placeholder="Comma separated, e.g. Billing, Customer service" @input="updateJobFormField('requiredSkills', $event)" />
          <span class="job-form__hint">Separate each skill with a comma.</span>
        </div>
        <div class="job-form__field">
          <label for="job-languages">Languages needed</label>
          <input id="job-languages" :value="props.jobForm.languages" placeholder="Comma separated, e.g. Hindi, English" @input="updateJobFormField('languages', $event)" />
        </div>
        <div class="job-form__field">
          <label for="job-benefits">Extra benefits</label>
          <input id="job-benefits" :value="props.jobForm.benefits" placeholder="Comma separated, e.g. Provident Fund, Meals" @input="updateJobFormField('benefits', $event)" />
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

    <section class="candidate-list">
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
    </section>
  </main>
</template>
