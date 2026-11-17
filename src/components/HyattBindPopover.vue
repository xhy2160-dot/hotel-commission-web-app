<template>
  <Teleport to="body">
    <Transition name="popover-fade">
      <div v-if="props.isOpen" class="popover-overlay" @click.self="handleClose">
        <div class="popover-panel" role="dialog" aria-modal="true">
          <div class="popover-header">
            <span class="popover-title">绑定订单</span>
            <button class="popover-close" type="button" aria-label="Close" @click="handleClose">&times;</button>
          </div>

          <div class="popover-body">
            <div class="detail-row">
              <span class="label">确认号:</span>
              <span class="value">{{ props.data?.confirmation_number || '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">酒店:</span>
              <span class="value">{{ props.data?.property_name || '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">住客:</span>
              <span class="value">{{ props.data?.guest_last_name || '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">入住:</span>
              <span class="value">{{ dateOnly(props.data?.arrival_date) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">离店:</span>
              <span class="value">{{ dateOnly(props.data?.departure_date) }}</span>
            </div>

            <label class="field">
              <span class="field-label">客户提交订单号</span>
              <input
                  v-model="orderNo"
                  type="text"
                  class="field-input"
                  placeholder="请输入客户提交订单号"
                  @keyup.enter="handleSubmit"
              />
            </label>
          </div>

          <div class="popover-footer">
            <button type="button" class="btn ghost" @click="handleClose">取消</button>
            <button type="button" class="btn primary" :disabled="isSubmitting" @click="handleSubmit">
              {{ isSubmitting ? '提交中...' : '提交' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { bindHyattOrder } from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'

const { showToast } = useToast()

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  data: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const dateOnly = (value) => {
  const raw = String(value ?? '').trim()
  return raw ? raw.slice(0, 10) : '-'
}

const orderNo = ref('')
const isSubmitting = ref(false)

watch(
    () => props.isOpen,
    (open) => {
      if (open) orderNo.value = props.data?.bound_order_no || ''
    },
)

const handleClose = () => {
  emit('close')
}

const handleSubmit = async () => {
  if (isSubmitting.value) return
  const value = orderNo.value.trim()
  if (!value) {
    showToast('请输入客户提交订单号', 'error')
    return
  }
  try {
    isSubmitting.value = true
    await bindHyattOrder({
      id: props.data.id,
      confirmation_number: props.data.confirmation_number,
      customer_order_no: value,
    })
    showToast('绑定成功', 'success')
    emit('save', { id: props.data.id, customer_order_no: value })
    emit('close')
  } catch (error) {
    console.error('Failed to bind Hyatt order:', error)
    showToast(error?.response?.data?.message || error?.message || '绑定失败，请重试', 'error')
  } finally {
    isSubmitting.value = false
  }
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
  max-width: 420px;
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

.popover-title { font-size: 0.95rem; font-weight: 600; color: #303133; }

.popover-close {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: #606266;
  cursor: pointer;
}
.popover-close:hover { background-color: #ecf0f3; color: #303133; }

.popover-body { padding: 1rem; }

.detail-row { display: flex; gap: 8px; font-size: 14px; margin-bottom: 8px; }
.detail-row .label { color: #6b7280; min-width: 52px; }
.detail-row .value { color: #111827; font-weight: 500; }

.field { display: block; margin-top: 14px; }
.field-label { display: block; font-size: 13px; color: #4b5563; margin-bottom: 6px; }
.field-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;
}
.field-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.popover-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #ebeef5;
}

.btn { padding: 8px 18px; border-radius: 6px; font-size: 14px; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: #2563eb; color: #fff; }
.btn.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn.ghost { background: #fff; color: #111827; border-color: #d1d5db; }

.popover-fade-enter-active,
.popover-fade-leave-active { transition: opacity 0.18s ease; }
.popover-fade-enter-active .popover-panel,
.popover-fade-leave-active .popover-panel { transition: transform 0.18s ease, opacity 0.18s ease; }
.popover-fade-enter-from,
.popover-fade-leave-to { opacity: 0; }
.popover-fade-enter-from .popover-panel,
.popover-fade-leave-to .popover-panel { transform: translateY(8px) scale(0.98); opacity: 0; }
</style>
