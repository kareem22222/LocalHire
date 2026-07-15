<script setup>
defineProps({
  item: { type: Object, required: true },
  actionLabel: { type: String, required: true },
})

defineEmits(['view', 'action'])
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
    <div>
      <strong>{{ item.applicants }}</strong>
      <small>applicants</small>
      <strong>{{ item.shortlisted }}</strong>
      <small>shortlisted</small>
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
</style>
