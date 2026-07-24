<script setup>
import { computed, reactive, ref, watch } from 'vue'
import WorkerProfileSections from './WorkerProfileSections.vue'

const props = defineProps({
  user: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  saveVersion: { type: Number, default: 0 },
  saveErrors: { type: Array, default: () => [] },
})

const emit = defineEmits(['back', 'save', 'clear-errors', 'upload-resume'])

const editing = ref(false)
const clientErrors = ref([])

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]
const isWorker = computed(() => props.user?.role === 'LookingForWork')

const form = reactive({
  // Account / personal
  name: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  // Location
  addressLine: '',
  cityArea: '',
  state: '',
  pincode: '',
  jobTitle: '',
  professionalSummary: '',
  experienceYears: '',
  education: '',
  skills: '',
  languages: '',
  workPreferences: {
    desiredRoles: [], employmentTypes: [], shifts: [], workModes: [], preferredLocations: [],
    expectedSalaryMin: '', expectedSalaryMax: '', salaryPeriod: '', availability: '',
    noticePeriodDays: '', travelRadiusKm: '', willingToRelocate: false,
    canWorkWeekends: false, ownsVehicle: false, vehicleTypes: [],
  },
  workHistory: [],
  educationHistory: [],
  skillDetails: [],
  languageDetails: [],
  credentials: [],
})

function hydrate() {
  const u = props.user || {}
  form.name = u.name || ''
  form.email = u.email || ''
  form.phone = u.phone || ''
  form.dateOfBirth = u.dateOfBirth || ''
  form.gender = u.gender || ''
  form.addressLine = u.addressLine || ''
  form.cityArea = u.cityArea || ''
  form.state = u.state || ''
  form.pincode = u.pincode || ''
  form.jobTitle = u.jobTitle || ''
  form.professionalSummary = u.professionalSummary || ''
  form.experienceYears = u.experienceYears ?? ''
  form.education = u.education || ''
  form.skills = (u.skills || []).join(', ')
  form.languages = (u.languages || []).join(', ')
  Object.assign(form.workPreferences, {
    desiredRoles: [], employmentTypes: [], shifts: [], workModes: [], preferredLocations: [],
    expectedSalaryMin: '', expectedSalaryMax: '', salaryPeriod: '', availability: '',
    noticePeriodDays: '', travelRadiusKm: '', willingToRelocate: false,
    canWorkWeekends: false, ownsVehicle: false, vehicleTypes: [],
    ...(u.workPreferences || {}),
  })
  const copyEntries = (entries) => entries.map((entry) => ({ ...entry }))
  form.workHistory = copyEntries(u.workHistory || [])
  form.educationHistory = copyEntries(u.educationHistory || [])
  form.skillDetails = copyEntries(u.skillDetails?.length
    ? u.skillDetails
    : (u.skills || []).map((name) => ({ name, proficiency: '', yearsExperience: '' })))
  form.languageDetails = copyEntries(u.languageDetails?.length
    ? u.languageDetails
    : (u.languages || []).map((name) => ({ name, proficiency: '', canSpeak: true, canRead: false, canWrite: false })))
  form.credentials = copyEntries(u.credentials || [])
}

watch(() => props.user, () => {
  if (editing.value) return
  hydrate()
}, { immediate: true })

watch(() => props.saveVersion, () => {
  hydrate()
  editing.value = false
})

const visibleErrors = computed(() => [...clientErrors.value, ...props.saveErrors])

const initials = computed(() => {
  const source = form.name || props.user?.name || 'U'
  return source
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
})

const memberSince = computed(() => {
  const created = props.user?.createdAt
  if (!created) return ''
  const date = new Date(created)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
})

const locationSummary = computed(() => {
  const parts = [form.cityArea, form.state].filter(Boolean)
  const base = parts.join(', ')
  return form.pincode ? [base, form.pincode].filter(Boolean).join(' - ') : base
})

function startEdit() {
  clientErrors.value = []
  emit('clear-errors')
  editing.value = true
}

function cancelEdit() {
  hydrate()
  clientErrors.value = []
  emit('clear-errors')
  editing.value = false
}

function numberOrNull(value) {
  return value === '' || value == null ? null : Number(value)
}

