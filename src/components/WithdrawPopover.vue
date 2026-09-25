<script setup>
import { ref, watch } from 'vue'
import {updateWithdrawalStatus} from '@/api/index.js'
import { useToast } from '@/composables/useToast';
const { showToast } = useToast();
import { useAuthStore } from '@/stores/auth.js'
const authStore = useAuthStore()

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  data: {
    type: Object,
  }
})

const emit = defineEmits(['close', 'save'])

const selectedStatus = ref('')
const isSubmitting = ref(false)
const remarkText = ref('')

// Sync selected status when modal opens
watch(
    () => props.isOpen,
    (newVal) => {
      if (newVal) {
        selectedStatus.value = props.data.status || ''
      }
    },
    { immediate: true }
)

const handleSave = async () => {
  if (isSubmitting.value) return
  try {
    isSubmitting.value = true
    await updateWithdrawalStatus({
      id: props.data.id,
      status: selectedStatus.value,
      remark:remarkText.value,
      staff:authStore.user.id
    })
    showToast('已保存', 'success')
    // Only close modal on successful update
    emit('save')
    emit('close')
  } catch (error) {
    console.error('Failed to update withdrawal status:', error)
    // Optional: Add UI feedback like ElMessage.error('Update failed')
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
        <!-- Header -->
        <div class="popover-header">
          <span class="title">打款详情</span>
          <button type="button" class="close-icon" @click="handleClose">&times;</button>
        </div>

        <!-- Details Body -->
        <div class="popover-body">
          <div class="detail-row">
            <span class="label">ID:</span>
            <span class="value font-mono">{{ data.withdraw_no }}</span>
          </div>

          <div class="detail-row">
            <span class="label">姓名:</span>
            <span class="value">{{ data.zelle_name }}</span>
          </div>
          <div class="detail-row">
            <span class="label">邮箱:</span>
            <span class="value">{{ data.zelle_phone }}</span>
          </div>

          <div class="detail-row">
            <span class="label">金额:</span>
            <span class="value amount">¥{{ data.amount }}</span>
          </div>

          <!-- QR Code Display -->
          <div class="qr-container">
          <img alt="zell Qr code" :src="$imgBaseUrl+data.zelle_img">
            <span class="qr-hint">扫码进行审核</span>
          </div>

          <!-- Radio Status Selection -->
          <div class="status-selection">
            <span class="status-label">处理结果:</span>
            <div class="radio-group">
              <label class="radio-option">
                <input
                    type="radio"
                    value="approve"
                    v-model="selectedStatus"
                />
                <span class="radio-text success">已打款</span>
              </label>

              <label class="radio-option">
                <input
                    type="radio"
                    value="reject"
                    v-model="selectedStatus"
                />
                <span class="radio-text danger">拒绝</span>
              </label>
            </div>
          </div>
          <div class="remark-section">
            <label for="remark-input" class="section-label">备注说明:</label>
            <textarea
                id="remark-input"
                v-model="remarkText"
                placeholder="请输入审核备注或拒绝原因..."
                rows="2"
                class="remark-textarea"
            >{{data.pay_remark}}</textarea>
          </div>
        </div>
        <!-- Footer Action Buttons (操作按钮) -->
        <div class="popover-footer">
          <button type="button" class="btn btn-cancel" @click="handleClose">
            取消
          </button>
          <button type="button" class="btn btn-save" @click="handleSave">
            保存
          </button>
        </div>
      </div>
    </div>
  </Transition>
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
  max-width: 360px;
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

.font-mono {
  font-family: monospace;
}

.detail-row .amount {
  color: #059669;
  font-weight: 700;
  font-size: 1rem;
}

/* QR Code */
.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0.5rem 0;
  padding: 0.75rem;
  background-color: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #e5e7eb;

}

.qr-container img{
  height: 100px;
  width: 100px;
}
.qr-hint {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.5rem;
}

/* Radio Selection */
.status-selection {
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
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

/* Remark Input Area */
.remark-section {
  display: flex;
  flex-direction: column;
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

/* Action Buttons (操作按钮) */
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
  transition: background-color 0.15s ease;
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

/* Vue Transitions */
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 0.2s ease;
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
}
</style>