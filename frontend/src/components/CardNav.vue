<script setup>
import { gsap } from 'gsap'
import { nextTick, onBeforeUnmount, ref } from 'vue'
import BrandLogo from './BrandLogo.vue'

defineProps({ items: { type: Array, default: () => [] }, ctaLabel: { type: String, default: 'Sign in' } })
const emit = defineEmits(['select', 'cta'])
const open = ref(false)
const nav = ref(null)
let timeline

async function toggle() {
  open.value = !open.value
  await nextTick()
  timeline?.kill()
  const cards = nav.value.querySelectorAll('.card-nav__card')
  timeline = gsap.timeline()
    .to(nav.value, { height: open.value ? (window.innerWidth <= 720 ? nav.value.scrollHeight : 270) : 64, duration: .42, ease: 'power3.out' })
  if (open.value) timeline.fromTo(cards, { y: 35, opacity: 0 }, { y: 0, opacity: 1, duration: .35, stagger: .07, ease: 'power3.out' }, '-=.2')
}

onBeforeUnmount(() => timeline?.kill())
</script>

<template>
  <div class="card-nav-wrap">
    <nav ref="nav" class="card-nav" :class="{ open }" aria-label="Primary navigation">
      <div class="card-nav__top">
        <button type="button" class="card-nav__menu" :aria-expanded="open" aria-label="Toggle navigation" @click="toggle"><i></i><i></i></button>
        <BrandLogo />
        <button type="button" class="card-nav__cta" @click="emit('cta')">{{ ctaLabel }}</button>
      </div>
      <div class="card-nav__cards">
        <section v-for="(item, index) in items.slice(0, 3)" :key="item.label" class="card-nav__card" :class="`card-nav__card--${index + 1}`">
          <h2>{{ item.label }}</h2>
          <div>
            <button v-for="link in item.links" :key="link.label" type="button" @click="emit('select', link)"><span>↗</span>{{ link.label }}</button>
          </div>
        </section>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.card-nav-wrap { position: fixed; top: 16px; left: 50%; z-index: 180; width: min(860px,calc(100% - 32px)); transform: translateX(-50%); }
.card-nav { height: 64px; overflow: hidden; border: 1px solid rgba(18,50,74,.11); border-radius: 18px; background: rgba(255,255,255,.92); box-shadow: 0 20px 60px rgba(7,85,154,.14); backdrop-filter: blur(22px); }
.card-nav__top { position: relative; display: flex; height: 64px; align-items: center; justify-content: space-between; padding: 8px 10px 8px 18px; }
.card-nav__top :deep(.brand) { position: absolute; left: 50%; transform: translateX(-50%); }
.card-nav__menu { display: grid; gap: 6px; width: 38px; padding: 8px 4px; border: 0; background: none; }
.card-nav__menu i { width: 28px; height: 2px; background: #12324a; transition: .25s ease; }.open .card-nav__menu i:first-child { transform: translateY(4px) rotate(45deg); }.open .card-nav__menu i:last-child { transform: translateY(-4px) rotate(-45deg); }
.card-nav__cta { height: 46px; padding: 0 20px; color: #fff; border: 0; border-radius: 12px; background: linear-gradient(120deg,#07559a,#168caa); font-weight: 800; }
.card-nav__cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; padding: 2px 10px 10px; }
.card-nav__card { display: flex; min-height: 184px; flex-direction: column; padding: 18px; color: #12324a; border-radius: 14px; }.card-nav__card--1 { background: #dcecf8; }.card-nav__card--2 { background: #d9f3f2; }.card-nav__card--3 { background: #e2f5e9; }
.card-nav__card h2 { font: 800 23px Manrope,sans-serif; }.card-nav__card div { display: grid; gap: 6px; margin-top: auto; }
.card-nav__card button { display: flex; gap: 7px; color: inherit; border: 0; background: none; font-weight: 700; text-align: left; }
@media (max-width:720px) { .card-nav-wrap { top: 10px; width: calc(100% - 20px); }.card-nav__top :deep(.brand__word) { display: none; }.card-nav__cards { grid-template-columns: 1fr; }.card-nav__card { min-height: 110px; }.card-nav__cta { display: none; } }
</style>
