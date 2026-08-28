<template>
  <div class="zelle-payout-page">
    <!-- 搜索区域 -->
    <div class="search-bar">
      <div class="search-wrapper">
        <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索出款 ID 或用户 ID"
            class="search-input"
            @input="handleSearch"
        />
        <button class="btn btn-primary" @click="handleSearch">搜索</button>
        <button class="btn btn-outline" @click="resetSearch">重置</button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats">
      <span>共 <strong>{{ filteredPayoutList.length }}</strong> 条记录</span>
    </div>

    <!-- 出款列表 -->
    <div class="table-wrapper">
      <table class="payout-table">
        <thead>
        <tr>
          <th>用户 ID</th>
          <th>出款 ID</th>
          <th>姓名</th>
          <th>手机号</th>
          <th>金额</th>
          <th>状态</th>
          <th>备注</th>
          <th>操作</th>
        </tr>
        </thead>
        <tbody>
        <tr v-if="paginatedList.length === 0">
          <td colspan="8" class="empty-cell">暂无数据</td>
        </tr>
        <tr v-for="item in paginatedList" :key="item.payoutId">
          <td>{{ item.userId }}</td>
          <td>{{ item.payoutId }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.phone }}</td>
          <td class="amount">${{ item.amount.toFixed(2) }}</td>
          <td>
              <span class="status-tag" :class="statusClass(item.status)">
                {{ item.status }}
              </span>
          </td>
          <td class="remark">{{ item.remark || '-' }}</td>
          <td>
            <button class="btn-edit" @click="handleEdit(item)">编辑</button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <button
          class="btn-page"
          @click="prevPage"
          :disabled="currentPage === 1"
      >
        上一页
      </button>
      <span class="page-info">
        第 {{ currentPage }} / {{ totalPages }} 页
      </span>
      <button
          class="btn-page"
          @click="nextPage"
          :disabled="currentPage === totalPages"
      >
        下一页
      </button>
    </div>

    <!-- 编辑弹窗（Modal） -->
    <div v-if="dialogVisible" class="modal-overlay" @click.self="closeDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h3>编辑出款</h3>
          <button class="modal-close" @click="closeDialog">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>出款 ID</label>
            <input v-model="editForm.payoutId" disabled class="form-input" />
          </div>
          <div class="form-group">
            <label>用户 ID</label>
            <input v-model="editForm.userId" disabled class="form-input" />
          </div>
          <div class="form-group">
            <label>姓名</label>
            <input v-model="editForm.name" class="form-input" />
          </div>
          <div class="form-group">
            <label>手机号</label>
            <input v-model="editForm.phone" class="form-input" />
          </div>
          <div class="form-group">
            <label>金额</label>
            <input
                v-model.number="editForm.amount"
                type="number"
                step="0.01"
                class="form-input"
            />
          </div>
          <div class="form-group">
            <label>状态</label>
            <select v-model="editForm.status" class="form-select">
              <option value="待处理">待处理</option>
              <option value="处理中">处理中</option>
              <option value="已完成">已完成</option>
              <option value="失败">失败</option>
            </select>
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="editForm.remark" class="form-textarea" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeDialog">取消</button>
          <button class="btn btn-primary" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

// ========== 模拟数据 ==========
const payoutList = ref([
  {
    userId: 'U10001',
    payoutId: 'P20240703001',
    name: '张明',
    phone: '13800138001',
    amount: 150.00,
    status: '待处理',
    remark: 'Zelle 转账备注1'
  },
  {
    userId: 'U10002',
    payoutId: 'P20240703002',
    name: '李丽',
    phone: '13800138002',
    amount: 200.50,
    status: '处理中',
    remark: 'Zelle 转账备注2'
  },
  {
    userId: 'U10003',
    payoutId: 'P20240703003',
    name: '王强',
    phone: '13800138003',
    amount: 99.99,
    status: '已完成',
    remark: ''
  },
  {
    userId: 'U10004',
    payoutId: 'P20240703004',
    name: '赵雪',
    phone: '13800138004',
    amount: 300.00,
    status: '失败',
    remark: '银行账户信息错误'
  },
  {
    userId: 'U10005',
    payoutId: 'P20240703005',
    name: '刘洋',
    phone: '13800138005',
    amount: 75.50,
    status: '待处理',
    remark: 'Zelle 转账备注5'
  },
  {
    userId: 'U10006',
    payoutId: 'P20240703006',
    name: '陈静',
    phone: '13800138006',
    amount: 420.00,
    status: '处理中',
    remark: 'Zelle 转账备注6'
  }
])

// ========== 搜索逻辑 ==========
const searchQuery = ref('')

