<script setup>
defineProps({
  user: { type: Object, default: null },
})

const emit = defineEmits(['back'])

function goBack() {
  emit('back')
}
</script>

<template>
  <main class="dash-main profile-page">
    <div class="dash-welcome">
      <h1 class="dash-welcome__title">
        <span class="dash-welcome__name">{{ user?.name || 'User' }}</span>
      </h1>
      <p class="dash-welcome__desc">Your profile details will appear here soon.</p>
    </div>

    <div class="dash-section">
      <div class="dash-empty">Nothing to see here yet.</div>
    </div>

    <button type="button" class="dash-btn dash-btn--outline" @click="goBack">Back</button>
  </main>
</template>
