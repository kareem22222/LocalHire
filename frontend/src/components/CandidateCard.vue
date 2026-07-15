<script setup>
defineProps({
  candidate: { type: Object, required: true },
})

defineEmits(['shortlist'])

function candidateLocation(candidate) {
  return [candidate.area, candidate.state].filter(Boolean).join(', ') || 'Location not shared'
}
</script>

<template>
  <article class="candidate-card">
    <div class="candidate-card__avatar">{{ candidate.name.slice(0, 1) }}</div>
    <div class="candidate-card__body">
      <div class="candidate-card__top">
        <div>
          <h3>{{ candidate.name }}</h3>
          <p>{{ candidate.role ? `${candidate.role} - ` : '' }}{{ candidateLocation(candidate) }}</p>
        </div>
        <span>{{ candidate.matchScore }}% match</span>
      </div>

      <div class="candidate-card__meta">
        <span v-if="candidate.distanceKm != null">{{ candidate.distanceKm }} km away</span>
        <span v-if="candidate.pincode">PIN {{ candidate.pincode }}</span>
        <span v-if="candidate.role">{{ candidate.role }}</span>
      </div>
    </div>
    <div class="candidate-actions">
      <button type="button" @click="$emit('shortlist', candidate)">Shortlist</button>
      <button type="button" class="candidate-actions__ghost">Interview</button>
    </div>
  </article>
</template>