function validate() {
  const errors = []
  const preferences = form.workPreferences
  const salaryMin = numberOrNull(preferences.expectedSalaryMin)
  const salaryMax = numberOrNull(preferences.expectedSalaryMax)
  if (!form.name.trim()) errors.push('Full name is required.')
  if (form.phone && !/^[\d+\-()\s]{6,30}$/.test(form.phone)) errors.push('Enter a valid phone number.')
  if (form.pincode && !/^\d{6}$/.test(form.pincode)) errors.push('Pincode must contain exactly 6 digits.')
  if (form.dateOfBirth && form.dateOfBirth > new Date().toISOString().slice(0, 10)) errors.push('Date of birth cannot be in the future.')
  if (form.experienceYears !== '' && (Number(form.experienceYears) < 0 || Number(form.experienceYears) > 60)) errors.push('Experience must be between 0 and 60 years.')
  if (salaryMin != null && salaryMin < 0 || salaryMax != null && salaryMax < 0) errors.push('Expected salary cannot be negative.')
  if (salaryMin != null && salaryMax != null && salaryMax < salaryMin) errors.push('Maximum expected salary cannot be less than minimum expected salary.')
  if ((salaryMin != null || salaryMax != null) && !preferences.salaryPeriod) errors.push('Select a salary period.')
  if (preferences.travelRadiusKm !== '' && (Number(preferences.travelRadiusKm) < 1 || Number(preferences.travelRadiusKm) > 500)) errors.push('Travel distance must be between 1 and 500 km.')
  if (preferences.noticePeriodDays !== '' && (Number(preferences.noticePeriodDays) < 0 || Number(preferences.noticePeriodDays) > 365)) errors.push('Notice period must be between 0 and 365 days.')
  if (preferences.desiredRoles.length > 10) errors.push('Add at most 10 desired roles.')
  if (preferences.preferredLocations.length > 10) errors.push('Add at most 10 preferred locations.')
  if (form.workHistory.length > 10) errors.push('Add at most 10 work-history entries.')
  if (form.educationHistory.length > 10) errors.push('Add at most 10 education entries.')
  if (form.skillDetails.length > 30) errors.push('Add at most 30 skills.')
  if (form.languageDetails.length > 15) errors.push('Add at most 15 languages.')
  if (form.credentials.length > 15) errors.push('Add at most 15 licences or certificates.')
  form.workHistory.forEach((entry, index) => {
    if (!entry.jobTitle.trim() || !entry.employer.trim()) errors.push(`Work history ${index + 1}: role and employer are required.`)
    if (!entry.isCurrent && entry.startDate && entry.endDate && entry.endDate < entry.startDate) errors.push(`Work history ${index + 1}: end date cannot be before start date.`)
  })
  form.educationHistory.forEach((entry, index) => {
    if (!entry.qualification.trim() || !entry.institution.trim()) errors.push(`Education ${index + 1}: qualification and institute are required.`)
    if (entry.startYear && entry.endYear && Number(entry.endYear) < Number(entry.startYear)) errors.push(`Education ${index + 1}: end year cannot be before start year.`)
    if ([entry.startYear, entry.endYear].some((year) => year && (Number(year) < 1950 || Number(year) > new Date().getFullYear() + 10))) errors.push(`Education ${index + 1}: enter a valid year.`)
  })
  form.skillDetails.forEach((entry, index) => { if (!entry.name.trim()) errors.push(`Skill ${index + 1}: name is required.`) })
  form.languageDetails.forEach((entry, index) => { if (!entry.name.trim()) errors.push(`Language ${index + 1}: name is required.`) })
  form.credentials.forEach((entry, index) => {
    if (!entry.name.trim() || !entry.issuer.trim()) errors.push(`Licence or certificate ${index + 1}: name and issuer are required.`)
    if (entry.issueDate && entry.expiryDate && entry.expiryDate < entry.issueDate) errors.push(`Licence or certificate ${index + 1}: expiry cannot be before issue date.`)
    if (entry.url) {
      try {
        if (!['http:', 'https:'].includes(new URL(entry.url).protocol)) throw new Error()
      } catch { errors.push(`Licence or certificate ${index + 1}: verification link must start with http:// or https://.`) }
    }
  })
  return errors
}

