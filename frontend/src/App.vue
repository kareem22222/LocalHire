<script setup>
import confetti from 'canvas-confetti'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onMounted, onUnmounted, ref } from 'vue'
import { clearAuth, isAuthenticated } from './api'
import AppDashboard from './components/AppDashboard.vue'
import AuthModal from './components/AuthModal.vue'
import BrandLogo from './components/BrandLogo.vue'
import NetworkBackground from './components/NetworkBackground.vue'

gsap.registerPlugin(ScrollTrigger)

const showModal = ref(false)
const isAuth = ref(null)
const authEmail = ref('')
const authRole = ref('LookingForWork')
const authMode=ref('register')
const ctaEmail = ref('')

const headerRef = ref(null)
const heroRef = ref(null)
const statsRef = ref(null)
const stepsRef = ref(null)
const ctaRef = ref(null)
const heroContentRef = ref(null)
const footerRef = ref(null)

let ctx
let onScroll

function openModal(email = '', role = 'LookingForWork',initialMode='register') {
  authEmail.value = typeof email === 'string' ? email : ''
  authRole.value = role
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

function onAuthSuccess({ mode } = {}) {
  isAuth.value = true
  showModal.value = false
  if (mode === 'register') showSignupConfetti()
}

async function handleLogout() {
  await clearAuth()
  isAuth.value = false
  window.location.reload()
}

function handleCtaSubmit() {
  openModal(ctaEmail.value.trim())
}

onMounted(async () => {
  isAuth.value = await isAuthenticated()
  if (isAuth.value) return

  // Header scroll effect
  onScroll = () => {
    if (headerRef.value) {
      headerRef.value.classList.toggle('scrolled', window.scrollY > 20)
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

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

    // Steps reveal
    gsap.from(stepsRef.value?.children, {
      scrollTrigger: {
        trigger: stepsRef.value,
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      y: 50,
      opacity: 0,
      duration: 0.9,
      stagger: 0.18,
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
  window.removeEventListener('scroll', onScroll)
  ctx?.revert()
  ScrollTrigger.getAll().forEach(t => t.kill())
})
</script>

<template>
  <AuthModal v-if="showModal" :initial-email="authEmail" :initial-role="authRole" :initial-mode="authMode" @close="showModal = false" @success="onAuthSuccess" />
  <AppDashboard v-if="isAuth === true" @logout="handleLogout" />

  <div v-if="isAuth === false" class="app-shell">
    <NetworkBackground />

    <!-- Header -->
    <header ref="headerRef" class="site-header">
      <BrandLogo />
      <nav class="nav-links">
        <a href="#" class="nav-link" @click.prevent="openModal('', 'LookingForWork')">For Candidates</a>
        <a href="#" class="nav-link" @click.prevent="openModal('', 'Hiring')">For Employers</a>
        <a href="#" class="nav-link nav-link--primary" @click.prevent="openModal('','LookingForWork','login')">Sign in</a>
      </nav>
    </header>

    <!-- Hero -->
    <section ref="heroRef" class="hero-section">
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
        <div class="hero-actions">
          <a href="#" class="btn btn--primary" @click.prevent="openModal('', 'LookingForWork')">I'm looking for work</a>
          <a href="#" class="btn btn--stroke" @click.prevent="openModal('', 'Hiring')">I'm hiring locally</a>
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
    <section ref="statsRef" class="stats-section">
      <div class="stat-card">
        <span class="stat-card__num">18</span>
        <span class="stat-card__label">Cities active</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__num">2,400+</span>
        <span class="stat-card__label">Early signups</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__num">97%</span>
        <span class="stat-card__label">Local match rate</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__num">15min</span>
        <span class="stat-card__label">Avg. time to match</span>
      </div>
    </section>

    <!-- How It Works -->
    <section class="steps-section">
      <div class="section-label">How it works</div>
      <h2 class="section-title">Find the right fit,<br />right where you are.</h2>
      <div ref="stepsRef" class="steps-grid">
        <div class="step-card">
          <span class="step-card__num">01</span>
          <h3 class="step-card__title">Create your profile</h3>
          <p class="step-card__desc">Tell us what you're looking for — work or talent — in under 2 minutes.</p>
        </div>
        <div class="step-card">
          <span class="step-card__num">02</span>
          <h3 class="step-card__title">Get matched locally</h3>
          <p class="step-card__desc">Our smart matching finds the most relevant people or roles in your area.</p>
        </div>
        <div class="step-card">
          <span class="step-card__num">03</span>
          <h3 class="step-card__title">Connect &amp; grow</h3>
          <p class="step-card__desc">Message directly, arrange interviews, and build your local network.</p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section ref="ctaRef" class="cta-section">
      <div class="cta-card">
        <h2 class="cta-title">Ready to build<br />your local future?</h2>
        <p class="cta-desc">Join thousands who've already signed up. We're launching in your city soon.</p>
        <form class="cta-form" @submit.prevent="handleCtaSubmit">
          <input v-model="ctaEmail" type="email" class="cta-input" placeholder="Enter your email" aria-label="Email address" required />
          <button type="submit" class="btn btn--primary btn--lg">Sign up</button>
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
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </div>
    </footer>

  </div>
</template>
