<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  steps: { type: Array, required: true },
  initialStep: { type: Number, default: 1 },
  interactive: { type: Boolean, default: true },
  showControls: { type: Boolean, default: true },
})
const emit = defineEmits(['change', 'complete'])
const initialStep = Math.trunc(props.initialStep) || 1
const current = ref(props.steps.length ? Math.min(Math.max(initialStep, 1), props.steps.length) : 0)
const step = computed(() => props.steps[current.value - 1])

function setStep(value, force = false) {
  if (!Number.isInteger(value) || value < 1 || value > props.steps.length) return
  if (!force && !props.interactive && value > current.value) return
  current.value = value
  emit('change', value)
}

function next() {
  if (!props.steps.length) return
  if (current.value === props.steps.length) return emit('complete')
  setStep(current.value + 1, true)
}

function back() {
  setStep(current.value - 1, true)
}

defineExpose({ next, back, setStep })
</script>

<template>
  <section class="stepper" aria-label="Steps">
    <div class="stepper__indicators">
      <template v-for="(_, index) in steps" :key="index">
        <button type="button" :class="{ active: current === index + 1, complete: current > index + 1 }" :aria-current="current === index + 1 ? 'step' : undefined" :aria-label="`Step ${index + 1}`" :disabled="!interactive && current < index + 1" @click="setStep(index + 1)">
          <span>{{ current > index + 1 ? '✓' : index + 1 }}</span>
        </button>
        <i v-if="index < steps.length - 1" :class="{ complete: current > index + 1 }"></i>
      </template>
    </div>
    <Transition name="step" mode="out-in">
      <div v-if="step" :key="current" class="stepper__content">
        <slot name="content" :step="step" :current="current">
          <span>0{{ current }} / 0{{ steps.length }}</span>
          <h3>{{ step.title }}</h3>
          <p>{{ step.description }}</p>
        </slot>
      </div>
    </Transition>
    <footer v-if="steps.length && (showControls || $slots.actions)">
      <slot name="actions" :current="current" :back="back" :next="next">
        <template v-if="showControls">
          <button v-if="current > 1" type="button" class="stepper__back" @click="back">Previous</button>
          <button type="button" class="stepper__next" @click="next">{{ current === steps.length ? 'Complete' : 'Next' }}</button>
        </template>
      </slot>
    </footer>
  </section>
</template>

<style scoped>
.stepper { padding: clamp(24px,4vw,42px); border: 1px solid rgba(18,50,74,.1); border-radius: 26px; background: rgba(255,255,255,.94); box-shadow: 0 20px 60px rgba(7,85,154,.09); }
.stepper__indicators { display: flex; align-items: center; }
.stepper__indicators button { flex: 0 0 auto; width: 34px; height: 34px; color: #718894; border: 1px solid #c9d9e0; border-radius: 50%; background: #f3f8fa; }
.stepper__indicators button.active,.stepper__indicators button.complete { color: #fff; border-color: transparent; background: linear-gradient(135deg,#07559a,#20a875); }
.stepper__indicators i { height: 2px; flex: 1; background: #d8e4e9; }
.stepper__indicators i.complete { background: #168caa; }
.stepper__content { min-height: 180px; padding: 38px 4px 20px; }
.stepper__content > span { color: #07559a; font: 700 11px ui-monospace,monospace; }
.stepper h3 { margin: 12px 0; color: #12324a; font: 800 clamp(26px,4vw,42px) Manrope,sans-serif; }
.stepper p { max-width: 620px; color: #5d7482; line-height: 1.7; }
.stepper footer { display: flex; justify-content: flex-end; gap: 10px; }
.stepper footer button { padding: 10px 18px; border-radius: 999px; }
.stepper__back { color: #526977; border: 1px solid #c9d9e0; background: transparent; }
.stepper__next { color: #fff; border: 0; background: linear-gradient(135deg,#07559a,#20a875); }
.step-enter-active,.step-leave-active { transition: .22s ease; }.step-enter-from { opacity: 0; transform: translateX(18px); }.step-leave-to { opacity: 0; transform: translateX(-18px); }
</style>
