<script setup>
import { computed, ref } from 'vue'
import { roleIconHref } from '../utils/roleIcon'

defineProps({
  item: { type: Object, required: true },
  actionLabel: { type: String, required: true },
  countsClickable: { type: Boolean, default: false },
})

defineEmits(['view', 'action', 'view-applicants', 'view-shortlisted'])

const hovered = ref(false)
const focused = ref(false)
const flipped = computed(() => hovered.value || focused.value)

function onFocusOut(event) {
  focused.value = event.currentTarget.contains(event.relatedTarget)
}
</script>

<template>
  <article
    class="hiring-role-card"
    :class="{ 'hiring-role-card--flipped': flipped }"
    :aria-label="item.title"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="focused = true"
    @focusout="onFocusOut"
  >
    <div class="hiring-role-card__inner">
      <div class="hiring-role-card__face hiring-role-card__front" :aria-hidden="flipped">
        <span class="hiring-role-card__status">{{ item.status }}</span>

        <div class="hiring-role-card__visual" aria-hidden="true">
          <span>
            <svg viewBox="0 0 24 24"><use :href="roleIconHref(item.title)" /></svg>
          </span>
        </div>

        <div class="hiring-role-card__footer">
          <div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.workplaceName ? `${item.workplaceName} - ${item.area}` : item.area }}</p>
          </div>
          <span class="hiring-role-card__zap" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
          </span>
        </div>
      </div>

      <div class="hiring-role-card__face hiring-role-card__back" :aria-hidden="!flipped">
        <div class="hiring-role-card__back-head">
          <button
            type="button"
            class="hiring-role-card__icon"
            :aria-label="`View details for ${item.title}`"
            title="View details"
            @click="$emit('view', item.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
          </button>
          <h3>{{ item.title }}</h3>
        </div>
        <p>Review and move the right candidates forward.</p>

        <div class="hiring-role-card__stats">
          <button
            type="button"
            class="hiring-role-card__stat"
            :class="{ 'hiring-role-card__stat--static': !countsClickable }"
            :disabled="!countsClickable"
            :aria-label="`View ${item.applicants} applicants for ${item.title}`"
            @click="$emit('view-applicants', item.id)"
          >
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            </span>
            <span><strong>{{ item.applicants }}</strong> applicants</span>
          </button>
          <button
            type="button"
            class="hiring-role-card__stat"
            :class="{ 'hiring-role-card__stat--static': !countsClickable }"
            :disabled="!countsClickable"
            :aria-label="`View ${item.shortlisted} shortlisted for ${item.title}`"
            @click="$emit('view-shortlisted', item.id)"
          >
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
            <span><strong>{{ item.shortlisted }}</strong> shortlisted</span>
          </button>
        </div>

        <button
          type="button"
          class="hiring-role-card__link"
          @click="$emit('action', item.id)"
        >
          <span>{{ actionLabel }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.hiring-role-card {
  --role-card-accent: #07559a;
  position: relative;
  width: 100%;
  max-width: 300px;
  height: 360px;
  padding: 0;
  justify-self: center;
  overflow: hidden;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  perspective: 2000px;
  outline: none;
}

.hiring-role-card:focus-visible {
  outline: 3px solid rgba(7, 85, 154, 0.28);
  outline-offset: 2px;
}

.hiring-role-card__inner {
  display: block;
  width: 100%;
  height: 100%;
  margin: 0;
  transform-style: preserve-3d;
  transition: transform 700ms ease;
}

.hiring-role-card--flipped .hiring-role-card__inner {
  transform: rotateY(180deg);
}

.hiring-role-card__face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 20px;
  margin: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(7, 85, 154, 0.05), transparent 46%, rgba(48, 128, 255, 0.05)),
    linear-gradient(135deg, #ffffff, #f8fafc 52%, #f1f5f9);
  box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.1);
  backface-visibility: hidden;
  transition: opacity 700ms ease, border-color 700ms ease, box-shadow 700ms ease;
}

.hiring-role-card:hover .hiring-role-card__face,
.hiring-role-card:focus-within .hiring-role-card__face {
  border-color: rgba(7, 85, 154, 0.24);
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.1);
}

.hiring-role-card__front {
  display: block;
  opacity: 1;
}

.hiring-role-card__back {
  display: flex;
  pointer-events: none;
  flex-direction: column;
  transform: rotateY(180deg);
  opacity: 0;
}

.hiring-role-card--flipped .hiring-role-card__front {
  opacity: 0;
  pointer-events: none;
}

.hiring-role-card--flipped .hiring-role-card__back {
  opacity: 1;
  pointer-events: auto;
}

.hiring-role-card__status {
  position: relative;
  z-index: 1;
  display: inline-flex;
  padding: 7px 10px;
  color: var(--role-card-accent);
  border-radius: 999px;
  background: rgba(7, 85, 154, 0.08);
  font-size: 11px;
  font-weight: 800;
}

