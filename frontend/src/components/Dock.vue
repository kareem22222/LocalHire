<script setup>
import { ref } from 'vue'

defineProps({ items: { type: Array, default: () => [] } })
const emit = defineEmits(['select'])
const buttons = ref([])

function magnify(event) {
  for (const button of buttons.value) {
    if (!button) continue
    const rect = button.getBoundingClientRect()
    const distance = Math.abs(event.clientX - rect.left - rect.width / 2)
    button.style.setProperty('--dock-scale', 1 + Math.max(0, 1 - distance / 120) * 0.28)
  }
}

function reset() {
  buttons.value.forEach(button => button?.style.removeProperty('--dock-scale'))
}
</script>

<template>
  <div class="dock-panel" role="toolbar" aria-label="Application dock" @pointermove="magnify" @pointerleave="reset">
    <button
      v-for="(item, index) in items"
      :key="item.label"
      :ref="el => buttons[index] = el"
      type="button"
      class="dock-item"
      :role="item.role || 'button'"
      :aria-checked="item.checked"
      :aria-label="item.label"
      @click="emit('select', item, index)"
    >
      <span class="dock-icon" aria-hidden="true">{{ item.icon }}</span>
      <span class="dock-label" role="tooltip">{{ item.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.dock-panel { display: flex; align-items: center; gap: 7px; padding: 6px; border: 1px solid rgba(18,50,74,.12); border-radius: 16px; background: #edf4f7; }
.dock-item { --dock-scale: 1; position: relative; display: grid; width: 38px; height: 38px; place-items: center; color: #526977; border: 0; border-radius: 11px; background: #fff; transform: scale(var(--dock-scale)); transform-origin: bottom center; transition: transform .12s ease, background .2s ease; }
.dock-item:focus-visible { outline: 3px solid rgba(7,85,154,.3); outline-offset: 2px; }
.dock-icon { font-size: 18px; }
.dock-label { position: absolute; left: 50%; bottom: calc(100% + 10px); padding: 4px 7px; color: #fff; border-radius: 6px; background: #0b1821; font-size: 10px; white-space: nowrap; opacity: 0; pointer-events: none; transform: translate(-50%,5px); transition: .18s ease; }
.dock-item:is(:hover,:focus-visible) .dock-label { opacity: 1; transform: translate(-50%,0); }
</style>