const filteredPayoutList = computed(() => {
  if (!searchQuery.value.trim()) {
    return payoutList.value
  }
  const query = searchQuery.value.trim().toLowerCase()
  return payoutList.value.filter(item =>
      item.payoutId.toLowerCase().includes(query) ||
      item.userId.toLowerCase().includes(query)
  )
})

const handleSearch = () => {
  currentPage.value = 1
}

const resetSearch = () => {
  searchQuery.value = ''
  currentPage.value = 1
}

// ========== 分页逻辑 ==========
const pageSize = ref(3)
const currentPage = ref(1)

const totalPages = computed(() => {
  return Math.ceil(filteredPayoutList.value.length / pageSize.value) || 1
})

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredPayoutList.value.slice(start, end)
})

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

// ========== 编辑逻辑 ==========
const dialogVisible = ref(false)
const editForm = reactive({
  payoutId: '',
  userId: '',
  name: '',
  phone: '',
  amount: 0,
  status: '',
  remark: ''
})

const handleEdit = (row) => {
  Object.assign(editForm, row)
  dialogVisible.value = true
}

const closeDialog = () => {
  dialogVisible.value = false
}

const saveEdit = () => {
  const index = payoutList.value.findIndex(item => item.payoutId === editForm.payoutId)
  if (index !== -1) {
    payoutList.value[index] = { ...editForm }
    alert('保存成功！')
  } else {
    alert('未找到对应出款记录')
  }
  closeDialog()
}

// ========== 状态样式 ==========
const statusClass = (status) => {
  const map = {
    '待处理': 'status-pending',
    '处理中': 'status-processing',
    '已完成': 'status-completed',
    '失败': 'status-failed'
  }
  return map[status] || 'status-pending'
}
</script>

<style scoped>
/* ===== 页面整体 ===== */
.zelle-payout-page {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* ===== 搜索栏 ===== */
.search-bar {
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.search-wrapper {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
  outline: none;
}

.search-input:focus {
  border-color: #4096ff;
  box-shadow: 0 0 0 2px rgba(64, 150, 255, 0.2);
}

/* ===== 按钮通用 ===== */
.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-primary {
  background: #4096ff;
  color: #fff;
}

.btn-primary:hover {
  background: #1677ff;
}

.btn-outline {
  background: transparent;
  color: #595959;
  border: 1px solid #d9d9d9;
}

.btn-outline:hover {
  border-color: #4096ff;
  color: #4096ff;
}

/* ===== 统计信息 ===== */
.stats {
  margin-bottom: 12px;
  font-size: 14px;
  color: #595959;
}

.stats strong {
  color: #262626;
}

/* ===== 表格 ===== */
.table-wrapper {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow-x: auto;
}

.payout-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.payout-table thead {
  background: #fafafa;
}

.payout-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #262626;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.payout-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  color: #595959;
}

.payout-table tbody tr:hover {
  background: #fafafa;
}

.payout-table .amount {
  font-weight: 600;
  color: #262626;
}

.payout-table .remark {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-cell {
  text-align: center;
  padding: 40px 0 !important;
  color: #bfbfbf;
}

/* ===== 状态标签 ===== */
.status-tag {
  display: inline-block;
  padding: 2px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending {
  background: #e6f4ff;
  color: #1677ff;
}

.status-processing {
  background: #fff7e6;
  color: #d48806;
}

.status-completed {
  background: #f6ffed;
  color: #389e0d;
}

.status-failed {
  background: #fff2f0;
  color: #cf1322;
}

/* ===== 编辑按钮 ===== */
.btn-edit {
  padding: 4px 12px;
  background: transparent;
  color: #4096ff;
  border: 1px solid #4096ff;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit:hover {
  background: #4096ff;
  color: #fff;
}

/* ===== 分页 ===== */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding: 12px 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.btn-page {
  padding: 6px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.btn-page:hover:not(:disabled) {
  border-color: #4096ff;
  color: #4096ff;
}

.btn-page:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.page-info {
  font-size: 14px;
  color: #595959;
}

/* ===== 弹窗（Modal） ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  width: 520px;
  max-width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #8c8c8c;
  padding: 0 4px;
  line-height: 1;
}

.modal-close:hover {
  color: #262626;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* ===== 表单 ===== */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 4px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  font-family: inherit;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #4096ff;
  box-shadow: 0 0 0 2px rgba(64, 150, 255, 0.2);
}

.form-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

/* ===== 动画 ===== */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .zelle-payout-page {
    padding: 12px;
  }

  .search-wrapper {
    flex-direction: column;
  }

  .search-input {
    min-width: 100%;
  }

  .btn {
    width: 100%;
  }

  .payout-table th,
  .payout-table td {
    padding: 8px 10px;
    font-size: 13px;
  }

  .modal-content {
    width: 95%;
  }
}
</style>