function save() {
  clientErrors.value = validate()
  emit('clear-errors')
  if (clientErrors.value.length) return

  emit('save', {
      name: form.name.trim(),
      phone: form.phone.trim(),
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender,
      addressLine: form.addressLine.trim(),
      cityArea: form.cityArea.trim(),
      state: form.state,
      pincode: form.pincode.trim(),
      jobTitle: form.jobTitle.trim(),
      professionalSummary: form.professionalSummary.trim(),
      experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears),
      education: form.education.trim(),
      skills: form.skillDetails.map(({ name }) => name.trim()).filter(Boolean),
      languages: form.languageDetails.map(({ name }) => name.trim()).filter(Boolean),
      workPreferences: {
        ...form.workPreferences,
        expectedSalaryMin: numberOrNull(form.workPreferences.expectedSalaryMin),
        expectedSalaryMax: numberOrNull(form.workPreferences.expectedSalaryMax),
        noticePeriodDays: numberOrNull(form.workPreferences.noticePeriodDays),
        travelRadiusKm: numberOrNull(form.workPreferences.travelRadiusKm),
      },
      workHistory: form.workHistory.map((entry) => ({ ...entry, endDate: entry.isCurrent ? null : entry.endDate || null, startDate: entry.startDate || null })),
      educationHistory: form.educationHistory.map((entry) => ({ ...entry, startYear: entry.startYear === '' ? null : Number(entry.startYear), endYear: entry.endYear === '' ? null : Number(entry.endYear) })),
      skillDetails: form.skillDetails.map((entry) => ({ ...entry, yearsExperience: entry.yearsExperience === '' ? null : Number(entry.yearsExperience) })),
      languageDetails: form.languageDetails,
      credentials: form.credentials.map((entry) => ({ ...entry, issueDate: entry.issueDate || null, expiryDate: entry.expiryDate || null })),
  })
}

function uploadResume(event) {
  const file = event.target.files?.[0]
  if (file) emit('upload-resume', file)
}

function goBack() {
  emit('back')
}
</script>

