<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>凯悦订单</h2>
    </header>
    <p class="filter-note">仅显示凯悦订单：chain_code = HY、funding_status = FUNDED、commission_status = COMMISSION（数据来自 Onyx 订单汇总）。</p>

    <div class="filter-toolbar">
      <div class="search-box">
        <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索确认号..."
            class="search-input"
            @keyup.enter="handleSearch"
        />
        <button v-if="searchQuery" @click="clearSearch" class="clear-btn">✕</button>
      </div>

      <div class="date-range">
        <label class="date-field">
          <span>入住从</span>
          <input v-model="from" type="date" lang="zh-CN" class="date-input" @keyup.enter="handleSearch" />
        </label>
        <label class="date-field">
          <span>到</span>
          <input v-model="to" type="date" lang="zh-CN" class="date-input" @keyup.enter="handleSearch" />
        </label>
      </div>

      <button class="search-btn" @click="handleSearch">查询</button>
    </div>

    <div class="tab-bar">
      <div
          v-for="tab in tabList"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
      >
        {{ tab.name }}
      </div>
    </div>

    <LoadingSpinner v-if="loading" />
    <div class="table-container">
      <DataTable :columns="columns" :data="displayRows" v-model:page="currentPage" :limit :total="totalItems" @page-change="fetchOrders" @update:page="val => currentPage = val">
        <template #[`cell(action)`]="{ row }">
          <button type="button" class="bind-btn" @click="openBind(row)">{{ row.bound_order_no ? '重新绑定' : '绑定' }}</button>
        </template>
      </DataTable>
    </div>
  </div>
  <HyattBindPopover :isOpen="bindOpen" :data="bindRow" @close="bindOpen = false" @save="onBindSaved" />
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import DataTable from '@/components/DataTable.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getHyattOrders } from '@/api/index.js'
import HyattBindPopover from '@/components/HyattBindPopover.vue'
import { formatRowTime } from '@/utils/formatDate.js'
import { useToast } from '@/composables/useToast.js'

const { showToast } = useToast()

const tabList = [
  { key: 'unbound', name: '未绑定' },
  { key: 'bound', name: '已绑定' },
]
const activeTab = ref('unbound')

const searchQuery = ref('')
const from = ref('')
const to = ref('')

const currentPage = ref(1)
const limit = 10
const totalItems = ref(0)
const loading = ref(false)
const data = ref([])

const baseColumns = [
  { key: 'id', label: 'ID' },
  { key: 'confirmation_number', label: '确认号' },
  { key: 'property_name', label: '酒店' },
  { key: 'guest_last_name', label: '住客' },
  { key: 'arrival_date', label: '入住' },
  { key: 'departure_date', label: '离店' },
  { key: 'nights', label: '房晚' },
  { key: 'rooms', label: '房间' },
  { key: 'commission_amount', label: '佣金' },
  { key: 'commission_currency', label: '佣金币种' },
  { key: 'payment_amount', label: '付款金额' },
  { key: 'payment_currency', label: '付款币种' },
  { key: 'payment_date', label: '付款日期' },
  { key: 'invoice_number', label: '发票号' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'bound_order_no', label: '客户提交订单号' },
  { key: 'action', label: '操作', sortable: false },
]

// Per-tab columns: unbound hides the (always empty) bound-number column;
// bound hides the action column.
const columns = computed(() => baseColumns.filter((col) => {
  if (activeTab.value === 'unbound') return col.key !== 'bound_order_no'
  if (activeTab.value === 'bound') return col.key !== 'action'
  return true
}))

const dateOnly = (value) => {
  const raw = String(value ?? '').trim()
  return raw ? raw.slice(0, 10) : '-'
}

const displayRows = computed(() => data.value.map((row) => ({
  ...row,
  arrival_date: dateOnly(row.arrival_date),
  departure_date: dateOnly(row.departure_date),
  payment_date: dateOnly(row.payment_date),
  createdAt: formatRowTime(row, ['createdAt', 'created_at', 'create_time']),
})))

const fetchOrders = async () => {
  const params = new URLSearchParams({
    page: currentPage.value,
    limit,
  })
  params.set('bound', activeTab.value === 'bound' ? '1' : '0')
  if (searchQuery.value.trim()) params.set('confirmation', searchQuery.value.trim())
  if (from.value) params.set('from', from.value)
  if (to.value) params.set('to', to.value)
  loading.value = true
  try {
    const res = await getHyattOrders(params)
    data.value = res.data || []
    currentPage.value = res.pagination?.currentPage || 1
    totalItems.value = res.pagination?.totalItems || 0
  } catch (error) {
    console.error('Error fetching Hyatt orders:', error)
    showToast('获取凯悦订单失败，请重试', 'error')
  } finally {
    loading.value = false
  }
}

const switchTab = async (key) => {
  if (activeTab.value === key) return
  activeTab.value = key
  currentPage.value = 1
  await fetchOrders()
}

const handleSearch = async () => {
  currentPage.value = 1
  await fetchOrders()
}

const clearSearch = async () => {
  searchQuery.value = ''
  currentPage.value = 1
  await fetchOrders()
}

const bindOpen = ref(false)
const bindRow = ref(null)

const openBind = (row) => {
  bindRow.value = row
  bindOpen.value = true
}

const onBindSaved = ({ id, customer_order_no }) => {
  const row = data.value.find((item) => item.id === id)
  if (row) row.bound_order_no = customer_order_no
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.orders-page {
  max-width: 1500px;
  margin: 0 auto;
  padding: 24px;
  color: #333;
}

.page-header { display: flex; justify-content: space-between; align-items: center; }
.page-header h2 { margin-top: 0; }
.filter-note { color: #6b7280; font-size: 13px; margin-top: -10px; margin-bottom: 16px; }

.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 220px;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.clear-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
}

.date-range { display: flex; gap: 8px; align-items: center; }
.date-field { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #4b5563; }
.date-input { padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; color: #111827; background: #fff; box-sizing: border-box; }

.search-btn { padding: 10px 18px; border: none; border-radius: 6px; background: #2563eb; color: white; cursor: pointer; white-space: nowrap; }

.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.tab-item {
  padding: 8px 18px;
  cursor: pointer;
  font-size: 14px;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab-item:hover { color: #111827; }

.tab-item.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 600;
}

.bind-btn {
  padding: 5px 12px;
  border: 1px solid #2563eb;
  background: #fff;
  color: #2563eb;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 13px;
}
.bind-btn:hover { background: #eff6ff; }

.table-container {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}
</style>
