<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({ text: { type: String, required: true } })
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const displayed = ref(props.text)
let frame
let timer

function tick(step = 0) {
  const revealed = Math.floor(step / 2)
  displayed.value = [...props.text].map((character, index) => {
    if (character === ' ' || index < revealed) return character
    return characters[Math.floor(Math.random() * characters.length)]
  }).join('')

  if (revealed >= props.text.length) {
    displayed.value = props.text
    return
  }
  timer = setTimeout(() => tick(step + 1), 34)
}

onMounted(() => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return
  frame = requestAnimationFrame(() => tick())
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  clearTimeout(timer)
})
</script>

<template>
  <span :aria-label="text"><span aria-hidden="true">{{ displayed }}</span></span>
</template>