<template>
  <form class="dash-main profile-page" :class="{ 'profile-page--worker': isWorker }" @submit.prevent="save">
    <!-- Header / hero card -->
    <section class="profile-hero">
      <div class="profile-hero__avatar" aria-hidden="true">{{ initials }}</div>
      <div class="profile-hero__info">
        <h1 class="dash-welcome__title profile-hero__name">
          <span class="dash-welcome__name">{{ form.name || props.user?.name || 'User' }}</span>
        </h1>
        <p class="profile-hero__headline">{{ isWorker ? 'Finding work locally on LocalHire' : 'Hiring locally on LocalHire' }}</p>
        <div class="profile-hero__tags">
          <span class="profile-badge profile-badge--role">{{ isWorker ? 'Looking for work' : 'Hiring' }}</span>
          <span v-if="isWorker" class="profile-badge profile-badge--score">{{ user?.profileCompletionPercent ?? 0 }}% profile</span>
          <span v-if="locationSummary" class="profile-badge">{{ locationSummary }}</span>
          <span v-if="memberSince" class="profile-badge profile-badge--muted">Member since {{ memberSince }}</span>
        </div>
      </div>
      <div class="profile-hero__actions">
        <template v-if="!editing">
          <button type="button" class="dash-btn dash-btn--primary" @click="startEdit">Edit profile</button>
          <button v-if="!isWorker || user?.isProfileComplete !== false" type="button" class="dash-btn dash-btn--outline" @click="goBack">Back</button>
        </template>
        <template v-else>
          <button type="button" class="dash-btn dash-btn--primary" :disabled="saving" @click="save">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
          <button type="button" class="dash-btn dash-btn--outline" :disabled="saving" @click="cancelEdit">Cancel</button>
        </template>
      </div>
    </section>

    <section v-if="visibleErrors.length" class="profile-errors" role="alert" aria-live="polite">
      <strong>We could not save your profile:</strong>
      <ul><li v-for="message in visibleErrors" :key="message">{{ message }}</li></ul>
      <p>Your changes are still here. Correct the details below and save again.</p>
    </section>

    <section v-if="isWorker && user?.isProfileComplete === false" class="profile-completion" role="status">
      Complete the required contact, professional, and location fields to get full access. A resume is optional.
    </section>

    <!-- Account & personal -->
    <section class="profile-card">
      <div class="profile-card__head">
        <h2 class="dash-section__title">Personal information</h2>
        <p class="profile-card__hint">Your basic account and contact details.</p>
      </div>
      <div class="profile-grid">
        <div class="profile-field">
          <label for="profile-name">Full name</label>
          <input v-if="editing" id="profile-name" v-model="form.name" type="text" maxlength="100" required placeholder="Your full name" />
          <p v-else class="profile-value">{{ form.name || '—' }}</p>
        </div>
        <div class="profile-field">
          <span class="profile-field__label">Email</span>
          <p class="profile-value profile-value--locked">{{ form.email || '—' }}</p>
        </div>
        <div class="profile-field">
          <label for="profile-phone">Phone</label>
          <input v-if="editing" id="profile-phone" v-model="form.phone" type="tel" inputmode="tel" maxlength="30" pattern="[0-9+()\- ]{6,30}" placeholder="+91 98765 43210" />
          <p v-else class="profile-value">{{ form.phone || '—' }}</p>
        </div>
        <div class="profile-field">
          <label for="profile-dob">Date of birth</label>
          <input v-if="editing" id="profile-dob" v-model="form.dateOfBirth" type="date" />
          <p v-else class="profile-value">{{ form.dateOfBirth || '—' }}</p>
        </div>
        <div class="profile-field">
          <label for="profile-gender">Gender</label>
          <select v-if="editing" id="profile-gender" v-model="form.gender">
            <option value="">Select</option>
            <option v-for="option in GENDER_OPTIONS" :key="option" :value="option">{{ option }}</option>
          </select>
          <p v-else class="profile-value">{{ form.gender || '—' }}</p>
        </div>
      </div>
    </section>

    <section v-if="isWorker" class="profile-card">
      <div class="profile-card__head">
        <h2 class="dash-section__title">Professional details</h2>
        <p class="profile-card__hint">Tell nearby employers what work fits you.</p>
      </div>
      <div class="profile-grid">
        <div class="profile-field">
          <label for="profile-job-title">Job title *</label>
          <input v-if="editing" id="profile-job-title" v-model="form.jobTitle" type="text" maxlength="100" placeholder="e.g. Delivery partner" />
          <p v-else class="profile-value">{{ form.jobTitle || '—' }}</p>
        </div>
        <div class="profile-field">
          <label for="profile-experience">Experience in years *</label>
          <input v-if="editing" id="profile-experience" v-model="form.experienceYears" type="number" min="0" max="60" step="1" />
          <p v-else class="profile-value">{{ form.experienceYears === '' ? '—' : `${form.experienceYears} years` }}</p>
        </div>
        <div class="profile-field profile-field--full">
          <label for="profile-summary">Professional summary</label>
          <textarea v-if="editing" id="profile-summary" v-model="form.professionalSummary" maxlength="1000" placeholder="A short summary of your work experience"></textarea>
          <p v-else class="profile-value">{{ form.professionalSummary || '—' }}</p>
        </div>
        <div class="profile-field">
          <label for="profile-education">Highest education *</label>
          <input v-if="editing" id="profile-education" v-model="form.education" type="text" maxlength="200" placeholder="e.g. 12th pass, Diploma" />
          <p v-else class="profile-value">{{ form.education || '—' }}</p>
        </div>
        <div class="profile-field profile-field--full">
          <label for="profile-resume">Resume (optional, PDF/DOC/DOCX, max 5 MB)</label>
          <input id="profile-resume" type="file" accept=".pdf,.doc,.docx" @change="uploadResume" />
          <p v-if="user?.resumeFileName" class="profile-value">Uploaded: {{ user.resumeFileName }}</p>
        </div>
      </div>
    </section>

    <WorkerProfileSections v-if="isWorker" :form="form" :editing="editing" />

    <!-- Location -->
    <section class="profile-card">
      <div class="profile-card__head">
        <h2 class="dash-section__title">Location</h2>
        <p class="profile-card__hint">Helps us match you with nearby talent.</p>
      </div>
      <div class="profile-grid">
        <div class="profile-field profile-field--full">
          <label for="profile-address">Address line</label>
          <input v-if="editing" id="profile-address" v-model="form.addressLine" type="text" maxlength="300" placeholder="House / street / landmark" />
          <p v-else class="profile-value">{{ form.addressLine || '—' }}</p>
        </div>
        <div class="profile-field">
          <label for="profile-city-area">City / Area</label>
          <input v-if="editing" id="profile-city-area" v-model="form.cityArea" type="text" maxlength="200" placeholder="e.g. Indiranagar, Bengaluru" />
          <p v-else class="profile-value">{{ form.cityArea || '—' }}</p>
        </div>
        <div class="profile-field">
          <label for="profile-state">State</label>
          <select v-if="editing" id="profile-state" v-model="form.state">
            <option value="">Select state</option>
            <option v-for="stateName in INDIAN_STATES" :key="stateName" :value="stateName">{{ stateName }}</option>
          </select>
          <p v-else class="profile-value">{{ form.state || '—' }}</p>
        </div>
        <div class="profile-field">
          <label for="profile-pincode">Pincode</label>
          <input v-if="editing" id="profile-pincode" v-model="form.pincode" inputmode="numeric" maxlength="6" pattern="\d{6}" placeholder="560038" />
          <p v-else class="profile-value">{{ form.pincode || '—' }}</p>
        </div>
      </div>
    </section>
  </form>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Hero card */
