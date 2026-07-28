<script setup>
import { computed, reactive } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  withArrow: { type: Boolean, default: false },
  circleSize: { type: Number, default: 400 },
})

const mouse = reactive({ x: null, y: null })
const glowStyle = computed(() => ({
  width: `${props.circleSize}px`,
  height: `${props.circleSize}px`,
  left: `${mouse.x}px`,
  top: `${mouse.y}px`,
}))

function trackMouse(event) {
  const { left, top } = event.currentTarget.getBoundingClientRect()
  mouse.x = event.clientX - left
  mouse.y = event.clientY - top
}

function clearMouse() {
  mouse.x = null
  mouse.y = null
}
</script>

<template>
  <article
    class="animated-card"
    @pointermove="trackMouse"
    @pointerleave="clearMouse"
  >
    <span v-if="withArrow" class="animated-card__arrow" aria-hidden="true">↗</span>
    <span
      class="animated-card__glow"
      :class="{ 'animated-card__glow--visible': mouse.x !== null }"
      :style="glowStyle"
      aria-hidden="true"
    />
    <span class="animated-card__surface" aria-hidden="true" />
    <div class="animated-card__body">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <slot />
    </div>
  </article>
</template>

<style scoped>
.animated-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-width: 0;
  padding: 2px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.68);
  box-shadow: 0 16px 50px rgba(7, 85, 154, 0.08);
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.animated-card:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 22px 60px rgba(7, 85, 154, 0.14);
}

.animated-card:active {
  transform: scale(0.99);
}

.animated-card__glow {
  position: absolute;
  z-index: -2;
  border-radius: 50%;
  opacity: 0;
  background: var(--animated-card-glow, linear-gradient(135deg, #07559a, #0966ad));
  transform: translate(-50%, -50%);
  transition: opacity 180ms ease, transform 500ms ease;
}

.animated-card:hover .animated-card__glow {
  transform: translate(-50%, -50%) scale(3);
}

.animated-card__glow--visible {
  opacity: 1;
}

.animated-card__surface {
  position: absolute;
  z-index: -1;
  inset: 1px;
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.94);
}

.animated-card__body {
  height: 100%;
  padding: 24px;
}

.animated-card h2 {
  margin: 0;
  color: #0b3658;
  font-family: Manrope, sans-serif;
  font-size: 22px;
  font-weight: 800;
}

.animated-card p {
  margin: 14px 0 22px;
  color: #5d7482;
  font-size: 14px;
  line-height: 1.7;
}

.animated-card__arrow {
  position: absolute;
  z-index: 2;
  top: 14px;
  right: 16px;
  color: #526977;
  font-size: 20px;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 180ms ease, transform 180ms ease;
}

.animated-card:hover .animated-card__arrow {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .animated-card,
  .animated-card__glow,
  .animated-card__arrow {
    transition: none;
  }
}
</style>
