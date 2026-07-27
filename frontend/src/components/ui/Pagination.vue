<script setup>
defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})

defineEmits(['change'])
</script>

<template>
  <nav v-if="totalPages > 1" class="list-pagination" aria-label="List pagination">
    <span class="list-pagination__status" aria-live="polite">Page {{ page }} of {{ totalPages }}</span>
    <button class="list-pagination__edge" type="button" :disabled="page === 1" @click="$emit('change', page - 1)">
      <span aria-hidden="true">‹</span><span>Previous</span>
    </button>
    <div class="list-pagination__pages">
      <button
        v-for="pageNumber in totalPages"
        :key="pageNumber"
        :aria-current="pageNumber === page ? 'page' : undefined"
        :aria-label="`Page ${pageNumber} of ${totalPages}`"
        :class="{ 'list-pagination__page--active': pageNumber === page }"
        type="button"
        @click="$emit('change', pageNumber)"
      >
        {{ pageNumber }}
      </button>
    </div>
    <button class="list-pagination__edge" type="button" :disabled="page === totalPages" @click="$emit('change', page + 1)">
      <span>Next</span><span aria-hidden="true">›</span>
    </button>
  </nav>
</template>

<style scoped>
.list-pagination { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 22px; }
.list-pagination__pages { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; }
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
  .list-pagination__pages { order: -1; width: 100%; }
  .list-pagination__edge { flex: 1; min-width: 0 !important; max-width: 132px; }
}
@media (prefers-reduced-motion: reduce) { .list-pagination button { transition: none; } }
</style>
