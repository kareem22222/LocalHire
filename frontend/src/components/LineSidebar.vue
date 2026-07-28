<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ items: { type: Array, default: () => [] }, active: { type: Number, default: 0 } })
const emit = defineEmits(['select'])
const nodes = ref([])
const selected = ref(props.active)

watch(() => props.active, value => { selected.value = value })

function select(item, index) {
  selected.value = index
  emit('select', item, index)
}

function move(event) {
  nodes.value.forEach(node => {
    if (!node) return
    const rect = node.getBoundingClientRect()
    const distance = Math.abs(event.clientY - rect.top - rect.height / 2)
    node.style.setProperty('--effect', Math.max(0, 1 - distance / 110).toFixed(3))
  })
}

function reset() {
  nodes.value.forEach(node => node?.style.setProperty('--effect', 0))
}
</script>

<template>
  <nav class="line-sidebar" aria-label="Page sections" @pointermove="move" @pointerleave="reset">
    <button
      v-for="(item, index) in items"
      :key="item.label ?? item"
      :ref="el => nodes[index] = el"
      type="button"
      :class="{ active: selected === index }"
      @click="select(item, index)"
    >
      <span class="line-sidebar__marker"></span>
      <span class="line-sidebar__index">{{ String(index + 1).padStart(2, '0') }}</span>
      <span>{{ item.label ?? item }}</span>
    </button>
  </nav>
</template>

<style scoped>
.line-sidebar { display: grid; gap: 14px; padding: 16px 0; }
button { --effect: 0; position: relative; display: flex; align-items: baseline; gap: 8px; padding: 5px 8px 5px 54px; color: color-mix(in srgb,#07559a calc(var(--effect) * 100%),#718894); border: 0; background: none; text-align: left; transform: translateX(calc(var(--effect) * 18px)); transition: transform .08s linear; }
button.active { --effect: 1 !important; }
.line-sidebar__marker { position: absolute; top: 50%; left: 0; width: calc(36px + var(--effect) * 14px); height: 1px; background: currentColor; }
.line-sidebar__index { font: 700 10px ui-monospace,monospace; opacity: .7; }
</style>
