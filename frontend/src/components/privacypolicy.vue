<script setup>
const emit = defineEmits(['back'])
</script>

<template>
  <div class="privacy-page">
    <div class="privacy-card">

      <h1>Privacy Policy</h1>

      <p class="last-updated">
        Last updated: July 14, 2026
      </p>

      <div class="privacy-content">

        <!-- Paste all your Privacy Policy content here -->

      </div>

      <div class="button-container">
        <button
          class="back-btn"
          @click="emit('back')"
        >
          ← Back to Home
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.privacy-page {
  min-height: 100vh;
  background: #f5f7fb;
  padding: 40px 20px;
}

.privacy-card {
  max-width: 950px;
  margin: auto;
  background: #fff;
  border-radius: 14px;
  padding: 40px;
  box-shadow: 0 8px 30px rgba(0,0,0,.08);
}

h1 {
  font-size: 38px;
  margin-bottom: 8px;
  color: #1e293b;
}

.last-updated {
  color: #64748b;
  margin-bottom: 30px;
}

.privacy-content {
  line-height: 1.8;
  color: #374151;
}

.privacy-content h2 {
  margin-top: 35px;
  color: #2563eb;
}

.privacy-content h3 {
  margin-top: 25px;
  color: #1e293b;
}

.privacy-content p {
  margin: 15px 0;
}

.privacy-content ul {
  padding-left: 22px;
}

.privacy-content li {
  margin-bottom: 10px;
}

.button-container {
  display: flex;
  justify-content: center;
  margin-top: 45px;
}

.back-btn {
  background: #2563eb;
  color: white;
  border: none;
  padding: 14px 30px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: .3s;
}

.back-btn:hover {
  background: #1d4ed8;
}

@media (max-width:768px){

  .privacy-card{
    padding:25px;
  }

  h1{
    font-size:30px;
  }

}
</style>