<script setup>
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  user: { type: Object, default: null },
})

const emit = defineEmits(['back', 'save'])

const editing = ref(false)
const saving = ref(false)

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
}

watch(() => props.user, hydrate, { immediate: true })

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
  editing.value = true
}

function cancelEdit() {
  hydrate()
  editing.value = false
}

// Kept async so a profile-update API call can be awaited here without changing callers.
async function save() {
  saving.value = true
  try {
    emit('save', {
      name: form.name.trim(),
      phone: form.phone.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      addressLine: form.addressLine.trim(),
      cityArea: form.cityArea.trim(),
      state: form.state,
      pincode: form.pincode.trim(),
    })
  } finally {
    saving.value = false
    editing.value = false
  }
}

function goBack() {
  emit('back')
}
</script>

<template>
  <main class="dash-main profile-page">
    <!-- Header / hero card -->
    <section class="profile-hero">
      <div class="profile-hero__avatar" aria-hidden="true">{{ initials }}</div>
      <div class="profile-hero__info">
        <h1 class="dash-welcome__title profile-hero__name">
          <span class="dash-welcome__name">{{ form.name || props.user?.name || 'User' }}</span>
        </h1>
        <p class="profile-hero__headline">Hiring locally on LocalHire</p>
        <div class="profile-hero__tags">
          <span class="profile-badge profile-badge--role">Hiring</span>
          <span v-if="locationSummary" class="profile-badge">{{ locationSummary }}</span>
          <span v-if="memberSince" class="profile-badge profile-badge--muted">Member since {{ memberSince }}</span>
        </div>
      </div>
      <div class="profile-hero__actions">
        <template v-if="!editing">
          <button type="button" class="dash-btn dash-btn--primary" @click="startEdit">Edit profile</button>
          <button type="button" class="dash-btn dash-btn--outline" @click="goBack">Back</button>
        </template>
        <template v-else>
          <button type="button" class="dash-btn dash-btn--primary" :disabled="saving" @click="save">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
          <button type="button" class="dash-btn dash-btn--outline" :disabled="saving" @click="cancelEdit">Cancel</button>
        </template>
      </div>
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
          <input v-if="editing" id="profile-name" v-model="form.name" type="text" placeholder="Your full name" />
          <p v-else class="profile-value">{{ form.name || '—' }}</p>
        </div>
        <div class="profile-field">
          <span class="profile-field__label">Email</span>
          <p class="profile-value profile-value--locked">{{ form.email || '—' }}</p>
        </div>
        <div class="profile-field">
          <label for="profile-phone">Phone</label>
          <input v-if="editing" id="profile-phone" v-model="form.phone" type="tel" inputmode="tel" placeholder="+91 98765 43210" />
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

    <!-- Location -->
    <section class="profile-card">
      <div class="profile-card__head">
        <h2 class="dash-section__title">Location</h2>
        <p class="profile-card__hint">Helps us match you with nearby talent.</p>
      </div>
      <div class="profile-grid">
        <div class="profile-field profile-field--full">
          <label for="profile-address">Address line</label>
          <input v-if="editing" id="profile-address" v-model="form.addressLine" type="text" placeholder="House / street / landmark" />
          <p v-else class="profile-value">{{ form.addressLine || '—' }}</p>
        </div>
        <div class="profile-field">
          <label for="profile-city-area">City / Area</label>
          <input v-if="editing" id="profile-city-area" v-model="form.cityArea" type="text" placeholder="e.g. Indiranagar, Bengaluru" />
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
  </main>
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
  background: linear-gradient(135deg, #07559a, #12ad59);
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

.profile-badge--muted {
  color: #5d7482;
  background: rgba(18, 50, 74, 0.04);
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
.profile-field select {
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
.profile-field select:focus {
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
