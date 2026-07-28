<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ items: { type: Array, default: () => [] } })
const emit = defineEmits(['select'])
const selected = ref(-1)
const list = ref(null)
const topFade = ref(0)
const bottomFade = ref(1)

function choose(index, event) {
  if (event?.target.closest('button, a, input, select, textarea')) return
  const item = props.items[index]
  if (item === undefined) return
  selected.value = index
  emit('select', item, index)
}

function onKeydown(event) {
  if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return
  if (event.key === 'Enter' && event.target.closest('button, a, input, select, textarea')) return
  event.preventDefault()
  if (event.key === 'Enter') return selected.value >= 0 && choose(selected.value)
  if (!props.items.length) return
  selected.value = event.key === 'ArrowDown'
    ? Math.min(selected.value + 1, props.items.length - 1)
    : Math.max(selected.value - 1, 0)
  list.value?.querySelector(`[data-index="${selected.value}"]`)?.scrollIntoView?.({ block: 'nearest' })
}

watch(() => props.items, (items) => {
  selected.value = items.length ? Math.min(selected.value, items.length - 1) : -1
})

function onScroll(event) {
  const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
  topFade.value = Math.min(scrollTop / 40, 1)
  bottomFade.value = Math.min((scrollHeight - scrollTop - clientHeight) / 40, 1)
}
</script>

<template>
  <div class="animated-list">
    <ul ref="list" class="animated-list__scroller" @keydown="onKeydown" @scroll="onScroll">
      <li
        v-for="(item, index) in items"
        :key="item.id ?? item.label ?? index"
        class="animated-list__item"
        :aria-current="selected === index ? 'true' : undefined"
        :class="{ selected: selected === index }"
        :data-index="index"
        @mouseenter="selected = index"
        @click="choose(index, $event)"
      >
        <slot :item="item" :index="index">{{ item.label ?? item }}</slot>
      </li>
    </ul>
    <span class="animated-list__fade animated-list__fade--top" :style="{ opacity: topFade }"></span>
    <span class="animated-list__fade animated-list__fade--bottom" :style="{ opacity: bottomFade }"></span>
  </div>
</template>

<style scoped>
.animated-list { position: relative; min-width: 0; }
.animated-list__scroller { display: grid; gap: 10px; max-height: 420px; margin: 0; padding: 6px; overflow-y: auto; list-style: none; scrollbar-color: #9abac8 #edf5f7; }
.animated-list__item { width: 100%; padding: 14px 16px; color: inherit; text-align: left; border: 1px solid rgba(18,50,74,.1); border-radius: 14px; background: rgba(255,255,255,.92); box-shadow: 0 8px 24px rgba(7,85,154,.05); animation: list-arrive .35s both; }
.animated-list__item.selected { border-color: rgba(7,85,154,.35); background: #eef8fb; transform: translateX(4px); }
.animated-list__fade { position: absolute; left: 0; right: 0; z-index: 2; height: 48px; pointer-events: none; }
.animated-list__fade--top { top: 0; background: linear-gradient(#fff,transparent); }
.animated-list__fade--bottom { bottom: 0; background: linear-gradient(transparent,#fff); }
@keyframes list-arrive { from { opacity: 0; transform: scale(.96) translateY(8px); } }
</style>
