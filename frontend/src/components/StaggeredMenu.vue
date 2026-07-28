<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  account: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['select'])
const open = ref(false)
const initials = computed(() => (props.account.name || 'User')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase())

function toggle() {
  open.value = !open.value
}

function choose(item) {
  emit('select', item)
  open.value = false
}
</script>

<template>
  <div class="staggered-menu" :class="{ open }" @click.self="open = false" @keydown.esc="open = false">
    <button type="button" class="staggered-menu__toggle" :aria-expanded="open" aria-controls="menu-panel" @click="toggle">
      <span>{{ open ? 'Close' : 'Menu' }}</span><i></i>
    </button>
    <div class="staggered-menu__layers" aria-hidden="true"><i></i><i></i></div>
    <aside id="menu-panel" class="staggered-menu__panel" :aria-hidden="!open" :inert="!open">
      <p>LocalHire / Connected workspace</p>
      <button type="button" class="staggered-menu__account" style="--item-index: 0" @click="choose({ action: 'profile' })">
        <span class="staggered-menu__avatar">{{ initials }}</span>
        <span><strong>{{ account.name || 'Your account' }}</strong><small>{{ account.detail || 'View and update your profile' }}</small></span>
        <b aria-hidden="true">View →</b>
      </button>
      <nav>
        <button v-for="(item, index) in items" :key="item.label" type="button" :style="{ '--item-index': index + 1 }" @click="choose(item)">
          <span class="staggered-menu__label">{{ item.label }}<small>0{{ index + 1 }}</small></span>
        </button>
      </nav>
      <footer class="staggered-menu__footer" :style="{ '--item-index': items.length + 1 }">
        <div><span>Local work</span><span>Real people</span><span>Near home</span></div>
        <button type="button" @click="choose({ action: 'logout' })">Sign out <span aria-hidden="true">↗</span></button>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.staggered-menu { position: fixed; inset: 0; z-index: 190; pointer-events: none; }.staggered-menu.open { pointer-events: auto; }.staggered-menu__toggle { position: absolute; top: 18px; right: 24px; z-index: 4; display: flex; align-items: center; gap: 9px; padding: 13px 15px; color: #12324a; border: 1px solid rgba(18,50,74,.12); border-radius: 999px; background: rgba(255,255,255,.92); box-shadow: 0 10px 30px rgba(7,85,154,.12); pointer-events: auto; }.staggered-menu__toggle i { position: relative; width: 14px; height: 14px; transition: transform .3s ease; }.staggered-menu__toggle i::before,.staggered-menu__toggle i::after { content: ''; position: absolute; top: 6px; left: 0; width: 14px; height: 2px; background: currentColor; }.staggered-menu__toggle i::after { transform: rotate(90deg); }.open .staggered-menu__toggle i { transform: rotate(45deg); }
.staggered-menu__layers,.staggered-menu__panel { position: absolute; top: 0; right: 0; width: min(480px,100%); height: 100%; pointer-events: auto; }.staggered-menu__layers { pointer-events: none; }.staggered-menu__layers i { position: absolute; inset: 0; display: block; transform: translateX(110%); transition: transform .52s cubic-bezier(.22,1,.36,1); }.staggered-menu__layers i:first-child { background: #bedcec; }.staggered-menu__layers i:last-child { background: #c9eee4; transition-delay: .05s; }.open .staggered-menu__layers i { transform: translateX(0); }
.staggered-menu__panel { z-index: 2; display: flex; flex-direction: column; overflow-y: auto; padding: 92px 34px 30px; color: #12324a; background: #f8fcfd; box-shadow: -30px 0 80px rgba(7,85,154,.18); transform: translateX(110%); transition: transform .58s cubic-bezier(.22,1,.36,1) .08s; }.staggered-menu__panel > p { color: #07559a; font: 700 11px ui-monospace,monospace; text-transform: uppercase; letter-spacing: .1em; }
.staggered-menu__account { display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 13px; align-items: center; width: 100%; margin-top: 24px; padding: 14px; color: inherit; text-align: left; border: 1px solid rgba(7,85,154,.12); border-radius: 18px; background: #fff; box-shadow: 0 12px 34px rgba(7,85,154,.08); }.staggered-menu__account > span:nth-child(2) { display: grid; min-width: 0; gap: 3px; }.staggered-menu__account strong,.staggered-menu__account small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.staggered-menu__account strong { font-size: 14px; }.staggered-menu__account small { color: #718894; font-size: 11px; }.staggered-menu__account b { color: #07559a; font-size: 11px; }.staggered-menu__avatar { display: grid; width: 42px; height: 42px; place-items: center; color: #fff; border-radius: 14px; background: linear-gradient(135deg,#07559a,#20a875); font: 800 13px Manrope,sans-serif; }
.staggered-menu nav { display: grid; gap: 8px; margin-top: 28px; }.staggered-menu nav button { overflow: hidden; color: inherit; border: 0; background: none; text-align: left; }.staggered-menu__label { display: flex; align-items: start; justify-content: space-between; font: 800 clamp(34px,6vw,56px)/1 Manrope,sans-serif; letter-spacing: -.05em; }.staggered-menu__label small { margin-top: 5px; color: #168caa; font: 700 12px ui-monospace,monospace; letter-spacing: 0; }
.staggered-menu__footer { display: grid; gap: 16px; margin-top: auto; padding-top: 28px; color: #718894; font-size: 12px; }.staggered-menu__footer div { display: flex; flex-wrap: wrap; gap: 16px; }.staggered-menu__footer button { display: flex; justify-content: space-between; width: 100%; padding: 14px 0 0; color: #a33b42; font-weight: 800; text-align: left; border: 0; border-top: 1px solid rgba(18,50,74,.1); background: none; }
.staggered-menu button { cursor: pointer; }.staggered-menu button:focus-visible { outline: 2px solid #07559a; outline-offset: 3px; }.staggered-menu__account:hover { border-color: rgba(7,85,154,.28); box-shadow: 0 16px 38px rgba(7,85,154,.13); }.staggered-menu nav button:hover .staggered-menu__label { color: #07559a; }.staggered-menu__footer button:hover { color: #d32f3b; }
.open .staggered-menu__panel { transform: translateX(0); }.staggered-menu__account,.staggered-menu nav button,.staggered-menu__footer { opacity: 0; transform: translateY(24px) rotate(2deg); transition: opacity .35s ease,transform .55s cubic-bezier(.22,1,.36,1); }.open :is(.staggered-menu__account,.staggered-menu nav button,.staggered-menu__footer) { opacity: 1; transform: none; transition-delay: calc(.2s + var(--item-index) * .065s); }
@media (prefers-reduced-motion: reduce) { .staggered-menu__toggle i,.staggered-menu__layers i,.staggered-menu__panel,.staggered-menu__account,.staggered-menu nav button,.staggered-menu__footer { transition: none; } }
</style>
