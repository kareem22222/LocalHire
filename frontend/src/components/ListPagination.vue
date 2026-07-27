<script setup>
defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})

defineEmits(['change'])
</script>

<template>
  <nav v-if="totalPages > 1" class="list-pagination" aria-label="List pagination">
    <button type="button" :disabled="page === 1" @click="$emit('change', page - 1)">← Previous</button>
    <span aria-live="polite">Page {{ page }} of {{ totalPages }}</span>
    <button type="button" :disabled="page === totalPages" @click="$emit('change', page + 1)">Next →</button>
  </nav>
</template>

<style scoped>
.list-pagination { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 22px; }
.list-pagination button { min-width: 108px; padding: 11px 16px; color: var(--pagination-accent,#07559a); border: 1.5px solid color-mix(in srgb,var(--pagination-accent,#07559a) 28%,transparent); border-radius: 999px; background: #fff; font-weight: 800; cursor: pointer; transition: background .15s ease,border-color .15s ease,transform .15s ease; }
.list-pagination button:hover:not(:disabled) { border-color: var(--pagination-accent,#07559a); background: color-mix(in srgb,var(--pagination-accent,#07559a) 8%,white); transform: translateY(-1px); }
.list-pagination button:focus-visible { outline: 3px solid color-mix(in srgb,var(--pagination-accent,#07559a) 24%,transparent); outline-offset: 2px; }
.list-pagination button:disabled { opacity: .38; cursor: not-allowed; }
.list-pagination span { min-width: 90px; color: #526977; font-size: 13px; font-weight: 800; text-align: center; }
@media (max-width: 480px) { .list-pagination { gap: 8px; }.list-pagination button { min-width: 0; }.list-pagination span { min-width: 76px; font-size: 12px; } }
</style>
