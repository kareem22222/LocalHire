<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})

defineEmits(['change'])

const visiblePages = computed(() => {
  if (props.totalPages <= 7) return Array.from({ length: props.totalPages }, (_, index) => index + 1)
  if (props.page <= 4) return [1, 2, 3, 4, 5, 'end-gap', props.totalPages]
  if (props.page >= props.totalPages - 3) return [1, 'start-gap', ...Array.from({ length: 5 }, (_, index) => props.totalPages - 4 + index)]
  return [1, 'start-gap', props.page - 1, props.page, props.page + 1, 'end-gap', props.totalPages]
})
</script>

<template>
  <nav v-if="totalPages > 1" class="list-pagination" aria-label="List pagination">
    <span class="list-pagination__status" aria-live="polite">Page {{ page }} of {{ totalPages }}</span>
    <button class="list-pagination__edge" type="button" :disabled="page === 1" @click="$emit('change', page - 1)">
      <span aria-hidden="true">‹</span><span>Previous</span>
    </button>
    <div class="list-pagination__pages">
      <template v-for="item in visiblePages" :key="item">
        <button
          v-if="typeof item === 'number'"
          :aria-current="item === page ? 'page' : undefined"
          :aria-label="`Page ${item} of ${totalPages}`"
          :class="{ 'list-pagination__page--active': item === page }"
          type="button"
          @click="$emit('change', item)"
        >
          {{ item }}
        </button>
        <span v-else class="list-pagination__ellipsis" aria-hidden="true">…</span>
      </template>
    </div>
    <button class="list-pagination__edge" type="button" :disabled="page === totalPages" @click="$emit('change', page + 1)">
      <span>Next</span><span aria-hidden="true">›</span>
    </button>
  </nav>
</template>

<style scoped>
.list-pagination { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 22px; }
.list-pagination__pages { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; }
.list-pagination__ellipsis { display: grid; width: 28px; height: 38px; place-items: center; color: #718692; font-weight: 800; }
.list-pagination button {
  display: inline-flex; align-items: center; justify-content: center; min-width: 38px; height: 38px; padding: 0 11px;
  color: var(--pagination-accent, #07559a); background: #fff;
  border: 1.5px solid color-mix(in srgb, var(--pagination-accent, #07559a) 24%, transparent);
  border-radius: 10px; font: 800 13px inherit; cursor: pointer;
  transition: color .15s ease, background .15s ease, border-color .15s ease, transform .15s ease;
}
.list-pagination button:hover:not(:disabled):not(.list-pagination__page--active) {
  border-color: var(--pagination-accent, #07559a);
  background: color-mix(in srgb, var(--pagination-accent, #07559a) 8%, white);
  transform: translateY(-1px);
}
.list-pagination button:focus-visible { outline: 3px solid color-mix(in srgb, var(--pagination-accent, #07559a) 24%, transparent); outline-offset: 2px; }
.list-pagination button:disabled { opacity: .38; cursor: not-allowed; }
.list-pagination .list-pagination__page--active {
  color: #fff; background: var(--pagination-accent, #07559a); border-color: var(--pagination-accent, #07559a);
  box-shadow: 0 5px 14px color-mix(in srgb, var(--pagination-accent, #07559a) 22%, transparent);
}
.list-pagination__edge { gap: 6px; min-width: 105px !important; }
.list-pagination__status {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
@media (max-width: 560px) {
  .list-pagination { flex-wrap: wrap; }
  .list-pagination__pages { order: -1; width: 100%; flex-wrap: nowrap; gap: 4px; }
  .list-pagination__pages button { min-width: 34px; width: 34px; height: 34px; padding: 0; }
  .list-pagination__ellipsis { width: 22px; height: 34px; }
  .list-pagination__edge { flex: 1; min-width: 0 !important; max-width: 132px; }
}
@media (prefers-reduced-motion: reduce) { .list-pagination button { transition: none; } }
</style>
