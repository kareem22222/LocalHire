<script setup>
import { computed } from 'vue'

const form = defineModel('form', { type: Object, required: true })
const props = defineProps({
  editing: { type: Boolean, default: false },
})

const EMPLOYMENT_TYPES = [['FullTime', 'Full time'], ['PartTime', 'Part time'], ['Contract', 'Contract'], ['Temporary', 'Temporary'], ['Internship', 'Apprenticeship / internship'], ['Daily', 'Daily wage']]
const SHIFTS = [['Day', 'Day'], ['Evening', 'Evening'], ['Night', 'Night'], ['Rotational', 'Rotational'], ['Flexible', 'Flexible']]
const WORK_MODES = [['OnSite', 'At workplace'], ['Hybrid', 'Hybrid'], ['Remote', 'Work from home']]
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
const LANGUAGE_LEVELS = ['Basic', 'Conversational', 'Fluent', 'Native']

const preferences = computed(() => form.value.workPreferences)

function commaValue(values) {
  return (values || []).join(', ')
}

function setComma(field, event) {
  preferences.value[field] = event.target.value.split(',').map((value) => value.trim()).filter(Boolean)
}

function toggleList(list, value, checked) {
  const index = list.indexOf(value)
  if (checked && index < 0) list.push(value)
  if (!checked && index >= 0) list.splice(index, 1)
}

