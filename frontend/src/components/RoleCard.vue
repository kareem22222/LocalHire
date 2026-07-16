<script setup>
defineProps({
  item: { type: Object, required: true },
  actionLabel: { type: String, required: true },
  // When true the applicant/shortlisted counts become clickable buttons that
  // emit view-applicants / view-shortlisted. Pages that only need a static
  // summary (e.g. the "all roles" list) can leave this off.
  countsClickable: { type: Boolean, default: false },
})

defineEmits(['view', 'action', 'view-applicants', 'view-shortlisted'])
</script>

<template>
  <article class="hiring-role-card">
    <div class="hiring-role-card__actions">
      <button
        type="button"
        class="hiring-role-card__icon"
        :aria-label="`View details for ${item.title}`"
        title="View details"
        @click="$emit('view', item.id)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
    </div>
    <span>{{ item.status }}</span>
    <h3>{{ item.title }}</h3>
    <p>{{ item.workplaceName ? `${item.workplaceName} - ${item.area}` : item.area }}</p>
    <div class="hiring-role-card__stats">
      <button
        type="button"
        class="hiring-role-card__stat"
        :class="{ 'hiring-role-card__stat--static': !countsClickable }"
        :disabled="!countsClickable"
        :aria-label="`View ${item.applicants} applicants for ${item.title}`"
        @click="$emit('view-applicants', item.id)"
      >
        <strong>{{ item.applicants }}</strong>
        <small>applicants</small>
      </button>
      <button
        type="button"
        class="hiring-role-card__stat"
        :class="{ 'hiring-role-card__stat--static': !countsClickable }"
        :disabled="!countsClickable"
        :aria-label="`View ${item.shortlisted} shortlisted for ${item.title}`"
        @click="$emit('view-shortlisted', item.id)"
      >
        <strong>{{ item.shortlisted }}</strong>
        <small>shortlisted</small>
      </button>
    </div>
    <button type="button" class="hiring-role-card__link" @click="$emit('action', item.id)">
      {{ actionLabel }}
    </button>
  </article>
</template>

<style scoped>
.hiring-role-card {
  position: relative;
}

.hiring-role-card__actions {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  margin: 0;
  grid-template-columns: none;
}

.hiring-role-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid rgba(7, 85, 154, 0.18);
  border-radius: 10px;
  background: #fff;
  color: #07559a;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.hiring-role-card__icon:hover {
  background: rgba(7, 85, 154, 0.08);
  border-color: rgba(7, 85, 154, 0.35);
}

.hiring-role-card__icon svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Override the global ".hiring-role-card div" grid so the two counts render as
   side-by-side clickable stat buttons (see hiring-dashboard.css). */
.hiring-role-card__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 18px;
}

.hiring-role-card__stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  text-align: left;
  border: 1.5px solid rgba(7, 85, 154, 0.16);
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.hiring-role-card__stat:hover:not(.hiring-role-card__stat--static) {
  background: rgba(7, 85, 154, 0.06);
  border-color: rgba(7, 85, 154, 0.4);
  box-shadow: 0 8px 20px rgba(7, 85, 154, 0.08);
}

.hiring-role-card__stat:focus-visible {
  outline: 3px solid rgba(7, 85, 154, 0.28);
  outline-offset: 2px;
}

/* Non-interactive variant (e.g. the "all roles" list) keeps the look but drops
   the affordances. */
.hiring-role-card__stat--static {
  cursor: default;
  border-color: transparent;
  background: transparent;
  padding: 0;
}

.hiring-role-card__stats strong {
  color: #07559a;
  font-family: Manrope, sans-serif;
  font-size: 24px;
  line-height: 1.1;
}

.hiring-role-card__stats small {
  color: #6f8794;
  font-size: 12px;
  font-weight: 800;
}
</style>
