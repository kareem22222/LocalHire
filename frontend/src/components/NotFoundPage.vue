<script setup>
import { useRouter } from 'vue-router'
import BrandLogo from './BrandLogo.vue'

const router = useRouter()
</script>

<template>
  <div class="dash-shell">
    <header class="dash-header"><BrandLogo @click.prevent="router.push('/')" /></header>
    <main class="not-found">
      <h1>Page not found</h1>
      <p>The link may be incorrect or the page may have moved.</p>
      <button type="button" class="dash-btn dash-btn--primary" @click="router.push('/')">Back to dashboard</button>
    </main>
  </div>
</template>

<style scoped>
.not-found { width: min(640px, calc(100% - 40px)); margin: 72px auto; padding: 40px; text-align: center; border-radius: 20px; background: #fff; }
.not-found h1 { color: #0b3658; font: 800 32px Manrope, sans-serif; }
.not-found p { margin: 10px 0 24px; color: #526977; }
</style>