.profile-hero {
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

.profile-hero__avatar {
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
  background: linear-gradient(135deg, #07559a, #0966ad);
  box-shadow: 0 8px 24px rgba(7, 85, 154, 0.22);
}

.profile-hero__info {
  flex: 1;
  min-width: 220px;
}

.profile-hero__name {
  margin-bottom: 4px;
}

.profile-hero__headline {
  font-size: 15px;
  color: #5d7482;
  margin-bottom: 14px;
}

.profile-hero__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

.profile-page--worker :is(.profile-hero__avatar, .profile-badge--role, .dash-btn--primary) {
  background: linear-gradient(135deg, #188853, #21a947);
  box-shadow: 0 8px 24px rgba(33, 169, 71, 0.2);
}

.profile-page--worker .dash-btn--outline {
  color: #188853;
  border-color: rgba(33, 169, 71, 0.25);
}

.profile-badge--muted {
  color: #5d7482;
  background: rgba(18, 50, 74, 0.04);
}

.profile-badge--score {
  color: #116738;
  background: #e7f7ee;
}

.profile-hero__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* Section cards */
.profile-card {
  padding: 28px 32px;
  background: #ffffff;
  border: 1px solid rgba(18, 50, 74, 0.06);
  border-radius: 16px;
}

.profile-completion {
  padding: 16px 20px;
  color: #6b4600;
  background: #fff7df;
  border: 1px solid #f0d486;
  border-radius: 12px;
}

.profile-errors {
  padding: 16px 20px;
  color: #842029;
  background: #fff2f3;
  border: 1px solid #efb8bd;
  border-radius: 12px;
}

.profile-errors ul { margin: 8px 0; padding-left: 20px; }
.profile-errors p { margin: 0; font-size: 13px; }

.profile-card__head {
  margin-bottom: 22px;
}

.profile-card__hint {
  font-size: 13px;
  color: #5d7482;
  margin-top: 4px;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px 24px;
}

.profile-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.profile-field--full {
  grid-column: 1 / -1;
}

.profile-field label,
.profile-field__label {
  font-size: 13px;
  font-weight: 600;
  color: #12324a;
}

.profile-field input,
.profile-field select,
.profile-field textarea {
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  font-family: inherit;
  color: #12324a;
  background: #ffffff;
  border: 1.5px solid rgba(18, 50, 74, 0.1);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.profile-field input:focus,
.profile-field select:focus,
.profile-field textarea:focus {
  border-color: #07559a;
  box-shadow: 0 0 0 3px rgba(7, 85, 154, 0.08);
}

.profile-value {
  font-size: 15px;
  color: #12324a;
  padding: 4px 0;
  overflow-wrap: break-word;
}

.profile-value--locked {
  color: #5d7482;
}

@media (max-width: 700px) {
  .profile-hero {
    padding: 24px;
  }
  .profile-card {
    padding: 24px 22px;
  }
  .profile-grid {
    grid-template-columns: 1fr;
  }
  .profile-hero__actions {
    width: 100%;
  }
  .profile-hero__actions .dash-btn {
    flex: 1;
  }
}
</style>
