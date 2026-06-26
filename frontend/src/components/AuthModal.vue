<script setup>
import { ref, computed } from 'vue'
import api, { setAuth } from '../api'

const emit = defineEmits(['close', 'success'])

const mode = ref('register')
const loading = ref(false)
const serverError = ref('')
const fieldErrors = ref({})

const form = ref({
  name: '',
  email: '',
  password: '',
  role: 'LookingForWork',
})

const isRegister = computed(() => mode.value === 'register')

function toggleMode() {
  mode.value = mode.value === 'register' ? 'login' : 'register'
  serverError.value = ''
  fieldErrors.value = {}
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) emit('close')
}

async function handleSubmit() {
  loading.value = true
  serverError.value = ''
  fieldErrors.value = {}

  try {
    const endpoint = isRegister.value ? '/auth/register' : '/auth/login'
    const payload = isRegister.value
      ? { name: form.value.name, email: form.value.email, password: form.value.password, role: form.value.role }
      : { email: form.value.email, password: form.value.password }

    const { data } = await api.post(endpoint, payload)

    // Decode JWT to get basic user info
    const payloadBase64 = data.token.split('.')[1]
    const decoded = JSON.parse(atob(payloadBase64))

    const roleClaim = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
    const user = {
      id: decoded.sub,
      name: decoded.name,
      email: decoded.email,
      role: roleClaim,
    }

    setAuth(data.token, user)
    emit('success', user)
  } catch (err) {
    if (err.response?.status === 429) {
      serverError.value = 'Too many attempts. Please wait a moment and try again.'
    } else if (err.response?.status === 400 && err.response?.data?.errors) {
      fieldErrors.value = err.response.data.errors
    } else if (err.response?.data?.title === 'Conflict') {
      fieldErrors.value = { email: ['An account with this email already exists.'] }
    } else if (err.response?.data?.title === 'Unauthorized') {
      serverError.value = 'Invalid email or password.'
    } else {
      serverError.value = err.response?.data?.message || 'Something went wrong. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-overlay" @click="handleOverlayClick">
    <div class="auth-modal">
      <button class="auth-modal__close" @click="emit('close')" aria-label="Close">&times;</button>

      <div class="auth-modal__header">
        <h2 class="auth-modal__title">{{ isRegister ? 'Create your account' : 'Welcome back' }}</h2>
        <p class="auth-modal__subtitle">
          {{ isRegister
            ? 'Join LocalHire and find the right opportunities near you.'
            : 'Sign in to continue your journey.'
          }}
        </p>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit" novalidate>

        <div v-if="isRegister" class="auth-field">
          <label class="auth-field__label" for="auth-name">Full name</label>
          <input
            id="auth-name"
            v-model="form.name"
            class="auth-field__input"
            type="text"
            placeholder="Your full name"
            autocomplete="name"
            :class="{ 'auth-field__input--error': fieldErrors.name }"
          />
          <span v-if="fieldErrors.name" class="auth-field__error">{{ fieldErrors.name[0] }}</span>
        </div>

        <div v-if="isRegister" class="auth-field">
          <label class="auth-field__label" for="auth-role">I am a</label>
          <select
            id="auth-role"
            v-model="form.role"
            class="auth-field__input"
            :class="{ 'auth-field__input--error': fieldErrors.role }"
          >
            <option value="LookingForWork">Looking for work</option>
            <option value="Hiring">Hiring</option>
          </select>
          <span v-if="fieldErrors.role" class="auth-field__error">{{ fieldErrors.role[0] }}</span>
        </div>

        <div class="auth-field">
          <label class="auth-field__label" for="auth-email">Email address</label>
          <input
            id="auth-email"
            v-model="form.email"
            class="auth-field__input"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            :class="{ 'auth-field__input--error': fieldErrors.email }"
          />
          <span v-if="fieldErrors.email" class="auth-field__error">{{ fieldErrors.email[0] }}</span>
        </div>

        <div class="auth-field">
          <label class="auth-field__label" for="auth-password">Password</label>
          <input
            id="auth-password"
            v-model="form.password"
            class="auth-field__input"
            type="password"
            :placeholder="isRegister ? 'Min. 8 characters' : 'Your password'"
            autocomplete="current-password"
            :class="{ 'auth-field__input--error': fieldErrors.password }"
          />
          <span v-if="fieldErrors.password" class="auth-field__error">{{ fieldErrors.password[0] }}</span>
        </div>

        <p v-if="serverError" class="auth-form__error">{{ serverError }}</p>

        <button type="submit" class="auth-form__submit" :disabled="loading">
          <span v-if="loading" class="auth-form__spinner"></span>
          <span v-else>{{ isRegister ? 'Create account' : 'Sign in' }}</span>
        </button>
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
