<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { setAuth } from '../api'
import { login, register } from '../api/auth'
import Stepper from './Stepper.vue'

const props = defineProps({
  initialEmail: {
    type: String,
    default: '',
  },
  initialRole: {
    type: String,
    default: '',
    validator: (value) => ['','LookingForWork', 'Hiring'].includes(value),
  },
  initialMode:{
    type:String,
    default:'register'
  }
})
const emit = defineEmits(['close', 'success'])

const mode = ref(props.initialMode)
const loading = ref(false)
const serverError = ref('')
const fieldErrors = ref({})
const modalRef = ref(null)
const stepperRef = ref(null)
const currentStep = ref(1)

const form = ref({
  name: '',
  email: props.initialEmail,
  password: '',
  role: props.initialRole,
})

const isRegister = computed(() => mode.value === 'register')
const steps = computed(() => isRegister.value
  ? [
      { title: 'Choose your path', description: 'Tell us whether you are looking for work or hiring locally.' },
      { title: 'Introduce yourself', description: 'Add the details people will recognise you by.' },
      { title: 'Secure your account', description: 'Create a password and finish joining LocalHire.' },
    ]
  : [
      { title: 'Find your account', description: 'Choose your role and enter the email linked to it.' },
      { title: 'Welcome back', description: 'Enter your password to continue to LocalHire.' },
    ])
const isLastStep = computed(() => currentStep.value === steps.value.length)

function toggleMode() {
  mode.value = mode.value === 'register' ? 'login' : 'register'
  currentStep.value = 1
  serverError.value = ''
  fieldErrors.value = {}
}

function focusCurrentStep() {
  nextTick(() => modalRef.value?.querySelector(`[data-auth-step="${currentStep.value}"] input, [data-auth-step="${currentStep.value}"] select`)?.focus())
}

function validateCurrentStep() {
  const errors = { ...fieldErrors.value }
  const fields = currentStep.value === 1
    ? (isRegister.value ? ['role'] : ['role', 'email'])
    : (isRegister.value && currentStep.value === 2 ? ['name', 'email'] : [])

  for (const field of fields) delete errors[field]
  if (fields.includes('role') && !form.value.role) errors.role = ['Choose how you will use LocalHire.']
  if (fields.includes('name') && !form.value.name.trim()) errors.name = ['Enter your full name.']
  if (fields.includes('email')) {
    if (!form.value.email.trim()) errors.email = ['Enter your email address.']
    else if (!/^\S+@\S+\.\S+$/.test(form.value.email)) errors.email = ['Enter a valid email address.']
  }
  fieldErrors.value = errors
  return !fields.some(field => errors[field])
}

function advance(next) {
  serverError.value = ''
  if (!validateCurrentStep()) return focusCurrentStep()
  next()
  focusCurrentStep()
}

function onStepChange(value) {
  currentStep.value = value
  serverError.value = ''
  focusCurrentStep()
}

function revealFirstError(errors) {
  const keys = Object.keys(errors)
  const target = isRegister.value
    ? (keys.includes('role') ? 1 : keys.some(key => ['name', 'email'].includes(key)) ? 2 : 3)
    : (keys.some(key => ['role', 'email'].includes(key)) ? 1 : 2)
  stepperRef.value?.setStep(target, true)
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) close()
}

function close() {
  emit('close')
}

let previousFocus
const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

