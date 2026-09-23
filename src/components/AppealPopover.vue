<script setup>
import { ref, watch } from 'vue'
import { updateAppealStatus } from '@/api/index.js'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth.js'

const { showToast } = useToast()
const authStore = useAuthStore()

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  data: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'save'])

const selectedStatus = ref('')
const remarkText = ref('')
const isSubmitting = ref(false)
const showPreview = ref(false)

const statusLabel = { 0: '待处理', 1: '已通过', 2: '已拒绝' }

watch(
  () => [props.isOpen, props.data],
  () => {
    if (!props.isOpen) return
    const current = Number(props.data?.status)
    selectedStatus.value = current === 1 || current === 2 ? String(current) : ''
    remarkText.value = props.data?.reply_content || ''
  },
  { immediate: true, deep: true }
)

const openImagePreview = () => {
  showPreview.value = true
}

const closePreview = () => {
  showPreview.value = false
}

const handleSave = async () => {
  if (isSubmitting.value) return
  if (selectedStatus.value !== '1' && selectedStatus.value !== '2') {
    showToast('请选择通过或拒绝', 'error')
    return
  }
  try {
    isSubmitting.value = true
    await updateAppealStatus({
      id: props.data.id,
      status: Number(selectedStatus.value),
      reply_content: remarkText.value,
      staff: authStore.user?.id || authStore.user?.nickname || ''
    })
    showToast('已保存', 'success')
    emit('save')
    emit('close')
  } catch (error) {
    console.error('Failed to update appeal status:', error)
    showToast('保存失败', 'error')
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Transition name="popover-fade">
    <div v-if="isOpen" class="popover-overlay">
      <div class="popover-card">
        <div class="popover-header">
          <span class="title">申诉办理</span>
          <button type="button" class="close-icon" @click="handleClose">&times;</button>
        </div>

        <div class="popover-body">
          <div class="detail-row">
            <span class="label">用户ID:</span>
            <span class="value">{{ data.user_id }}</span>
          </div>
          <div class="detail-row">
            <span class="label">订单号:</span>
            <span class="value font-mono">{{ data.order.confirmation_num || '-' }}</span>
          </div>
          <div class="detail-row" @click="openImagePreview">
            <span class="label">截图:</span>
            <img alt="order proof" :src="$imgBaseUrl+data.images">
          </div>
          <div class="detail-row">
            <span class="label">当前状态:</span>
            <span class="value">{{ statusLabel[data.status] || data.status_label || '-' }}</span>
          </div>
          <div class="content-box">
            <span class="section-label">客人描述</span>
            <p>{{ data.content || '无' }}</p>
          </div>

          <div class="status-selection">
            <span class="status-label">处理结果:</span>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" value="1" v-model="selectedStatus" />
                <span class="radio-text success">通过</span>
              </label>
              <label class="radio-option">
                <input type="radio" value="2" v-model="selectedStatus" />
                <span class="radio-text danger">拒绝</span>
              </label>
            </div>
          </div>

          <div class="remark-section">
            <label for="appeal-reply" class="section-label">处理回复:</label>
            <textarea
                id="appeal-reply"
                v-model="remarkText"
                placeholder="请输入审核说明或拒绝原因..."
                rows="3"
                class="remark-textarea"
            />
          </div>
        </div>

        <div class="popover-footer">
          <button type="button" class="btn btn-cancel" @click="handleClose">取消</button>
          <button type="button" class="btn btn-save" :disabled="isSubmitting" @click="handleSave">
            {{ isSubmitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
  <Teleport to="body">
    <div
        v-if="showPreview"
        class="image-preview-overlay"
        @click="closePreview"
    >
      <img
          :src="$imgBaseUrl + data.images"
          alt="order proof full size"
          class="image-preview-full"
          @click.stop
      >
      <button class="close-btn" @click="closePreview">×</button>
    </div>
  </Teleport>
</template>

<style scoped>
.popover-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  box-sizing: border-box;
}

.popover-card {
  background: #ffffff;
  width: 100%;
  max-width: 420px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid #f0f0f0;
  background-color: #fafafa;
}

.popover-header .title {
  font-weight: 600;
  font-size: 0.95rem;
  color: #1f2937;
}

.close-icon {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
}

.close-icon:hover {
  color: #4b5563;
}

.popover-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.detail-row .label {
  color: #6b7280;
}

.detail-row .value {
  font-weight: 500;
  color: #111827;
}
.detail-row img{
  height: 100px;
  width: 100px;
}
.font-mono {
  font-family: monospace;
}

.detail-row .amount {
  color: #059669;
  font-weight: 700;
  font-size: 1rem;
}

.content-box {
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.content-box p {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  color: #111827;
  line-height: 1.5;
  white-space: pre-wrap;
}

.section-label,
.status-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}

.status-selection {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.radio-group {
  display: flex;
  gap: 1.25rem;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.radio-text.success {
  color: #059669;
  font-weight: 500;
}

.radio-text.danger {
  color: #dc2626;
  font-weight: 500;
}

.remark-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.remark-textarea {
  width: 100%;
  padding: 0.5rem;
  font-size: 0.85rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
  color: #111827;
}

.remark-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.popover-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid #f0f0f0;
  background-color: #fafafa;
}

.btn {
  padding: 0.4rem 0.875rem;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background-color: #ffffff;
  border-color: #d1d5db;
  color: #374151;
}

.btn-cancel:hover {
  background-color: #f3f4f6;
}

.btn-save {
  background-color: #2563eb;
  color: #ffffff;
}

.btn-save:hover {
  background-color: #1d4ed8;
}

.preview-img {
  cursor: zoom-in;
  max-width: 100px;
  height: auto;
  border-radius: 4px;
  transition: opacity 0.2s;
}

.preview-img:hover {
  opacity: 0.85;
}

.image-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: zoom-out;
}

.image-preview-full {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  cursor: default;
  border-radius: 4px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
</style>
