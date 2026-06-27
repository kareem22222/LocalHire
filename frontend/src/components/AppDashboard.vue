<script setup>
import { computed, ref, onMounted } from 'vue'
import api from '../api'
import BrandLogo from './BrandLogo.vue'
import TalentDashboard from './TalentDashboard.vue'
import HiringDashboard from './HiringDashboard.vue'
import ProfileDashboard from './ProfileDashboard.vue'

const emit = defineEmits(['logout'])

const user = ref(null)
const activeView = ref('talent')

const firstName = computed(() => (user.value?.name || 'User').split(' ')[0])

async function fetchProfile() {
  try {
    const { data } = await api.get('/auth/me')
    user.value = data
    activeView.value = data?.role === 'Hiring' ? 'hiring' : 'talent'
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
        <div class="dash-view-switch" aria-label="Dashboard view">
          <button
            type="button"
            :class="{ active: activeView === 'talent' }"
            @click="activeView = 'talent'"
          >
            Talent
          </button>
          <button
            type="button"
            :class="{ active: activeView === 'hiring' }"
            @click="activeView = 'hiring'"
          >
            Hiring
          </button>
        </div>
        <button class="dash-user-name dash-user-name--button" type="button" @click="activeView = 'profile'">
          {{ firstName }}
        </button>
        <button class="dash-logout-btn" @click="handleLogout">Sign out</button>
      </div>
    </header>

    <ProfileDashboard v-if="activeView === 'profile'" :user="user" />
    <HiringDashboard v-else-if="activeView === 'hiring'" />
    <TalentDashboard v-else />
  </div>
</template>
