<script setup>
defineProps({
  variant: {
    type: String,
    default: 'candidate',
    validator: (value) => ['candidate', 'job', 'role'].includes(value),
  },
  count: { type: Number, default: 3 },
  label: { type: String, default: 'Loading content' },
})
</script>

<template>
  <div class="skeleton-list" :class="`skeleton-list--${variant}`" role="status" :aria-label="label">
    <span class="skeleton-sr-only">{{ label }}</span>
    <article
      v-for="index in count"
      :key="index"
      class="skeleton-card"
      :class="`skeleton-card--${variant}`"
      aria-hidden="true"
    >
      <template v-if="variant === 'candidate'">
        <span class="skeleton-piece skeleton-avatar" />
        <div class="skeleton-body">
          <span class="skeleton-piece skeleton-title" />
          <span class="skeleton-piece skeleton-line skeleton-line--medium" />
          <div class="skeleton-pills">
            <span class="skeleton-piece" /><span class="skeleton-piece" /><span class="skeleton-piece" />
          </div>
        </div>
        <div class="skeleton-actions">
          <span class="skeleton-piece" /><span class="skeleton-piece" />
        </div>
      </template>

      <template v-else-if="variant === 'role'">
        <span class="skeleton-piece skeleton-badge" />
        <span class="skeleton-piece skeleton-title skeleton-title--wide" />
        <span class="skeleton-piece skeleton-line skeleton-line--medium" />
        <div class="skeleton-stats">
          <span class="skeleton-piece" /><span class="skeleton-piece" />
        </div>
        <span class="skeleton-piece skeleton-button skeleton-button--small" />
      </template>

      <template v-else>
        <div class="skeleton-body">
          <span class="skeleton-piece skeleton-badge" />
          <span class="skeleton-piece skeleton-title" />
          <span class="skeleton-piece skeleton-line skeleton-line--medium" />
          <span class="skeleton-piece skeleton-line" />
          <div class="skeleton-pills">
            <span class="skeleton-piece" /><span class="skeleton-piece" /><span class="skeleton-piece" />
          </div>
        </div>
        <div class="skeleton-actions">
          <span class="skeleton-piece skeleton-button--small" />
          <span class="skeleton-piece" />
        </div>
      </template>
    </article>
  </div>
</template>

<style scoped>
.skeleton-list {
  display: grid;
  gap: 12px;
}

.skeleton-list--role {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.skeleton-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(18, 50, 74, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12px 38px rgba(7, 85, 154, 0.06);
}

.skeleton-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 25%, rgba(255, 255, 255, 0.92) 45%, transparent 65%);
  transform: translateX(-100%);
  animation: skeleton-shimmer 1.35s ease-in-out infinite;
}

.skeleton-card--candidate,
.skeleton-card--job {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
  min-height: 150px;
  padding: 20px;
}

.skeleton-card--candidate {
  grid-template-columns: 58px minmax(0, 1fr) auto;
}

.skeleton-card--job {
  min-height: 196px;
  --skeleton-fill: #eaf3ee;
}

.skeleton-card--role {
  display: flex;
  min-height: 230px;
  padding: 20px;
  flex-direction: column;
  align-items: flex-start;
}

.skeleton-piece {
  display: block;
  height: 12px;
  border-radius: 999px;
  background: var(--skeleton-fill, #e9f0f4);
}

.skeleton-avatar {
  width: 58px;
  height: 58px;
  border-radius: 18px;
}

.skeleton-body {
  display: grid;
  width: 100%;
  gap: 10px;
}

.skeleton-title {
  width: min(240px, 48%);
  height: 20px;
}

.skeleton-title--wide {
  width: 72%;
  margin-top: 18px;
}

.skeleton-line {
  width: 88%;
}

.skeleton-line--medium {
  width: 62%;
}

.skeleton-badge {
  width: 78px;
  height: 26px;
}

.skeleton-pills,
.skeleton-stats,
.skeleton-actions {
  display: flex;
  gap: 8px;
}

.skeleton-pills {
  margin-top: 4px;
}

.skeleton-pills .skeleton-piece {
  width: 76px;
  height: 26px;
}

.skeleton-stats {
  width: 100%;
  margin-top: 22px;
}

.skeleton-stats .skeleton-piece {
  width: 50%;
  height: 54px;
  border-radius: 14px;
}

.skeleton-actions {
  flex-direction: column;
}

.skeleton-actions .skeleton-piece,
.skeleton-button {
  width: 104px;
  height: 42px;
}

.skeleton-button--small {
  width: 92px;
  margin-top: auto;
}

.skeleton-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes skeleton-shimmer {
  to { transform: translateX(100%); }
}

@media (max-width: 850px) {
  .skeleton-list--role,
  .skeleton-card--candidate,
  .skeleton-card--job {
    grid-template-columns: 1fr;
  }

  .skeleton-card--candidate .skeleton-actions,
  .skeleton-card--job .skeleton-actions {
    flex-direction: row;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-card::after { animation: none; }
}
</style>