function handleKeydown(e) {
  if (e.key === 'Escape') {
    close()
    return
  }

  if (e.key !== 'Tab') return

  const focusable = [...(modalRef.value?.querySelectorAll(focusableSelector) || [])]
  if (!focusable.length) {
    e.preventDefault()
    modalRef.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

async function handleSubmit() {
  loading.value = true
  serverError.value = ''
  fieldErrors.value = {}

  try {
    const submittedMode = mode.value
    const payload = submittedMode === 'register'
      ? {
          name: form.value.name,
          email: form.value.email,
          password: form.value.password,
          role: form.value.role,
        }
      : {
          email: form.value.email,
          password: form.value.password,
          role: form.value.role,
        }

    const { data } = submittedMode === 'register'
      ? await register(payload)
      : await login(payload)

    if (!data?.token) {
      serverError.value =
        'Invalid authentication response. Please try again.'
      return
    }

    setAuth(data.token)
    emit('success', { mode: submittedMode })
  } catch (err) {

    if (err.response?.status === 429) {
      serverError.value =
        'Too many attempts. Please wait a moment and try again.'

    } else if (err.response?.status === 400 && err.response?.data?.errors) {
      const normalizedErrors = {}
      for (const [key, value] of Object.entries(err.response.data.errors)) {
        normalizedErrors[key.toLowerCase()] = value
      }
      fieldErrors.value = normalizedErrors
      revealFirstError(normalizedErrors)

    } else if (err.response?.status === 409) {
      serverError.value =
        err.response.data?.error ||
        'An account with this email and role already exists.'

    } else if (err.response?.data?.title === 'Conflict') {
      fieldErrors.value = {
        email: ['An account with this email and role already exists.'],
      }
      revealFirstError(fieldErrors.value)

    } else if (err.response?.data?.title === 'Unauthorized') {
      serverError.value = 'Invalid email, password, or role.'

    } else if (err.response?.data?.error) {
      serverError.value = err.response.data.error

    } else if (err.response?.data?.message) {
      serverError.value = err.response.data.message

    } else {
      serverError.value = 'Something went wrong. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

function submitOrAdvance() {
  if (!isLastStep.value) return advance(() => stepperRef.value?.next())
  const errors = { ...fieldErrors.value }
  delete errors.password
  if (!form.value.password) errors.password = ['Enter your password.']
  else if (isRegister.value && form.value.password.length < 8) errors.password = ['Use at least 8 characters.']
  fieldErrors.value = errors
  if (errors.password) return focusCurrentStep()
  return handleSubmit()
}

onMounted(() => {
  previousFocus = document.activeElement
  document.addEventListener('keydown', handleKeydown)
  nextTick(() => {
    modalRef.value?.querySelector('input, select, button')?.focus()
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  previousFocus?.focus?.()
})
</script>

<template>
  <div class="auth-overlay" @click="handleOverlayClick">
    <div ref="modalRef" class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" tabindex="-1">
      <button class="auth-modal__close" @click="close" aria-label="Close">&times;</button>

      <div class="auth-modal__header">
        <h2 id="auth-modal-title" class="auth-modal__title">{{ isRegister ? 'Create your account' : 'Welcome back' }}</h2>
        <p class="auth-modal__subtitle">
          {{ isRegister
            ? 'Join LocalHire and find the right opportunities near you.'
            : 'Sign in to continue your journey.'
          }}
        </p>
      </div>

      <form class="auth-form" @submit.prevent="submitOrAdvance" novalidate>
        <Stepper
          :key="mode"
          ref="stepperRef"
          class="auth-stepper"
          :steps="steps"
          :interactive="false"
          :show-controls="false"
          @change="onStepChange"
        >
          <template #content="{ step, current }">
            <div class="auth-step__header">
              <span>Step {{ current }} of {{ steps.length }}</span>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>

            <div v-if="current === 1" :data-auth-step="current" class="auth-step">
              <div class="auth-field">
                <label class="auth-field__label" for="auth-role">I am</label>
                <select id="auth-role" v-model="form.role" class="auth-field__input" :class="{ 'auth-field__input--error': fieldErrors.role }">
                  <option value="">Select</option>
                  <option value="LookingForWork">Looking for work</option>
                  <option value="Hiring">Hiring</option>
                </select>
                <span v-if="fieldErrors.role" class="auth-field__error">{{ fieldErrors.role[0] }}</span>
              </div>

              <div v-if="!isRegister" class="auth-field">
                <label class="auth-field__label" for="auth-email">Email address</label>
                <input id="auth-email" v-model="form.email" class="auth-field__input" type="email" placeholder="you@example.com" autocomplete="email" :class="{ 'auth-field__input--error': fieldErrors.email }" />
                <span v-if="fieldErrors.email" class="auth-field__error">{{ fieldErrors.email[0] }}</span>
              </div>
            </div>

            <div v-else-if="isRegister && current === 2" :data-auth-step="current" class="auth-step">
              <div class="auth-field">
                <label class="auth-field__label" for="auth-name">Full name</label>
                <input id="auth-name" v-model="form.name" class="auth-field__input" type="text" placeholder="Your full name" autocomplete="name" :class="{ 'auth-field__input--error': fieldErrors.name }" />
                <span v-if="fieldErrors.name" class="auth-field__error">{{ fieldErrors.name[0] }}</span>
              </div>
              <div class="auth-field">
                <label class="auth-field__label" for="auth-email">Email address</label>
                <input id="auth-email" v-model="form.email" class="auth-field__input" type="email" placeholder="you@example.com" autocomplete="email" :class="{ 'auth-field__input--error': fieldErrors.email }" />
                <span v-if="fieldErrors.email" class="auth-field__error">{{ fieldErrors.email[0] }}</span>
              </div>
            </div>

            <div v-else :data-auth-step="current" class="auth-step">
              <div class="auth-field">
                <label class="auth-field__label" for="auth-password">Password</label>
                <input id="auth-password" v-model="form.password" class="auth-field__input" type="password" :placeholder="isRegister ? 'Min. 8 characters' : 'Your password'" :autocomplete="isRegister ? 'new-password' : 'current-password'" :class="{ 'auth-field__input--error': fieldErrors.password }" />
                <span v-if="fieldErrors.password" class="auth-field__error">{{ fieldErrors.password[0] }}</span>
              </div>
              <p v-if="serverError" class="auth-form__error">{{ serverError }}</p>
            </div>
          </template>

          <template #actions="{ current, back, next }">
            <button v-if="current > 1" type="button" class="auth-step__back" @click="back">Previous</button>
            <button v-if="current < steps.length" type="button" class="auth-form__submit" @click="advance(next)">Continue</button>
            <button v-else type="submit" class="auth-form__submit" :disabled="loading">
              <span v-if="loading" class="auth-form__spinner"></span>
              <span v-else>{{ isRegister ? 'Create account' : 'Sign in' }}</span>
            </button>
          </template>
        </Stepper>
      </form>

      <div class="auth-modal__footer">
        <span>{{ isRegister ? 'Already have an account?' : "Don't have an account?" }}</span>
        <button class="auth-modal__toggle" @click="toggleMode">
          {{ isRegister ? 'Sign in' : 'Create one' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-modal { max-width: 520px; }
.auth-modal__header { margin-bottom: 20px; }
.auth-stepper { border: 0; box-shadow: none; background: transparent; }
.auth-stepper :deep(.stepper__content) { min-height: 280px; padding: 28px 2px 18px; }
.auth-stepper :deep(.stepper__indicators button:disabled) { cursor: default; opacity: .65; }
.auth-stepper :deep(footer) { align-items: center; }
.auth-stepper :deep(footer) .auth-form__submit { width: auto; flex: 1; }
.auth-step__header { margin-bottom: 24px; }
.auth-step__header > span { color: #07559a; font: 700 11px ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }
.auth-step__header h3 { margin: 8px 0 5px; color: #12324a; font: 800 24px Manrope, sans-serif; }
.auth-step__header p { color: #5d7482; font-size: 13px; line-height: 1.55; }
.auth-step { display: grid; gap: 18px; }
.auth-step__back { min-height: 52px; padding: 0 18px; color: #526977; border: 1.5px solid rgba(18,50,74,.14); border-radius: 12px; background: #fff; font-weight: 700; }
.auth-step__back:focus-visible { outline: 3px solid rgba(7,85,154,.16); outline-offset: 2px; }

@media (max-width: 560px) {
  .auth-stepper { padding: 18px 4px 4px; }
  .auth-stepper :deep(.stepper__content) { min-height: 300px; }
}
</style>
