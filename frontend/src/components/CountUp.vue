<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  from: { type: Number, default: 0 },
  to: { type: Number, required: true },
  duration: { type: Number, default: 0.5 },
  delay: { type: Number, default: 0 },
  immediate: { type: Boolean, default: false },
  separator: { type: String, default: ',' },
  suffix: { type: String, default: '' },
})

const value = ref(props.from)
const root = ref(null)
let frame
let observer
let timer

function format(number) {
  const rounded = Math.round(number)
  return `${props.separator ? rounded.toLocaleString('en-US').replaceAll(',', props.separator) : rounded}${props.suffix}`
}

function start() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    value.value = props.to
    return
  }
  const started = performance.now()
  const tick = (now) => {
    const progress = Math.min((now - started) / (props.duration * 1000), 1)
    value.value = props.from + (props.to - props.from) * (1 - (1 - progress) ** 3)
    if (progress < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

function scheduleStart() {
  if (!props.delay || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return start()
  timer = setTimeout(start, props.delay * 1000)
}

onMounted(() => {
  if (props.immediate) return scheduleStart()
  if (typeof IntersectionObserver === 'undefined') return scheduleStart()
  observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return
    observer.disconnect()
    scheduleStart()
  })
  observer.observe(root.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(timer)
  cancelAnimationFrame(frame)
})
</script>

<template><span ref="root">{{ format(value) }}</span></template>
