<template>
  <div class="order-page">
    <div class="order-container">
      <!-- 页面头部 -->
      <div class="page-header">
        <h2>订单号提交</h2>
      </div>

      <!-- 提交区域 -->
      <div class="submit-section">
        <div class="form-group">
          <div class="input-group">
            <input
                v-model="newOrderNumber"
                type="text"
                class="form-input"
                placeholder="请输入订单号"
                @keyup.enter="submitOrder"
                :maxlength="20"
            />
            <button
                @click="submitOrder"
                class="submit-btn"
            >
              <span>保存</span>
            </button>
          </div>
          <div v-if="orderError" class="error-message">
            {{ orderError }}
          </div>
          <div class="input-hint">
            <span>提交后用户将无法从小程序端提交该订单号</span>
          </div>
        </div>
      </div>

      <!-- 最近订单列表 -->
      <div class="recent-orders">
        <div class="section-header">
          <h2>最近提交</h2>
        </div>

        <div v-if="recentOrders.length === 0" class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>暂无订单</h3>
        </div>
        <div v-else class="orders-list">
          <div
              v-for="(order, index) in recentOrders"
              :key="order.id"
              class="order-item"
          >
            <div class="order-number">
              <span class="order-index">#{{ index+1 }}</span>
              <span class="order-value">{{ order.order_number }}</span>
              <span v-if="order.isNew" class="new-badge">最新</span>
            </div>
            <div class="order-meta">
              <span class="order-date">{{ formatDate(order.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {getRecentManualOrders,postManualOrder} from "@/api/index.js";
import {useToast} from "@/composables/useToast.js";
const {showToast} = useToast();

// --- 状态定义 ---
const newOrderNumber = ref('')
const recentOrders = ref([])

// --- 方法 ---
const fetchRecenterManualOrders = async () => {
   const res = await getRecentManualOrders()
  recentOrders.value = res.data
}
const submitOrder = async () => {
  const orderNumber = newOrderNumber.value.trim()

  // 格式校验
  if (!orderNumber) {
    showToast('请输入订单号', 'error')
    return
  }
  try {
    // 匹配后端期望的字段名 newOrderNumber
    await postManualOrder({ orderNumber })
    newOrderNumber.value = '' // 清空输入框
    await fetchRecenterManualOrders() // 刷新最近订单列表
    showToast('保存成功', 'success')
  } catch (error) {
    console.log(error)
    console.error('提交订单失败:', error)
    showToast('保存失败:'+error?.response?.data?.message || '保存失败，请重试', 'error')
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return '暂无数据'
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

  if (isToday) {
    return `今天 ${timeStr}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isYesterday) {
    return `昨天 ${timeStr}`
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// --- 生命钩子 ---
onMounted(() => {
  fetchRecenterManualOrders()
})


</script>

<style scoped>
/* ----- 容器 ----- */
.order-page {
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #f6f9fc 0%, #e9f1f8 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.order-container {
  max-width: 800px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 2.5rem;
  box-shadow: 0 20px 40px -12px rgba(0, 20, 40, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

@media (max-width: 480px) {
  .order-page {
    padding: 1rem;
  }
  .order-container {
    padding: 1.5rem;
  }
}

/* ----- 头部 ----- */
.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  color: #0b2b44;
  margin: 0 0 0.25rem 0;
}

.page-header p {
  color: #5b6f82;
  margin: 0;
}

/* ----- 提交区域 ----- */
.submit-section {
  margin-bottom: 2.5rem;
  padding-bottom: 2.5rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.form-input {
  flex: 1;
  padding: 0.85rem 1rem;
  font-size: 1rem;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.7);
  border: 1.5px solid #dae3ec;
  border-radius: 16px;
  outline: none;
  transition: all 0.2s;
  color: #0b2b44;
}

.form-input:focus {
  border-color: #2d7aff;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(45, 122, 255, 0.12);
}

.submit-btn {
  padding: 0.85rem 2rem;
  background: linear-gradient(135deg, #1f5fd9, #2d7aff);
  color: white;
  font-weight: 700;
  font-size: 1rem;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 4px 12px rgba(45, 122, 255, 0.3);
  min-width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(45, 122, 255, 0.4);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  font-size: 0.85rem;
  color: #e5474b;
  font-weight: 500;
}

.input-hint {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #7a8fa3;
}


@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ----- 最近订单 ----- */
.recent-orders {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.section-header h2 {
  font-size: 1.3rem;
  color: #0b2b44;
  margin: 0;
}


/* 空状态 */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 16px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.empty-state h3 {
  color: #0b2b44;
  margin: 0.5rem 0;
}

.empty-state p {
  color: #5b6f82;
  margin: 0;
}

/* 订单列表 */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border-radius: 12px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.order-item:hover {
  background: #f0f5fa;
  transform: translateX(4px);
}

.order-item {
  background: #e8f4ff;
  border-color: #2d7aff;
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.order-number {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.order-index {
  font-size: 0.8rem;
  color: #5b6f82;
  font-weight: 500;
  min-width: 30px;
}

.order-value {
  font-weight: 600;
  color: #0b2b44;
  font-size: 1.05rem;
  letter-spacing: 0.5px;
}

.new-badge {
  background: #2d7aff;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
}

.order-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.order-date {
  font-size: 0.85rem;
  color: #5b6f82;
}







/* 暗黑模式支持 */
@media (prefers-color-scheme: dark) {
  .order-page {
    background: linear-gradient(135deg, #1a2634 0%, #0f1a24 100%);
  }

  .order-container {
    background: rgba(30, 40, 55, 0.85);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .page-header h1 {
    color: #e8f0f8;
  }

  .page-header p {
    color: #a0b8cc;
  }

  .form-input {
    background: rgba(255, 255, 255, 0.05);
    border-color: #3a4a5a;
    color: #e8f0f8;
  }

  .form-input:focus {
    background: rgba(255, 255, 255, 0.1);
  }

  .order-item {
    background: rgba(255, 255, 255, 0.03);
  }

  .order-item:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .order-value {
    color: #e8f0f8;
  }

  .order-date {
    color: #8a9fb3;
  }



  .empty-state {
    background: rgba(255, 255, 255, 0.02);
  }

  .empty-state h3 {
    color: #e8f0f8;
  }

  .empty-state p {
    color: #a0b8cc;
  }



/* 移动端适配 */
@media (max-width: 480px) {
  .input-group {
    flex-direction: column;
  }

  .submit-btn {
    width: 100%;
    min-width: unset;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
  }


  .order-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .order-meta {
    justify-content: space-between;
  }

}}
</style>