function addExperience() {
  form.value.workHistory.push({ jobTitle: '', employer: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' })
}

function addEducation() {
  form.value.educationHistory.push({ qualification: '', institution: '', fieldOfStudy: '', startYear: '', endYear: '' })
}

function addSkill() {
  form.value.skillDetails.push({ name: '', proficiency: '', yearsExperience: '' })
}

function addLanguage() {
  form.value.languageDetails.push({ name: '', proficiency: '', canSpeak: true, canRead: false, canWrite: false })
}

function addCredential() {
  form.value.credentials.push({ name: '', issuer: '', issueDate: '', expiryDate: '', credentialId: '', url: '' })
}
</script>

<template>
  <section class="worker-card">
    <header>
      <h2>Work preferences</h2>
      <p>Helps us show work that fits your needs, distance, and schedule.</p>
    </header>

    <div v-if="editing" class="worker-grid">
      <label class="full">Desired job roles
        <input :value="commaValue(preferences.desiredRoles)" maxlength="1000" placeholder="Delivery rider, Store assistant" @input="setComma('desiredRoles', $event)" />
        <small>Separate multiple roles with commas.</small>
      </label>
      <label class="full">Preferred areas or cities
        <input :value="commaValue(preferences.preferredLocations)" maxlength="1500" placeholder="Mysuru, Mandya" @input="setComma('preferredLocations', $event)" />
      </label>

      <fieldset class="full">
        <legend>Employment type</legend>
        <label v-for="[value, label] in EMPLOYMENT_TYPES" :key="value" class="check">
          <input type="checkbox" :checked="preferences.employmentTypes.includes(value)" @change="toggleList(preferences.employmentTypes, value, $event.target.checked)" /> {{ label }}
        </label>
      </fieldset>
      <fieldset class="full">
        <legend>Shifts</legend>
        <label v-for="[value, label] in SHIFTS" :key="value" class="check">
          <input type="checkbox" :checked="preferences.shifts.includes(value)" @change="toggleList(preferences.shifts, value, $event.target.checked)" /> {{ label }}
        </label>
      </fieldset>
      <fieldset class="full">
        <legend>Workplace</legend>
        <label v-for="[value, label] in WORK_MODES" :key="value" class="check">
          <input type="checkbox" :checked="preferences.workModes.includes(value)" @change="toggleList(preferences.workModes, value, $event.target.checked)" /> {{ label }}
        </label>
      </fieldset>

      <label>Expected salary from
        <input v-model="preferences.expectedSalaryMin" type="number" min="0" step="500" placeholder="15000" />
      </label>
      <label>Expected salary up to
        <input v-model="preferences.expectedSalaryMax" type="number" min="0" step="500" placeholder="22000" />
      </label>
      <label>Salary period
        <select v-model="preferences.salaryPeriod">
          <option value="">Select</option><option value="Monthly">Monthly</option><option value="Daily">Daily</option><option value="Hourly">Hourly</option>
        </select>
      </label>
      <label>Availability
        <select v-model="preferences.availability">
          <option value="">Select</option><option value="Immediately">Can join immediately</option><option value="Within15Days">Within 15 days</option><option value="Within30Days">Within 30 days</option><option value="ServingNotice">Serving notice period</option><option value="Flexible">Flexible</option>
        </select>
      </label>
      <label v-if="preferences.availability === 'ServingNotice'">Notice period (days)
        <input v-model="preferences.noticePeriodDays" type="number" min="0" max="365" />
      </label>
      <label>Maximum travel distance (km)
        <input v-model="preferences.travelRadiusKm" type="number" min="1" max="500" placeholder="10" />
      </label>
      <fieldset class="full">
        <legend>Work readiness</legend>
        <label class="check"><input v-model="preferences.willingToRelocate" type="checkbox" /> Willing to relocate</label>
        <label class="check"><input v-model="preferences.canWorkWeekends" type="checkbox" /> Available on weekends</label>
        <label class="check"><input v-model="preferences.ownsVehicle" type="checkbox" /> Has access to a vehicle</label>
      </fieldset>
      <label v-if="preferences.ownsVehicle" class="full">Vehicle type
        <input :value="commaValue(preferences.vehicleTypes)" placeholder="Two-wheeler, Bicycle" @input="setComma('vehicleTypes', $event)" />
      </label>
    </div>

    <div v-else class="read-grid">
      <div><span>Desired roles</span><strong>{{ commaValue(preferences.desiredRoles) || 'Not added' }}</strong></div>
      <div><span>Employment</span><strong>{{ commaValue(preferences.employmentTypes) || 'Not added' }}</strong></div>
      <div><span>Shifts</span><strong>{{ commaValue(preferences.shifts) || 'Not added' }}</strong></div>
      <div><span>Workplace</span><strong>{{ commaValue(preferences.workModes) || 'Not added' }}</strong></div>
      <div><span>Expected salary</span><strong>{{ preferences.expectedSalaryMin || preferences.expectedSalaryMax ? `₹${preferences.expectedSalaryMin || '0'} – ₹${preferences.expectedSalaryMax || 'open'} ${preferences.salaryPeriod || ''}` : 'Not added' }}</strong></div>
      <div><span>Availability</span><strong>{{ preferences.availability || 'Not added' }}</strong></div>
      <div><span>Travel</span><strong>{{ preferences.travelRadiusKm !== '' && preferences.travelRadiusKm != null ? `Up to ${preferences.travelRadiusKm} km` : 'Not added' }}</strong></div>
      <div><span>Other</span><strong>{{ [preferences.willingToRelocate && 'Can relocate', preferences.canWorkWeekends && 'Weekends', preferences.ownsVehicle && 'Own vehicle'].filter(Boolean).join(', ') || 'Not added' }}</strong></div>
    </div>
  </section>

  <section class="worker-card">
    <header><h2>Work history</h2><p>Include regular jobs, daily-wage work, family business, gig work, or self-employment.</p></header>
    <div v-for="(entry, index) in form.workHistory" :key="index" class="entry">
      <div v-if="editing" class="worker-grid">
        <label>Work or role<input v-model="entry.jobTitle" required maxlength="100" placeholder="Electrician helper" /></label>
        <label>Employer, shop, client, or self-employed<input v-model="entry.employer" required maxlength="200" placeholder="Self-employed" /></label>
        <label>Location<input v-model="entry.location" maxlength="150" /></label>
        <label>Start date<input v-model="entry.startDate" type="date" /></label>
        <label v-if="!entry.isCurrent">End date<input v-model="entry.endDate" type="date" /></label>
        <label class="check align-end"><input v-model="entry.isCurrent" type="checkbox" /> I currently do this work</label>
        <label class="full">What did you do?<textarea v-model="entry.description" maxlength="1000" placeholder="Main duties, tools used, or achievements"></textarea></label>
        <button type="button" class="remove" :aria-label="`Remove work history ${index + 1}`" @click="form.workHistory.splice(index, 1)">Remove</button>
      </div>
      <div v-else>
        <h3>{{ entry.jobTitle }} · {{ entry.employer }}</h3>
        <p>{{ [entry.location, entry.startDate, entry.isCurrent ? 'Present' : entry.endDate].filter(Boolean).join(' · ') }}</p>
        <p v-if="entry.description">{{ entry.description }}</p>
      </div>
    </div>
    <p v-if="!editing && !form.workHistory.length" class="empty">No work history added yet.</p>
    <button v-if="editing" type="button" class="add" @click="addExperience">+ Add work experience</button>
  </section>

  <section class="worker-card">
    <header><h2>Education and training</h2><p>Add school, college, ITI, apprenticeships, and vocational training.</p></header>
    <div v-for="(entry, index) in form.educationHistory" :key="index" class="entry">
      <div v-if="editing" class="worker-grid">
        <label>Qualification or training<input v-model="entry.qualification" required maxlength="200" placeholder="ITI Electrician" /></label>
        <label>School or institute<input v-model="entry.institution" required maxlength="200" /></label>
        <label>Trade or subject<input v-model="entry.fieldOfStudy" maxlength="150" /></label>
        <label>Start year<input v-model="entry.startYear" type="number" min="1950" max="2100" /></label>
        <label>End year<input v-model="entry.endYear" type="number" min="1950" max="2100" /></label>
        <button type="button" class="remove" :aria-label="`Remove education ${index + 1}`" @click="form.educationHistory.splice(index, 1)">Remove</button>
      </div>
      <div v-else><h3>{{ entry.qualification }} · {{ entry.institution }}</h3><p>{{ [entry.fieldOfStudy, entry.startYear, entry.endYear].filter(Boolean).join(' · ') }}</p></div>
    </div>
    <p v-if="!editing && !form.educationHistory.length" class="empty">No education or training added yet.</p>
    <button v-if="editing" type="button" class="add" @click="addEducation">+ Add education or training</button>
  </section>

  <section class="worker-card">
    <header><h2>Skills and languages</h2><p>Show what you can do and how confidently you can do it.</p></header>
    <div class="split">
      <div>
        <h3>Skills</h3>
        <div v-for="(entry, index) in form.skillDetails" :key="index" class="entry compact">
          <template v-if="editing">
            <input v-model="entry.name" aria-label="Skill" required maxlength="50" placeholder="Billing, welding, driving" />
            <select v-model="entry.proficiency" aria-label="Skill level"><option value="">Level</option><option v-for="level in SKILL_LEVELS" :key="level">{{ level }}</option></select>
            <input v-model="entry.yearsExperience" aria-label="Years using skill" type="number" min="0" max="60" placeholder="Years" />
            <button type="button" class="remove" :aria-label="`Remove skill ${index + 1}`" @click="form.skillDetails.splice(index, 1)">Remove</button>
          </template>
          <p v-else><strong>{{ entry.name }}</strong> · {{ entry.proficiency || 'Level not added' }}<span v-if="entry.yearsExperience != null && entry.yearsExperience !== ''"> · {{ entry.yearsExperience }} years</span></p>
        </div>
        <p v-if="!editing && !form.skillDetails.length" class="empty">No skills added yet.</p>
        <button v-if="editing" type="button" class="add" @click="addSkill">+ Add skill</button>
      </div>
      <div>
        <h3>Languages</h3>
        <div v-for="(entry, index) in form.languageDetails" :key="index" class="entry compact language-row">
          <template v-if="editing">
            <input v-model="entry.name" aria-label="Language" required maxlength="50" placeholder="Hindi" />
            <select v-model="entry.proficiency" aria-label="Language level"><option value="">Level</option><option v-for="level in LANGUAGE_LEVELS" :key="level">{{ level }}</option></select>
            <label class="check"><input v-model="entry.canSpeak" type="checkbox" /> Speak</label>
            <label class="check"><input v-model="entry.canRead" type="checkbox" /> Read</label>
            <label class="check"><input v-model="entry.canWrite" type="checkbox" /> Write</label>
            <button type="button" class="remove" :aria-label="`Remove language ${index + 1}`" @click="form.languageDetails.splice(index, 1)">Remove</button>
          </template>
          <p v-else><strong>{{ entry.name }}</strong> · {{ entry.proficiency || 'Level not added' }} · {{ [entry.canSpeak && 'Speak', entry.canRead && 'Read', entry.canWrite && 'Write'].filter(Boolean).join(', ') }}</p>
        </div>
        <p v-if="!editing && !form.languageDetails.length" class="empty">No languages added yet.</p>
        <button v-if="editing" type="button" class="add" @click="addLanguage">+ Add language</button>
      </div>
    </div>
  </section>

  <section class="worker-card">
    <header><h2>Licences and certificates</h2><p>Add only work-related items, such as a driving licence, trade certificate, or safety training.</p></header>
    <div v-for="(entry, index) in form.credentials" :key="index" class="entry">
      <div v-if="editing" class="worker-grid">
        <label>Licence or certificate<input v-model="entry.name" required maxlength="200" placeholder="LMV driving licence" /></label>
        <label>Issued by<input v-model="entry.issuer" required maxlength="200" placeholder="RTO / training institute" /></label>
        <label>Issue date<input v-model="entry.issueDate" type="date" /></label>
        <label>Expiry date<input v-model="entry.expiryDate" type="date" /></label>
        <label>Licence / certificate number<input v-model="entry.credentialId" maxlength="100" /></label>
        <label>Verification link (optional)<input v-model="entry.url" type="url" maxlength="500" placeholder="https://" /></label>
        <button type="button" class="remove" :aria-label="`Remove licence or certificate ${index + 1}`" @click="form.credentials.splice(index, 1)">Remove</button>
      </div>
      <div v-else><h3>{{ entry.name }} · {{ entry.issuer }}</h3><p>{{ [entry.credentialId, entry.issueDate, entry.expiryDate && `Expires ${entry.expiryDate}`].filter(Boolean).join(' · ') }}</p></div>
    </div>
    <p v-if="!editing && !form.credentials.length" class="empty">No licences or certificates added yet.</p>
    <button v-if="editing" type="button" class="add" @click="addCredential">+ Add licence or certificate</button>
  </section>
</template>

<style scoped>
.worker-card { padding: 28px 32px; background: #fff; border: 1px solid rgba(18,50,74,.06); border-radius: 16px; }
header { margin-bottom: 20px; }
h2 { margin: 0; color: #12324a; font: 700 20px Manrope, sans-serif; }
h3 { margin: 0 0 6px; color: #12324a; font-size: 15px; }
header p, .entry p, .empty, small { margin: 4px 0 0; color: #526977; font-size: 13px; }
.worker-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 18px 22px; }
.worker-grid label:not(.check) { display: flex; flex-direction: column; gap: 6px; color: #12324a; font-size: 13px; font-weight: 600; }
.full { grid-column: 1 / -1; }
input:not([type=checkbox]), select, textarea { width: 100%; padding: 11px 13px; color: #12324a; font: inherit; border: 1.5px solid rgba(18,50,74,.12); border-radius: 9px; background: #fff; }
textarea { min-height: 90px; resize: vertical; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--worker-role-green-end); box-shadow: 0 0 0 3px rgba(var(--worker-role-green-rgb), .1); }
fieldset { margin: 0; padding: 0; border: 0; }
legend { margin-bottom: 9px; color: #12324a; font-size: 13px; font-weight: 700; }
.check { display: inline-flex; align-items: center; gap: 7px; margin: 0 18px 8px 0; color: #314e60; font-size: 13px; font-weight: 500; }
.check input { accent-color: var(--worker-role-green-end); }
.align-end { align-self: end; padding-bottom: 10px; }
.read-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px 24px; }
.read-grid div { display: flex; flex-direction: column; gap: 4px; }
.read-grid span { color: #526977; font-size: 12px; }
.read-grid strong { color: #12324a; font-size: 14px; overflow-wrap: anywhere; }
.entry { margin-top: 14px; padding: 16px; border: 1px solid rgba(18,50,74,.08); border-radius: 11px; }
.entry:first-of-type { margin-top: 0; }
.add, .remove { border: 0; background: none; font: 700 13px inherit; cursor: pointer; }
.add { margin-top: 14px; padding: 9px 13px; color: var(--worker-role-green-text); background: #e7f7ee; border-radius: 8px; }
.remove { justify-self: start; padding: 0; color: #a23434; }
.split { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 24px; }
.compact { display: grid; grid-template-columns: 1.4fr 1fr .7fr auto; align-items: center; gap: 8px; padding: 10px; }
.compact p { grid-column: 1 / -1; }
.language-row { grid-template-columns: 1.2fr 1fr auto auto auto auto; }
@media (max-width: 760px) { .worker-card { padding: 24px 22px; } .worker-grid, .read-grid, .split { grid-template-columns: 1fr; } .full { grid-column: auto; } .compact, .language-row { grid-template-columns: 1fr; } }
</style>