.hiring-role-card__visual {
  position: absolute;
  top: 48%;
  left: 50%;
  display: flex;
  width: 200px;
  height: 100px;
  padding: 0;
  align-items: center;
  justify-content: center;
  margin: 0;
  grid-template-columns: none;
  transform: translate(-50%, -50%);
}

.hiring-role-card__visual > span {
  z-index: 1;
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  position: absolute;
  inset: 0;
  margin: auto;
  color: #fff;
  border-radius: 17px;
  background: linear-gradient(135deg, #07559a, #0966ad 56%, #0877c9);
  box-shadow: 0 10px 15px -3px rgba(7, 85, 154, 0.25);
  transition: transform 500ms ease;
}

.hiring-role-card:hover .hiring-role-card__visual > span,
.hiring-role-card:focus-within .hiring-role-card__visual > span {
  transform: scale(1.1) rotate(12deg);
}

.hiring-role-card__visual svg {
  width: 36px;
  height: 36px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hiring-role-card__footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
  margin: 0;
}

.hiring-role-card__footer > div {
  display: grid;
  min-width: 0;
  gap: 6px;
  margin: 0;
  grid-template-columns: 1fr;
  transition: transform 500ms ease;
}

.hiring-role-card:hover .hiring-role-card__footer > div,
.hiring-role-card:focus-within .hiring-role-card__footer > div {
  transform: translateY(-4px);
}

.hiring-role-card__zap,
.hiring-role-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--role-card-accent);
  transition: transform 300ms ease, background 300ms ease;
}

.hiring-role-card__icon {
  width: 32px;
  height: 32px;
  color: #fff;
  border-radius: 8px;
  background: linear-gradient(135deg, #07559a, #0966ad 56%, #0877c9);
  cursor: pointer;
}

.hiring-role-card__icon:hover,
.hiring-role-card__icon:focus-visible {
  transform: scale(1.1) rotate(12deg);
  outline: none;
}

.hiring-role-card__zap svg,
.hiring-role-card__icon svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hiring-role-card__back-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  grid-template-columns: none;
}

.hiring-role-card__back-head svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hiring-role-card__back > p {
  position: relative;
  z-index: 1;
  min-height: 40px;
  margin: 0;
  line-height: 1.45;
}

.hiring-role-card__stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-top: 20px;
}

.hiring-role-card__stat {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  text-align: left;
  color: #334155;
  border: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  transform: translateX(-10px);
  transition: color 300ms ease, opacity 500ms ease, transform 500ms ease;
}

.hiring-role-card--flipped .hiring-role-card__stat {
  opacity: 1;
  transform: translateX(0);
}

.hiring-role-card--flipped .hiring-role-card__stat:nth-child(1) { transition-delay: 200ms; }
.hiring-role-card--flipped .hiring-role-card__stat:nth-child(2) { transition-delay: 300ms; }

.hiring-role-card__stat > span:first-child {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 24px;
  height: 24px;
  margin: 0;
  color: var(--role-card-accent);
  border-radius: 6px;
  background: rgba(7, 85, 154, 0.1);
}

.hiring-role-card__stat svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hiring-role-card__stat:hover:not(.hiring-role-card__stat--static) {
  color: var(--role-card-accent);
}

.hiring-role-card__stat:focus-visible {
  outline: 3px solid rgba(7, 85, 154, 0.28);
  outline-offset: 2px;
}

.hiring-role-card__stat--static {
  cursor: default;
  opacity: 0.62;
}

.hiring-role-card__stats strong {
  color: inherit;
  font: inherit;
  font-weight: 800;
}

.hiring-role-card__link {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  align-self: stretch;
  min-height: 44px;
  margin-top: auto;
  padding: 10px;
  color: #0f172a;
  border: 1px solid transparent;
  border-top-color: #e2e8f0;
  border-radius: 8px;
  background: linear-gradient(90deg, #f1f5f9, #f1f5f9, #f1f5f9);
  cursor: pointer;
  transition: color 300ms ease, border-color 300ms ease, background 300ms ease, transform 300ms ease;
}

.hiring-role-card__link:hover,
.hiring-role-card__link:focus-visible {
  color: var(--role-card-accent);
  border-color: rgba(7, 85, 154, 0.2);
  background: linear-gradient(90deg, rgba(7, 85, 154, 0.1), rgba(7, 85, 154, 0.05), transparent);
  outline: none;
  transform: scale(1.02);
}

.hiring-role-card__link svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--role-card-accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 300ms ease;
}

.hiring-role-card__link:hover svg,
.hiring-role-card__link:focus-visible svg {
  transform: translateX(4px) scale(1.1);
}

@media (prefers-reduced-motion: reduce) {
  .hiring-role-card__inner,
  .hiring-role-card__face,
  .hiring-role-card__visual > span,
  .hiring-role-card__footer > div,
  .hiring-role-card__stat,
  .hiring-role-card__link,
  .hiring-role-card__link svg {
    transition: none;
  }

}
</style>
