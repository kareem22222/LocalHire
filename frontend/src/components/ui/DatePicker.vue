<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, default: undefined },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  placeholder: { type: String, default: 'Select date' },
  ariaLabel: { type: String, default: 'Choose date' },
})
const emit = defineEmits(['update:modelValue'])
const root = ref(null)
const input = ref(null)
const open = ref(false)
const focusedDate = ref('')

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null
}
function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}
function addMonths(date, amount) {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  target.setDate(Math.min(date.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()))
  return target
}

const today = new Date()
const selectedDate = computed(() => parseDate(props.modelValue))
const viewMonth = ref(new Date(selectedDate.value?.getFullYear() ?? today.getFullYear(), selectedDate.value?.getMonth() ?? today.getMonth(), 1))
const pickerId = props.id || `date-picker-${useId()}`
const panelId = `${pickerId}-panel`
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long' })
const dateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const ariaFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' })
const displayValue = computed(() => selectedDate.value ? dateFormatter.format(selectedDate.value) : '')
const monthOptions = Array.from({ length: 12 }, (_, value) => ({ value, label: monthFormatter.format(new Date(2020, value, 1)) }))
const years = computed(() => {
  const min = parseDate(props.min)?.getFullYear() ?? today.getFullYear() - 100
  const max = parseDate(props.max)?.getFullYear() ?? today.getFullYear() + 20
  return Array.from({ length: max - min + 1 }, (_, index) => max - index)
})
const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + index)))
const days = computed(() => {
  const first = new Date(viewMonth.value.getFullYear(), viewMonth.value.getMonth(), 1)
  const gridStart = addDays(first, -((first.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
})

watch(() => props.modelValue, (value) => {
  const date = parseDate(value)
  if (date) viewMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
})
function isDisabled(date) {
  const key = dateKey(date)
  return Boolean((props.min && key < props.min) || (props.max && key > props.max))
}
function focusDate(date) {
  if (!date) return
  focusedDate.value = dateKey(date)
  nextTick(() => root.value?.querySelector(`[data-date='${focusedDate.value}']`)?.focus())
}
function show() {
  const date = selectedDate.value || today
  viewMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
  open.value = true
  focusDate(isDisabled(date) ? days.value.find((day) => !isDisabled(day)) : date)
}
function close(restoreFocus = false) {
  open.value = false
  if (restoreFocus) nextTick(() => input.value?.focus())
}
function select(date) {
  if (isDisabled(date)) return
  emit('update:modelValue', dateKey(date))
  close(true)
}
function clear() {
  emit('update:modelValue', '')
  close(true)
}
function setMonth(month) { viewMonth.value = new Date(viewMonth.value.getFullYear(), Number(month), 1) }
function setYear(year) { viewMonth.value = new Date(Number(year), viewMonth.value.getMonth(), 1) }
function moveMonth(amount) { viewMonth.value = addMonths(viewMonth.value, amount) }
function focusAvailable(preferredDate, direction) {
  let next = preferredDate
  for (let tries = 0; tries < 366; tries += 1) {
    if (!isDisabled(next)) break
    next = addDays(next, direction)
  }
  if (isDisabled(next)) return
  if (next.getMonth() !== viewMonth.value.getMonth() || next.getFullYear() !== viewMonth.value.getFullYear()) viewMonth.value = new Date(next.getFullYear(), next.getMonth(), 1)
  focusDate(next)
}
function onDayKeydown(event, date) {
  const weekday = (date.getDay() + 6) % 7
  const moves = {
    ArrowLeft: () => focusAvailable(addDays(date, -1), -1), ArrowRight: () => focusAvailable(addDays(date, 1), 1),
    ArrowUp: () => focusAvailable(addDays(date, -7), -1), ArrowDown: () => focusAvailable(addDays(date, 7), 1),
    Home: () => focusAvailable(addDays(date, -weekday), 1), End: () => focusAvailable(addDays(date, 6 - weekday), -1),
    PageUp: () => focusAvailable(addMonths(date, -1), -1), PageDown: () => focusAvailable(addMonths(date, 1), 1),
  }
  if (!moves[event.key]) return
  event.preventDefault()
  moves[event.key]()
}
function onDocumentPointerDown(event) { if (open.value && !root.value?.contains(event.target)) close() }
function onDocumentKeydown(event) { if (open.value && event.key === 'Escape') close(true) }
onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <div ref="root" class="date-picker">
    <div class="date-picker__field">
      <input
        :id="id"
        ref="input"
        :aria-controls="panelId"
        :aria-expanded="open"
        :aria-label="ariaLabel"
        aria-haspopup="dialog"
        :placeholder="placeholder"
        readonly
        role="combobox"
        type="text"
        :value="displayValue"
        @click="show"
        @input="emit('update:modelValue', parseDate($event.target.value) ? $event.target.value : modelValue)"
      />
      <button :aria-label="ariaLabel" class="date-picker__trigger" type="button" @click="open ? close(true) : show()">
        <span aria-hidden="true" class="date-picker__icon"></span>
      </button>
    </div>

    <Transition name="date-picker">
      <dialog v-if="open" :id="panelId" :aria-label="ariaLabel" class="date-picker__panel" open>
        <div class="date-picker__header">
          <select :aria-label="`Month for ${ariaLabel}`" :value="viewMonth.getMonth()" @change="setMonth($event.target.value)">
            <option v-for="month in monthOptions" :key="month.value" :value="month.value">{{ month.label }}</option>
          </select>
          <select :aria-label="`Year for ${ariaLabel}`" :value="viewMonth.getFullYear()" @change="setYear($event.target.value)">
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
          <div class="date-picker__nav">
            <button aria-label="Previous month" type="button" @click="moveMonth(-1)">‹</button>
            <button aria-label="Next month" type="button" @click="moveMonth(1)">›</button>
          </div>
        </div>

        <div aria-hidden="true" class="date-picker__weekdays">
          <span v-for="(weekday, index) in weekdayLabels" :key="index">{{ weekday }}</span>
        </div>
        <div class="date-picker__grid">
          <button
            v-for="day in days"
            :key="dateKey(day)"
            :aria-current="dateKey(day) === dateKey(today) ? 'date' : undefined"
            :aria-label="ariaFormatter.format(day)"
            :aria-pressed="dateKey(day) === modelValue"
            :class="{
              'date-picker__day--outside': day.getMonth() !== viewMonth.getMonth(),
              'date-picker__day--selected': dateKey(day) === modelValue,
              'date-picker__day--today': dateKey(day) === dateKey(today),
            }"
            :data-date="dateKey(day)"
            :disabled="isDisabled(day)"
            :tabindex="dateKey(day) === (focusedDate || modelValue || dateKey(today)) ? 0 : -1"
            type="button"
            @click="select(day)"
            @focus="focusedDate = dateKey(day)"
            @keydown="onDayKeydown($event, day)"
          >
            {{ day.getDate() }}
          </button>
        </div>

        <div class="date-picker__footer">
          <button :disabled="isDisabled(today)" type="button" @click="select(today)">Today</button>
          <button v-if="modelValue" type="button" @click="clear">Clear</button>
        </div>
      </dialog>
    </Transition>
  </div>
</template>

<style scoped>
.date-picker { position: relative; width: 100%; }
.date-picker__field { position: relative; }
.date-picker__field input {
  width: 100%; padding: 11px 42px 11px 13px; color: #12324a; font: inherit;
  border: 1.5px solid rgba(18, 50, 74, .12); border-radius: 9px; background: #fff; cursor: pointer;
}
.date-picker__field input:focus {
  outline: none; border-color: var(--worker-role-green-end, #148554);
  box-shadow: 0 0 0 3px rgba(var(--worker-role-green-rgb, 20, 133, 84), .1);
}
.date-picker__trigger {
  position: absolute; top: 50%; right: 5px; display: grid; width: 34px; height: 34px; padding: 0;
  place-items: center; color: #526977; background: transparent; border: 0; border-radius: 7px;
  cursor: pointer; transform: translateY(-50%);
}
.date-picker__trigger:hover { color: #126c49; background: #edf6f2; }
.date-picker__trigger:focus-visible { outline: 2px solid #148554; outline-offset: 1px; }
.date-picker__icon { position: relative; width: 16px; height: 15px; border: 1.7px solid currentColor; border-radius: 3px; }
.date-picker__icon::before {
  position: absolute; top: 3px; left: -1.7px; width: 16px; border-top: 1.7px solid currentColor; content: '';
}
.date-picker__icon::after {
  position: absolute; top: -3px; left: 3px; width: 6px; height: 4px;
  border-right: 1.7px solid currentColor; border-left: 1.7px solid currentColor; content: '';
}
.date-picker__panel {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 50;
  width: min(312px, calc(100vw - 32px)); margin: 0; padding: 14px; color: #12324a; background: #fff;
  border: 1px solid rgba(18, 50, 74, .12); border-radius: 14px; box-shadow: 0 18px 45px rgba(18, 50, 74, .16);
}
.date-picker__header { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.date-picker__header select {
  min-width: 0; height: 34px; padding: 0 7px; color: #12324a; font: 700 13px inherit;
  background: #f6faf8; border: 1px solid rgba(18, 50, 74, .1); border-radius: 7px;
}
.date-picker__header select:first-child { flex: 1; }
.date-picker__nav { display: flex; margin-left: auto; gap: 2px; }
.date-picker__nav button {
  width: 32px; height: 32px; padding: 0; color: #526977; font: 500 24px/1 inherit;
  background: transparent; border: 0; border-radius: 50%; cursor: pointer;
}
.date-picker__nav button:hover { color: #12324a; background: #edf6f2; }
.date-picker__weekdays, .date-picker__grid { display: grid; grid-template-columns: repeat(7, 1fr); }
.date-picker__weekdays { margin-bottom: 4px; }
.date-picker__weekdays span {
  color: #738895; font-size: 10px; font-weight: 700; text-align: center; text-transform: uppercase;
}
.date-picker__grid button {
  position: relative; display: grid; width: 36px; height: 36px; max-width: 100%; margin: 1px auto; padding: 0;
  place-items: center; color: #12324a; font: 600 12px inherit; background: transparent;
  border: 0; border-radius: 9px; cursor: pointer;
}
.date-picker__grid button:hover:not(:disabled) { background: #edf6f2; }
.date-picker__grid button:focus-visible { outline: 2px solid #148554; outline-offset: 1px; }
.date-picker__grid button:disabled { color: #aebbc2; cursor: not-allowed; text-decoration: line-through; }
.date-picker__day--outside { color: #9eacb4 !important; }
.date-picker__day--selected {
  color: #fff !important; background: var(--worker-role-green-end, #148554) !important;
  box-shadow: 0 5px 14px rgba(20, 133, 84, .24);
}
.date-picker__day--today:not(.date-picker__day--selected)::after {
  position: absolute; bottom: 4px; width: 4px; height: 4px; background: #148554; border-radius: 50%; content: '';
}
.date-picker__footer {
  display: flex; justify-content: space-between; min-height: 27px; margin-top: 9px; padding-top: 9px;
  border-top: 1px solid rgba(18, 50, 74, .08);
}
.date-picker__footer button {
  padding: 5px 8px; color: #126c49; font: 700 12px inherit; background: transparent;
  border: 0; border-radius: 6px; cursor: pointer;
}
.date-picker__footer button:hover:not(:disabled) { background: #edf6f2; }
.date-picker__footer button:disabled { color: #aebbc2; cursor: not-allowed; }
.date-picker-enter-active, .date-picker-leave-active { transition: opacity .16s ease, transform .16s ease; }
.date-picker-enter-from, .date-picker-leave-to { opacity: 0; transform: translateY(-4px); }
@media (prefers-reduced-motion: reduce) {
  .date-picker-enter-active, .date-picker-leave-active { transition: none; }
}
</style>
