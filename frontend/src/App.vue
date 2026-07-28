<script setup>
import confetti from 'canvas-confetti'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAuthenticated } from './api'
import AuthModal from './components/AuthModal.vue'
import BrandLogo from './components/BrandLogo.vue'
import CardNav from './components/CardNav.vue'
import CountUp from './components/CountUp.vue'
import Dock from './components/Dock.vue'
import LineSidebar from './components/LineSidebar.vue'
import NetworkBackground from './components/NetworkBackground.vue'
import NotificationCenter from './components/NotificationCenter.vue'
import PrivacyPolicy from './components/privacypolicy.vue'
import SpecularButton from './components/SpecularButton.vue'
import StaggeredMenu from './components/StaggeredMenu.vue'
import { useProfileStore } from './stores/profile'
import { useNotificationsStore } from './stores/notifications'
import { normalizeRole } from './utils/role'
import { logout } from './utils/session'
gsap.registerPlugin(ScrollTrigger)

const showModal = ref(false)
const isAuth = ref(null)
const authEmail = ref('')
const authRole = ref('LookingForWork')
const authMode=ref('register')
const ctaEmail = ref('')
const footerRef = ref(null)
const statsRef = ref(null)
const ctaRef = ref(null)
const heroContentRef = ref(null)
const showPrivacyPolicy = ref(false)
const router = useRouter()
const profileStore = useProfileStore()
const notificationsStore = useNotificationsStore()
const { profile: authUser } = storeToRefs(profileStore)

const navItems = [
  { label: 'Find work', links: [{ label: 'Browse nearby roles', action: 'candidate' }, { label: 'Build your profile', action: 'candidate' }] },
  { label: 'Hire local', links: [{ label: 'Post a role', action: 'employer' }, { label: 'Meet local talent', action: 'employer' }] },
  { label: 'Explore', links: [{ label: 'Network momentum', target: 'network-momentum' }] },
]
const sectionItems = [
  { label: 'Start', target: 'home' },
  { label: 'Momentum', target: 'network-momentum' },
  { label: 'Join', target: 'join' },
]
const authRoleByAction = { candidate: 'LookingForWork', employer: 'Hiring' }
const authMenuItems = computed(() => {
  const role = normalizeRole(authUser.value?.role)
  if (role === 'hiring') return [
    { label: 'Dashboard', path: '/' },
    { label: 'Open roles', path: '/hiring/roles' },
    { label: 'Talent', path: '/hiring/candidates' },
    { label: 'Shortlists', path: '/hiring/shortlists' },
  ]
  if (role === 'worker') return [
    { label: 'Dashboard', path: '/' },
    { label: 'Applications', path: '/work/applications' },
  ]
  return [{ label: 'Dashboard', path: '/' }]
})
const authAccount = computed(() => ({
  name: authUser.value?.name || 'Your account',
  detail: authUser.value?.email || (normalizeRole(authUser.value?.role) === 'hiring' ? 'Hiring workspace' : 'Local work profile'),
}))
const quickDockItems = [
  { label: 'Back to top', icon: '↑', target: 'home' },
  { label: 'Join LocalHire', icon: '+', target: 'join' },
]

let ctx

function cleanupLandingAnimations() {
  ctx?.revert()
  ctx = undefined
  ScrollTrigger.getAll().forEach(trigger => trigger.kill())
}

function openModal(email = '', role = '',initialMode='register') {
  authEmail.value = typeof email === 'string' ? email : ''
  authRole.value = authRoleByAction[role] ?? role
  authMode.value=initialMode
  showModal.value = true
}

function showSignupConfetti() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  [
    { angle: 315, origin: { x: 0, y: 0 } },
    { angle: 225, origin: { x: 1, y: 0 } },
    { angle: 45, origin: { x: 0, y: 1 } },
    { angle: 135, origin: { x: 1, y: 1 } },
  ].forEach((corner) => confetti({ particleCount: 25, spread: 70, ...corner }))
}

async function onAuthSuccess({ mode } = {}) {
  await router.replace('/')
  cleanupLandingAnimations()
  isAuth.value = true
  showModal.value = false
  profileStore.fetchProfile().catch(() => {})
  if (mode === 'register') showSignupConfetti()
}

function handleCtaSubmit() {
  openModal(ctaEmail.value.trim())
}

function handleNav(item) {
  if (item.action) return openModal('', item.action)
  document.getElementById(item.target)?.scrollIntoView({ behavior: 'smooth' })
}

function handleAuthNav(item) {
  if (item.action === 'profile') return router.push({ path: '/', query: { tab: 'profile' } })
  if (item.action === 'logout') {
    profileStore.clear()
    notificationsStore.clear()
    return logout()
  }
  router.push(item.path)
}
function openPrivacy() {
  showPrivacyPolicy.value = true
  scrollToTop()
}

function closePrivacy() {
  showPrivacyPolicy.value = false
  scrollToTop()
}

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

