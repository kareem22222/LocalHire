<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
import BrandLogo from './BrandLogo.vue'

const emit = defineEmits(['logout'])

const user = ref(null)

async function fetchProfile() {
  try {
    const { data } = await api.get('/auth/me')
    user.value = data
  } catch {
  }
}

function handleLogout() {
  emit('logout')
}

onMounted(fetchProfile)
</script>

<template>
  <div class="dash-shell">
    <header class="dash-header">
      <BrandLogo />
      <div class="dash-header__right">
        <span class="dash-user-name">{{ user?.name || 'User' }}</span>
        <button class="dash-logout-btn" @click="handleLogout">Sign out</button>
      </div>
    </header>

    <main class="dash-main">
      <div class="dash-welcome">
        <h1 class="dash-welcome__title">
          Welcome, <span class="dash-welcome__name">{{ user?.name || 'there' }}</span>
        </h1>
        <p class="dash-welcome__desc">
          You're signed in as <strong>{{ user?.email }}</strong>. Your dashboard is on its way — we're building tools to help you find the best local opportunities and talent.
        </p>

        <div class="dash-cards">
          <div class="dash-card">
            <div class="dash-card__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3 class="dash-card__title">Find Talent</h3>
            <p class="dash-card__desc">Browse local candidates who match your requirements.</p>
          </div>
          <div class="dash-card">
            <div class="dash-card__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <h3 class="dash-card__title">Find Work</h3>
            <p class="dash-card__desc">Discover nearby jobs and opportunities tailored to you.</p>
          </div>
          <div class="dash-card">
            <div class="dash-card__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <h3 class="dash-card__title">My Profile</h3>
            <p class="dash-card__desc">Manage your profile and update your preferences.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
