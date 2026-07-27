<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  fileName: { type: String, default: '' },
  uploading: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
  error: { type: String, default: '' },
})
const emit = defineEmits(['select'])
const input = ref(null)
const dragging = ref(false)
const pendingFile = ref(null)
const localError = ref('')

const errorMessage = computed(() => localError.value || props.error)
const displayName = computed(() => pendingFile.value?.name || props.fileName)
const displaySize = computed(() => pendingFile.value ? formatBytes(pendingFile.value.size) : '')
const progressValue = computed(() => Math.min(Math.max(Math.round(props.progress), 0), 100))
const status = computed(() => errorMessage.value ? 'error' : props.uploading ? 'uploading' : displayName.value ? 'done' : 'empty')

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function choose() {
  if (!props.uploading) input.value?.click()
}

function selectFile(file) {
  localError.value = ''
  if (!file) return
  pendingFile.value = file
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!['pdf', 'doc', 'docx'].includes(extension) || file.size === 0 || file.size > 5 * 1024 * 1024) {
    localError.value = 'Resume must be a PDF, DOC, or DOCX file no larger than 5 MB.'
    return
  }
  emit('select', file)
}

function onInput(event) {
  selectFile(event.target.files?.[0])
  event.target.value = ''
}

function onDrop(event) {
  dragging.value = false
  if (!props.uploading) selectFile(event.dataTransfer?.files?.[0])
}

watch(() => props.uploading, (uploading, wasUploading) => {
  if (wasUploading && !uploading && !props.error) pendingFile.value = null
})
</script>

<template>
  <section class="resume-upload" aria-label="Resume upload">
    <input
      id="profile-resume"
      ref="input"
      class="resume-upload__input"
      type="file"
      tabindex="-1"
      :disabled="uploading"
      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      @change="onInput"
    />

    <div
      class="resume-upload__dropzone"
      :class="{ 'resume-upload__dropzone--active': dragging }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <span class="resume-upload__upload-icon" aria-hidden="true">↑</span>
      <div>
        <strong>{{ fileName ? 'Replace your resume' : 'Upload your resume' }}</strong>
        <p>PDF, DOC, or DOCX up to 5 MB</p>
      </div>
      <button type="button" :disabled="uploading" @click="choose">
        {{ uploading ? 'Uploading…' : fileName ? 'Choose replacement' : 'Choose file' }}
      </button>
    </div>

    <div v-if="displayName" class="resume-upload__timeline" aria-live="polite">
      <div class="resume-upload__marker" :class="`resume-upload__marker--${status}`" aria-hidden="true">
        {{ status === 'done' ? '✓' : status === 'error' ? '!' : '' }}
      </div>
      <div class="resume-upload__file">
        <div class="resume-upload__file-head">
          <div>
            <strong>{{ displayName }}</strong>
            <span v-if="displaySize">{{ displaySize }}</span>
          </div>
          <span :class="`resume-upload__status resume-upload__status--${status}`">
            {{ status === 'uploading' ? `${progressValue}% uploaded` : status === 'error' ? 'Upload failed' : 'Uploaded' }}
          </span>
        </div>
        <div
          v-if="uploading"
          class="resume-upload__progress"
          role="progressbar"
          aria-label="Resume upload progress"
          :aria-valuenow="progressValue"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span :style="{ width: `${Math.max(progressValue, 4)}%` }"></span>
        </div>
        <p v-if="errorMessage" class="resume-upload__error" role="alert">{{ errorMessage }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.resume-upload { display: grid; gap: 14px; }
.resume-upload__input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
.resume-upload__dropzone {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 14px; padding: 16px;
  background: #f8fcfa; border: 1.5px dashed rgba(20, 133, 84, .28); border-radius: 13px;
  transition: background .15s ease, border-color .15s ease;
}
.resume-upload__dropzone--active { background: #ecf8f1; border-color: var(--worker-role-green-end, #148554); }
.resume-upload__upload-icon {
  display: grid; width: 38px; height: 38px; place-items: center; color: var(--worker-role-green-text, #126c49);
  background: #e7f7ee; border-radius: 10px; font-size: 22px; font-weight: 700;
}
.resume-upload__dropzone strong, .resume-upload__file strong { display: block; color: #12324a; font-size: 14px; overflow-wrap: anywhere; }
.resume-upload__dropzone p { margin: 3px 0 0; color: #657b88; font-size: 12px; }
.resume-upload__dropzone button {
  padding: 9px 13px; color: #fff; background: var(--worker-role-green-end, #148554); border: 0;
  border-radius: 9px; font: 800 12px inherit; cursor: pointer;
}
.resume-upload__dropzone button:hover:not(:disabled) { filter: brightness(.94); }
.resume-upload__dropzone button:focus-visible { outline: 3px solid rgba(20, 133, 84, .2); outline-offset: 2px; }
.resume-upload__dropzone button:disabled { opacity: .55; cursor: wait; }
.resume-upload__timeline { position: relative; display: grid; grid-template-columns: 28px 1fr; gap: 10px; }
.resume-upload__timeline::before { position: absolute; top: 14px; bottom: 0; left: 13px; width: 2px; background: #dce9e3; content: ''; }
.resume-upload__marker {
  z-index: 1; display: grid; width: 28px; height: 28px; place-items: center; color: #fff;
  background: #2f80d1; border: 4px solid #eef6fc; border-radius: 50%; font-size: 11px; font-weight: 900;
}
.resume-upload__marker--uploading { animation: resume-pulse 1.2s ease-in-out infinite; }
.resume-upload__marker--done { background: var(--worker-role-green-end, #148554); border-color: #e8f6ee; }
.resume-upload__marker--error { background: #b33a3a; border-color: #fcecec; }
.resume-upload__file { min-width: 0; padding: 13px 14px; background: #fff; border: 1px solid rgba(18, 50, 74, .09); border-radius: 11px; }
.resume-upload__file-head { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
.resume-upload__file-head span { display: block; margin-top: 2px; color: #738895; font-size: 11px; }
.resume-upload__status { flex: none; margin: 0 !important; color: #126c49 !important; font-weight: 800; }
.resume-upload__status--uploading { color: #07559a !important; }
.resume-upload__status--error { color: #a23434 !important; }
.resume-upload__progress { height: 5px; margin-top: 10px; overflow: hidden; background: #e4edf1; border-radius: 999px; }
.resume-upload__progress span { display: block; height: 100%; background: #2f80d1; border-radius: inherit; transition: width .18s ease; }
.resume-upload__error { margin: 8px 0 0; color: #a23434; font-size: 12px; font-weight: 650; }
@keyframes resume-pulse { 50% { box-shadow: 0 0 0 5px rgba(47, 128, 209, .12); } }
@media (max-width: 620px) {
  .resume-upload__dropzone { grid-template-columns: auto 1fr; }
  .resume-upload__dropzone button { grid-column: 1 / -1; width: 100%; }
  .resume-upload__file-head { display: grid; }
}
@media (prefers-reduced-motion: reduce) {
  .resume-upload__dropzone, .resume-upload__progress span { transition: none; }
  .resume-upload__marker--uploading { animation: none; }
}
</style>
