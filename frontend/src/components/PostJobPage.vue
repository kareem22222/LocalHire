<script setup>
import { ref, watch } from 'vue'
import '../hiring-dashboard.css'

const props = defineProps({
  jobForm: { type: Object, required: true },
  jobFormError: { type: String, default: '' },
  fieldErrors: { type: Object, default: () => ({}) },
  creating: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  title: { type: String, default: 'Post a new job' },
  subtitle: { type: String, default: 'Fill in the role details, then publish it to nearby candidates.' },
  submitLabel: { type: String, default: 'Post Job' },
  busyLabel: { type: String, default: 'Posting...' },
  kicker: { type: String, default: 'Hiring desk' },
  canEdit: { type: Boolean, default: false },
  cancelable: { type: Boolean, default: false },
})

const emit = defineEmits(['update:jobForm', 'submit', 'back', 'edit', 'cancel'])

const pincodeStatus = ref('idle')
const pincodeError = ref('')
const areaOptions = ref([])
let pincodeRequestId = 0

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
  <main class="post-job-page">
    <div class="post-job-page__head">
      <div class="post-job-page__title">
        <span v-if="kicker" class="hiring-kicker">{{ kicker }}</span>
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="post-job-page__actions">
        <button v-if="canEdit" type="button" class="dash-btn dash-btn--primary post-job-page__edit" @click="emit('edit')">
          Edit
        </button>
        <button v-else-if="cancelable" type="button" class="dash-btn dash-btn--outline post-job-page__edit" @click="emit('cancel')">
          Cancel
        </button>
        <button type="button" class="dash-btn dash-btn--outline post-job-page__back" @click="emit('back')">Back</button>
      </div>
    </div>

    <div class="job-form">
      <fieldset class="job-form__fields" :disabled="readonly">
      <div class="job-form__field">
        <label for="job-title">Title</label>
        <input id="job-title" :value="props.jobForm.title" placeholder="e.g. Store Associate" :aria-invalid="!!props.fieldErrors.title" @input="updateJobFormField('title', $event)" />
        <span v-if="props.fieldErrors.title" class="job-form__error-text">{{ props.fieldErrors.title }}</span>
      </div>
      <div class="job-form__field">
        <label for="job-description">Description</label>
        <textarea id="job-description" :value="props.jobForm.description" placeholder="Describe the role, hours, pay..." rows="3" :aria-invalid="!!props.fieldErrors.description" @input="updateJobFormField('description', $event)"></textarea>
        <span v-if="props.fieldErrors.description" class="job-form__error-text">{{ props.fieldErrors.description }}</span>
      </div>
      <div class="job-form__field">
        <label for="job-workplace">Workplace name</label>
        <input id="job-workplace" :value="props.jobForm.workplaceName" placeholder="e.g. FreshMart Store" :aria-invalid="!!props.fieldErrors.workplaceName" @input="updateJobFormField('workplaceName', $event)" />
        <span v-if="props.fieldErrors.workplaceName" class="job-form__error-text">{{ props.fieldErrors.workplaceName }}</span>
      </div>
      <div class="job-form__row">
        <div class="job-form__field">
          <label for="job-pincode">Pincode</label>
          <input id="job-pincode" :value="props.jobForm.pincode" inputmode="numeric" maxlength="6" placeholder="" :aria-invalid="!!props.fieldErrors.pincode" @input="updateJobFormField('pincode', $event)" />
          <span v-if="pincodeStatus === 'loading'" class="job-form__hint">Fetching area and state...</span>
          <span v-else-if="props.fieldErrors.pincode" class="job-form__error-text">{{ props.fieldErrors.pincode }}</span>
          <span v-else-if="pincodeError" class="job-form__error-text">{{ pincodeError }}</span>
        </div>
        <div class="job-form__field">
          <label for="job-state">State</label>
          <select id="job-state" :value="props.jobForm.state" :aria-invalid="!!props.fieldErrors.state" @change="updateJobFormField('state', $event)">
            <option value="">Select state</option>
            <option v-for="state in indianStates" :key="state" :value="state">{{ state }}</option>
          </select>
          <span v-if="props.fieldErrors.state" class="job-form__error-text">{{ props.fieldErrors.state }}</span>
        </div>
      </div>
      <div class="job-form__field">
        <label for="job-city-area">City / Village / Area</label>
        <select v-if="areaOptions.length" id="job-city-area" :value="props.jobForm.cityArea" :aria-invalid="!!props.fieldErrors.cityArea" @change="updateJobFormField('cityArea', $event)">
          <option v-for="area in areaOptions" :key="area.value" :value="area.value">{{ area.label }}</option>
        </select>
        <input v-else id="job-city-area" :value="props.jobForm.cityArea" placeholder="" :aria-invalid="!!props.fieldErrors.cityArea" @input="updateJobFormField('cityArea', $event)" />
        <span v-if="props.fieldErrors.cityArea" class="job-form__error-text">{{ props.fieldErrors.cityArea }}</span>
        <span v-if="areaOptions.length > 1" class="job-form__hint">Choose the nearest area for this role.</span>
      </div>

      <div class="job-form__row">
        <div class="job-form__field">
          <label for="job-employment-type">Employment type</label>
          <select id="job-employment-type" :value="props.jobForm.employmentType" :aria-invalid="!!props.fieldErrors.employmentType" @change="updateJobFormField('employmentType', $event)">
            <option value="">Select type</option>
            <option v-for="opt in employmentTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <span v-if="props.fieldErrors.employmentType" class="job-form__error-text">{{ props.fieldErrors.employmentType }}</span>
        </div>
        <div class="job-form__field">
          <label for="job-openings">Number of openings</label>
          <input id="job-openings" :value="props.jobForm.openings" type="number" min="1" inputmode="numeric" placeholder="e.g. 3" :aria-invalid="!!props.fieldErrors.openings" @input="updateJobFormField('openings', $event)" />
          <span v-if="props.fieldErrors.openings" class="job-form__error-text">{{ props.fieldErrors.openings }}</span>
        </div>
      </div>

      <div class="job-form__row">
        <div class="job-form__field">
          <label for="job-salary-min">Salary (min)</label>
          <input id="job-salary-min" :value="props.jobForm.salaryMin" type="number" min="0" inputmode="numeric" placeholder="e.g. 15000" :aria-invalid="!!props.fieldErrors.salaryMin" @input="updateJobFormField('salaryMin', $event)" />
          <span v-if="props.fieldErrors.salaryMin" class="job-form__error-text">{{ props.fieldErrors.salaryMin }}</span>
        </div>
        <div class="job-form__field">
          <label for="job-salary-max">Salary (max)</label>
          <input id="job-salary-max" :value="props.jobForm.salaryMax" type="number" min="0" inputmode="numeric" placeholder="e.g. 25000" :aria-invalid="!!props.fieldErrors.salaryMax" @input="updateJobFormField('salaryMax', $event)" />
          <span v-if="props.fieldErrors.salaryMax" class="job-form__error-text">{{ props.fieldErrors.salaryMax }}</span>
        </div>
        <div class="job-form__field">
          <label for="job-salary-period">Pay period</label>
          <select id="job-salary-period" :value="props.jobForm.salaryPeriod" :aria-invalid="!!props.fieldErrors.salaryPeriod" @change="updateJobFormField('salaryPeriod', $event)">
            <option value="">Select period</option>
            <option v-for="period in salaryPeriodOptions" :key="period" :value="period">{{ period }}</option>
          </select>
          <span v-if="props.fieldErrors.salaryPeriod" class="job-form__error-text">{{ props.fieldErrors.salaryPeriod }}</span>
        </div>
      </div>

      <div class="job-form__row">
        <div class="job-form__field">
          <label for="job-education">Minimum education</label>
          <input id="job-education" :value="props.jobForm.minEducation" list="job-education-options" placeholder="e.g. 10th pass" :aria-invalid="!!props.fieldErrors.minEducation" @input="updateJobFormField('minEducation', $event)" />
          <datalist id="job-education-options">
            <option v-for="edu in educationOptions" :key="edu" :value="edu"></option>
          </datalist>
          <span v-if="props.fieldErrors.minEducation" class="job-form__error-text">{{ props.fieldErrors.minEducation }}</span>
        </div>
        <div class="job-form__field">
          <label for="job-exp-min">Experience (min yrs)</label>
          <input id="job-exp-min" :value="props.jobForm.experienceMinYears" type="number" min="0" max="60" inputmode="numeric" placeholder="e.g. 0" :aria-invalid="!!props.fieldErrors.experienceMinYears" @input="updateJobFormField('experienceMinYears', $event)" />
          <span v-if="props.fieldErrors.experienceMinYears" class="job-form__error-text">{{ props.fieldErrors.experienceMinYears }}</span>
        </div>
        <div class="job-form__field">
          <label for="job-exp-max">Experience (max yrs)</label>
          <input id="job-exp-max" :value="props.jobForm.experienceMaxYears" type="number" min="0" max="60" inputmode="numeric" placeholder="e.g. 3" :aria-invalid="!!props.fieldErrors.experienceMaxYears" @input="updateJobFormField('experienceMaxYears', $event)" />
          <span v-if="props.fieldErrors.experienceMaxYears" class="job-form__error-text">{{ props.fieldErrors.experienceMaxYears }}</span>
        </div>
      </div>

      <div class="job-form__row">
        <div class="job-form__field">
          <label for="job-working-days">Working days</label>
          <input id="job-working-days" :value="props.jobForm.workingDays" placeholder="e.g. Mon–Sat" :aria-invalid="!!props.fieldErrors.workingDays" @input="updateJobFormField('workingDays', $event)" />
          <span v-if="props.fieldErrors.workingDays" class="job-form__error-text">{{ props.fieldErrors.workingDays }}</span>
        </div>
        <div class="job-form__field">
          <label for="job-shift-start">Shift start</label>
          <input id="job-shift-start" :value="props.jobForm.shiftStartTime" type="time" :aria-invalid="!!props.fieldErrors.shiftStartTime" @input="updateJobFormField('shiftStartTime', $event)" />
          <span v-if="props.fieldErrors.shiftStartTime" class="job-form__error-text">{{ props.fieldErrors.shiftStartTime }}</span>
        </div>
        <div class="job-form__field">
          <label for="job-shift-end">Shift end</label>
          <input id="job-shift-end" :value="props.jobForm.shiftEndTime" type="time" :aria-invalid="!!props.fieldErrors.shiftEndTime" @input="updateJobFormField('shiftEndTime', $event)" />
          <span v-if="props.fieldErrors.shiftEndTime" class="job-form__error-text">{{ props.fieldErrors.shiftEndTime }}</span>
        </div>
      </div>

      <div class="job-form__field">
        <label for="job-skills">Required skills</label>
        <input id="job-skills" :value="props.jobForm.requiredSkills" placeholder="Comma separated, e.g. Billing, Customer service" :aria-invalid="!!props.fieldErrors.requiredSkills" @input="updateJobFormField('requiredSkills', $event)" />
        <span v-if="props.fieldErrors.requiredSkills" class="job-form__error-text">{{ props.fieldErrors.requiredSkills }}</span>
        <span class="job-form__hint">Separate each skill with a comma.</span>
      </div>
      <div class="job-form__field">
        <label for="job-languages">Languages needed</label>
        <input id="job-languages" :value="props.jobForm.languages" placeholder="Comma separated, e.g. Hindi, English" :aria-invalid="!!props.fieldErrors.languages" @input="updateJobFormField('languages', $event)" />
        <span v-if="props.fieldErrors.languages" class="job-form__error-text">{{ props.fieldErrors.languages }}</span>
      </div>
      <div class="job-form__field">
        <label for="job-benefits">Extra benefits</label>
        <input id="job-benefits" :value="props.jobForm.benefits" placeholder="Comma separated, e.g. Provident Fund, Meals" :aria-invalid="!!props.fieldErrors.benefits" @input="updateJobFormField('benefits', $event)" />
        <span v-if="props.fieldErrors.benefits" class="job-form__error-text">{{ props.fieldErrors.benefits }}</span>
      </div>
      </fieldset>

      <p v-if="jobFormError" class="job-form__error">{{ jobFormError }}</p>
      <button v-if="!readonly" class="dash-btn dash-btn--primary" :disabled="creating" @click="emit('submit')">
        {{ creating ? busyLabel : submitLabel }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.post-job-page {
  width: min(920px, 100%);
  margin: 0 auto;
  padding: 24px 20px 56px;
}

.post-job-page__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.post-job-page__head h1 {
  margin: 6px 0 4px;
  font-size: 26px;
  color: #0e2638;
}

.post-job-page__head p {
  margin: 0;
  color: #40545f;
  font-size: 14px;
}

.post-job-page__title {
  flex: 1 1 auto;
  min-width: 0;
}

.post-job-page__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
  margin-left: auto;
}

/* The fieldset only exists to disable every control at once in read-only mode.
   display: contents keeps the existing form layout unchanged. */
.job-form__fields {
  display: contents;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

/* Highlight controls the user needs to fix. Pairs with the per-field
   .job-form__error-text messages rendered beneath each input. */
.job-form__field :is(input, textarea, select)[aria-invalid="true"] {
  border-color: #dc2626;
  outline-color: #dc2626;
}
</style>
