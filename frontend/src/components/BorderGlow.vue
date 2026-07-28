<script setup>
import { ref } from 'vue'

defineProps({ tag: { type: String, default: 'div' } })
const root = ref(null)

function track(event) {
  const rect = root.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const cx = rect.width / 2
  const cy = rect.height / 2
  const proximity = Math.max(Math.abs(x - cx) / cx, Math.abs(y - cy) / cy)
  root.value.style.setProperty('--edge-proximity', Math.min(proximity, 1).toFixed(3))
  root.value.style.setProperty('--cursor-angle', `${Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90}deg`)
}
</script>

<template>
  <component :is="tag" ref="root" class="border-glow" @pointermove="track" @pointerleave="root.style.setProperty('--edge-proximity', 0)">
    <span class="border-glow__light" aria-hidden="true"></span>
    <div class="border-glow__inner"><slot /></div>
  </component>
</template>

<style scoped>
.border-glow { --edge-proximity: 0; --cursor-angle: 45deg; position: relative; isolation: isolate; border: 1px solid rgba(18,50,74,.1); border-radius: 28px; background: rgba(255,255,255,.94); box-shadow: 0 18px 54px rgba(7,85,154,.08); }
.border-glow::before,.border-glow__light { content: ''; position: absolute; border-radius: inherit; pointer-events: none; opacity: var(--edge-proximity); transition: opacity .3s ease; }
.border-glow::before { inset: -1px; z-index: -1; padding: 1px; background: conic-gradient(from var(--cursor-angle),transparent 0 35%,#07559a,#26b8c7,#20a875,transparent 65%); mask: linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0); }
.border-glow__light { inset: -18px; z-index: -2; background: conic-gradient(from var(--cursor-angle),transparent 0 38%,rgba(38,184,199,.24),rgba(7,85,154,.18),transparent 62%); filter: blur(18px); }
.border-glow__inner { position: relative; z-index: 1; height: 100%; }
</style>
