<template>
  <Teleport to="body">
    <Transition name="popover-fade">
      <div v-if="props.isOpen" class="popover-overlay" @click.self="handleClose">
        <div class="popover-panel" role="dialog" aria-modal="true">
          <!-- Header -->
          <div class="popover-header">
            <span class="popover-title">订单爬虫数据</span>
            <button class="popover-close" type="button" aria-label="Close" @click="handleClose">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                    d="M6 6 L18 18 M18 6 L6 18"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    fill="none"
                />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="popover-body">
            <pre v-if="props.searchData?.length > 0"><code>{{ JSON.stringify(props.searchData, null, 2) }}</code></pre>
            <pre v-else><code>未找到相关记录</code></pre>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  searchData: {
    type: Array,
    default: () => []
  },
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
.popover-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  box-sizing: border-box;
}

.popover-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 640px;
  max-height: 80vh;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.75rem 0.75rem 1rem;
  border-bottom: 1px solid #ebeef5;
  background-color: #fafafa;
}

.popover-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #303133;
}

.popover-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: #606266;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.popover-close:hover {
  background-color: #ecf0f3;
  color: #303133;
}

.popover-close:active {
  background-color: #dfe4ea;
}

.popover-body {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.json-container pre,
.popover-body pre {
  margin: 0;
  background-color: #e4e7ed;
  color: #000;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Transition */
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 0.18s ease;
}

.popover-fade-enter-active .popover-panel,
.popover-fade-leave-active .popover-panel {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
}

.popover-fade-enter-from .popover-panel,
.popover-fade-leave-to .popover-panel {
  transform: translateY(8px) scale(0.98);
  opacity: 0;
}
</style>