<template>
  <div class="spinner-wrapper" :style="{ padding: padding }">
    <div
        class="spinner"
        :style="{
        width: size + 'px',
        height: size + 'px',
        borderWidth: stroke + 'px',
        borderTopColor: color
      }"
    ></div>
    <span v-if="text" class="spinner-text">{{ text }}</span>
  </div>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 32 },
  stroke: { type: Number, default: 3 },
  color: { type: String, default: '#2563eb' },
  text: { type: String, default: '正在努力加载中...' },
  padding: { type: String, default: '24px' }
})
</script>

<style scoped>
.spinner-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.spinner {
  border: 3px solid #e5e7eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-text {
  font-size: 0.875rem;
  color: #6b7280;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>