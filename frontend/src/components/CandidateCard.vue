<script setup>
import { moveSpotlight, resetSpotlight } from '../utils/spotlightCard'

defineProps({
  candidate: { type: Object, required: true },
  // Marks the card as already shortlisted so the button reflects the state.
  shortlisted: { type: Boolean, default: false },
})

const emit = defineEmits(['shortlist', 'contact', 'select'])

function candidateLocation(candidate) {
  return [candidate.area, candidate.state].filter(Boolean).join(', ') || 'Location not shared'
}

function select(candidate) {
  emit('select', candidate)
}
</script>

<template>
  <article
    class="candidate-card candidate-card--clickable spotlight-card"
    @pointermove="moveSpotlight"
    @pointerleave="resetSpotlight"
    @pointercancel="resetSpotlight"
  >
    <button
      type="button"
      class="candidate-card__select"
      :aria-label="`View details for ${candidate.name}`"
      @click="select(candidate)"
    />
    <div class="candidate-card__avatar">{{ candidate.name?.slice(0, 1) }}</div>
    <div class="candidate-card__body">
      <div class="candidate-card__top">
        <div>
          <h3>{{ candidate.name }}</h3>
          <p>{{ candidate.role ? `${candidate.role} - ` : '' }}{{ candidateLocation(candidate) }}</p>
        </div>
        <span v-if="candidate.matchScore != null">{{ candidate.matchScore }}% match</span>
      </div>

      <div class="candidate-card__meta">
        <span v-if="candidate.distanceKm != null">{{ candidate.distanceKm }} km away</span>
        <span v-if="candidate.pincode">PIN {{ candidate.pincode }}</span>
        <span v-if="candidate.role">{{ candidate.role }}</span>
      </div>
    </div>
    <div class="candidate-actions">
      <button
        type="button"
        :disabled="shortlisted"
        @click.stop="$emit('shortlist', candidate)"
      >
        {{ shortlisted ? 'Shortlisted' : 'Shortlist' }}
      </button>
      <button type="button" class="candidate-actions__ghost" @click.stop="$emit('contact', candidate)">Contact</button>
    </div>
  </article>
</template>

<style scoped>
.candidate-card--clickable {
  position: relative;
  cursor: pointer;
  transition: box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
}

.candidate-card__select {
  position: absolute;
  inset: 0;
  z-index: 1;
  border: 0;
  border-radius: inherit;
  background: transparent;
  cursor: pointer;
}

.candidate-card--clickable:hover {
  border-color: rgba(7, 85, 154, 0.35);
  box-shadow: 0 16px 40px rgba(7, 85, 154, 0.12);
  transform: perspective(900px) rotateX(var(--spotlight-rx)) rotateY(var(--spotlight-ry)) translateY(-2px);
}

.candidate-card__select:focus-visible {
  outline: 3px solid rgba(7, 85, 154, 0.3);
  outline-offset: 2px;
}

.candidate-actions {
  position: relative;
  z-index: 2;
}

.candidate-actions button:disabled {
  opacity: 0.75;
  cursor: default;
  box-shadow: none;
}
</style>
