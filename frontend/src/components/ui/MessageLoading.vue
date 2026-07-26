<script setup>
defineProps({
  label: { type: String, default: 'Loading' },
})
</script>

<template>
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    class="message-loading"
    role="status"
    :aria-label="label"
  >
    <circle cx="4" cy="12" r="2" fill="currentColor">
      <animate
        id="message-spinner-start"
        begin="0;message-spinner-end.end+0.25s"
        attributeName="cy"
        calcMode="spline"
        dur="0.6s"
        values="12;6;12"
        keySplines=".33,.66,.66,1;.33,0,.66,.33"
      />
    </circle>
    <circle cx="12" cy="12" r="2" fill="currentColor">
      <animate
        begin="message-spinner-start.begin+0.1s"
        attributeName="cy"
        calcMode="spline"
        dur="0.6s"
        values="12;6;12"
        keySplines=".33,.66,.66,1;.33,0,.66,.33"
      />
    </circle>
    <circle cx="20" cy="12" r="2" fill="currentColor">
      <animate
        id="message-spinner-end"
        begin="message-spinner-start.begin+0.2s"
        attributeName="cy"
        calcMode="spline"
        dur="0.6s"
        values="12;6;12"
        keySplines=".33,.66,.66,1;.33,0,.66,.33"
      />
    </circle>
  </svg>
</template>

<style scoped>
.message-loading {
  display: inline-block;
  color: #07559a;
}
</style>