onMounted(async () => {
  isAuth.value = await isAuthenticated()
  if (isAuth.value) {
    await profileStore.fetchProfile().catch(() => {})
    return
  }

  ctx = gsap.context(() => {
    // Hero entrance
    gsap.from(heroContentRef.value?.children, {
      y: 60,
      opacity: 0,
      duration: 1.2,
      stagger: 0.15,
      ease: 'power3.out',
      delay: 0.3
    })

    // Stats reveal
    gsap.from(statsRef.value?.children, {
      scrollTrigger: {
        trigger: statsRef.value,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power2.out'
    })

    // CTA reveal
    gsap.from(ctaRef.value?.children, {
      scrollTrigger: {
        trigger: ctaRef.value,
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power2.out'
    })

    // Footer fade
    gsap.from(footerRef.value, {
      scrollTrigger: {
        trigger: footerRef.value,
        start: 'top 90%',
        toggleActions: 'play none none none'
      },
      y: 20,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out'
    })
  })
})

onUnmounted(() => {
  cleanupLandingAnimations()
})
</script>

<template>
 <CardNav
  v-if="isAuth === false && !showPrivacyPolicy"
  :items="navItems"
  @select="handleNav"
  @cta="openModal('', 'LookingForWork', 'login')"
 />
 <StaggeredMenu v-if="isAuth === true" :items="authMenuItems" :account="authAccount" @select="handleAuthNav" />
 <NotificationCenter v-if="isAuth === true" />
 <Dock v-if="isAuth === false && !showPrivacyPolicy" class="quick-dock" :items="quickDockItems" @select="handleNav" />

 <AuthModal
  v-if="showModal"
  :initial-email="authEmail"
  :initial-role="authRole"
  :initial-mode="authMode"
  @close="showModal = false"
  @success="onAuthSuccess"
/>

<router-view v-if="isAuth === true" />

<PrivacyPolicy
  v-if="showPrivacyPolicy"
  @back="closePrivacy"
/>

<div
  v-if="isAuth === false && !showPrivacyPolicy"
  class="app-shell"
>
    <NetworkBackground />
    <LineSidebar class="section-index" :items="sectionItems" @select="handleNav" />

    <!-- Hero -->
    <section id="home" class="hero-section">
      <div ref="heroContentRef" class="hero-content">
        <span class="hero-eyebrow">India's local hiring network</span>
        <h1 class="hero-title">
          Good work,<br />
          <span class="hero-title__accent">closer to home.</span>
        </h1>
        <p class="hero-desc">
          LocalHire connects trusted local talent with nearby opportunities — 
          across India's growing cities and neighbourhoods.
        </p>
        <div class="hero-actions hero-actions--enhanced">
          <SpecularButton auto-animate @click="openModal('', 'LookingForWork')">Find work near me</SpecularButton>
          <SpecularButton @click="openModal('', 'Hiring')">Hire from my neighbourhood</SpecularButton>
        </div>
        <div class="hero-meta">
          <div class="avatar-stack" aria-hidden="true">
            <span>A</span><span>R</span><span>S</span><span>K</span>
          </div>
          <span class="hero-meta__text"><strong>2,400+</strong> early signups across <strong>18</strong> cities</span>
        </div>
      </div>
      <div class="hero-scroll">
        <span class="hero-scroll__dot"></span>
        <span class="hero-scroll__label">Scroll to explore</span>
      </div>
    </section>

    <!-- Stats -->
    <section id="network-momentum" ref="statsRef" class="stats-section">
      <div class="stat-card">
        <span class="stat-card__num"><CountUp :to="18" separator="" /></span>
        <span class="stat-card__label">Cities active</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__num"><CountUp :to="2400" suffix="+" /></span>
        <span class="stat-card__label">Early signups</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__num"><CountUp :to="97" separator="" suffix="%" /></span>
        <span class="stat-card__label">Local match rate</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__num"><CountUp :to="15" separator="" suffix="min" /></span>
        <span class="stat-card__label">Avg. time to match</span>
      </div>
    </section>

    <!-- CTA -->
    <section id="join" ref="ctaRef" class="cta-section">
      <div class="cta-card">
        <h2 class="cta-title">Ready to build<br />your local future?</h2>
        <p class="cta-desc">Join thousands who've already signed up. We're launching in your city soon.</p>
        <form class="cta-form" @submit.prevent="handleCtaSubmit">
          <input v-model="ctaEmail" type="email" class="cta-input" placeholder="Enter your email" aria-label="Email address" required />
          <SpecularButton type="submit" size="md" auto-animate>Enter the network</SpecularButton>
        </form>
      </div>
    </section>

    <!-- Footer -->
     
    <footer ref="footerRef" class="site-footer">
      <div class="footer-main">
        <BrandLogo />
        <p class="footer-tagline">Local jobs. Local talent. Real possibilities.</p>
      </div>
      <div class="footer-bottom">
        <p>&copy; {{ new Date().getFullYear() }} LocalHire. All rights reserved.</p>
        <div class="footer-links">
          <a href="#" @click.prevent="openPrivacy">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </div>
    </footer>

  </div>
</template>
