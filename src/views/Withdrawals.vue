<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>提现记录</h2>
      <button class="search-btn" type="button" @click="exportRows">导出</button>
    </header>
    <p class="hint">关联订单按各订单返现到账时间先进先出分摊。失败或拒绝的提现不占额度。</p>

    <!-- Tab Bar for Switching Withdrawal Methods -->
    <div class="tab-bar">
      <button
          :class="['tab-btn', { active: activeTab === 'zelle' }]"
          @click="handleTabChange('zelle')"
      >
        Zelle 提现
      </button>
      <button
          :class="['tab-btn', { active: activeTab === 'wechat' }]"
          @click="handleTabChange('wechat')"
      >
        微信提现
      </button>
    </div>

    <!-- Search Bar & Filters -->
    <div class="filter-toolbar">
      <div class="search-box">
        <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索流水号/用户/关联订单号..."
            class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">✕</button>
      </div>

      <!-- Status Select Dropdown -->
      <div class="status-select-wrapper">
        <select v-model="selectedStatus" class="status-select">
          <option value="All">全部状态</option>
          <option
              v-for="(label, key) in statusMap"
              :key="key"
              :value="key"
          >
            {{ label.label }}
          </option>
        </select>
      </div>
    </div>

<!--     Data Table-->
    <WithdrawPopover :isOpen="isPopoverOpen" :data="currentTransaction" @close="isPopoverOpen = false" @save="fetchWithdrawals()" />
    <LoadingSpinner v-if="loading" />
    <div v-if="!loading" class="table-container">
      <DataTable
          :columns="activeColumns"
          :data="filteredData"
          v-model:page="currentPage"
          :limit="limit"
          :total="filteredData.length"
          :enableAction
          @action_btn_click="handleActionClick"
      >
        <template #[`cell(user_id)`]="{ row }">
          <router-link class="order-link" :to="`/users/${row.user_id}`">{{ row.user_id }}</router-link>
        </template>
        <template #[`cell(status)`]="{ row }">
          <span :style="{ color: row.status.color || '#000' }">{{ row.status.label }}</span>
        </template>
        <template #[`cell(order_alloc_text)`]="{ row }">
          <div v-if="row.order_lines?.length" class="alloc">
            <div v-for="line in row.order_lines" :key="line.order_id">
              <router-link class="order-link" :to="`/user-orders/${line.order_id}`">{{ line.order_no }}</router-link>
              <span> ¥{{ Number(line.amount).toFixed(2) }}</span>
            </div>
            <div v-if="row.order_unallocated > 0" class="alloc-gap">未匹配 ¥{{ Number(row.order_unallocated).toFixed(2) }}</div>
          </div>
          <span v-else-if="row.order_unallocated > 0" class="alloc-gap">未匹配 ¥{{ Number(row.order_unallocated).toFixed(2) }}</span>
          <span v-else>-</span>
        </template>

      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import DataTable from "@/components/DataTable.vue"
import { formatRowTime } from "@/utils/formatDate.js"
import { getWithdrawals, getUserOrders } from "@/api/index.js";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import WithdrawPopover from "@/components/WithdrawPopover.vue";
import { useToast } from '@/composables/useToast';
const { showToast } = useToast();
import { downloadExcel, exportFileName } from '@/utils/exportExcel.js'
import { allocateWithdrawalsFifo, withdrawalKey } from '@/utils/withdrawAllocation.js'



const route = useRoute()
const loading = ref(false);


// --- Active Tab State ---
const activeTab = ref('wechat') // 'zelle' or 'wechat'

// --- Table State ---
const searchQuery = ref('')
const selectedStatus = ref('All')
const currentPage = ref(1)
const limit = 10
const totalItems = ref(0)
const data = ref([])

//popover
const isPopoverOpen = ref(false);
const currentTransaction = ref({})

// Status mapping
const wStatusMap = {
  "-1": { label: "失败", color: "#f56c6c" },          // Danger Red
  "0":  { label: "已提交", color: "#909399" },        // Info Gray
  "1":  { label: "出款中", color: "#e6a23c" },        // Warning Orange
  "2":  { label: "已出款", color: "#67c23a" },        // Success Green
  "3":  { label: "等待用户确认", color: "#409eff" }   // Primary Blue
};

const zStatusMap = {
  "0": { label: "待审核", color: "#e6a23c" },        // Warning Orange
  "1": { label: "审核通过", color: "#409eff" },      // Primary Blue
  "2": { label: "审核拒绝", color: "#f56c6c" },      // Danger Red
  "3": { label: "打款中", color: "#e6a23c" },        // Warning Orange
  "4": { label: "打款成功", color: "#67c23a" },      // Success Green
  "5": { label: "打款失败", color: "#f56c6c" }       // Danger Red
};

const statusMap = ref(wStatusMap)
// Columns dynamically change based on active tab
const zelleColumns = ref([
  { key: "withdraw_no", label: "ID" },
  { key: "user_id", label: "用户ID" },
  { key: "zelle_name", label: "姓名" },
  { key: "zelle_phone", label: "Zelle 账号" },
  { key: "amount", label: "提现金额 (¥)" },
  { key: "order_alloc_text", label: "关联订单" },
  { key: "status", label: "状态" },
  { key: "pay_remark", label: "备注" },
  { key: "created_at", label: "申请时间" },
  { key: "paid_at", label: "付款时间" },
  { key: "staff", label: "审核人" },
])

const wechatColumns = ref([
  { key: "out_bill_no", label: "ID" },
  { key: "user_id", label: "用户ID" },
  { key: "real_name", label: "姓名" },
  { key: "amount", label: "提现金额 (¥)" },
  { key: "order_alloc_text", label: "关联订单" },
  { key: "status", label: "状态" },
  { key: "created_at", label: "申请时间" },
  { key: "updated_at", label: "付款时间" },
])

const activeColumns = computed(() => {
  return activeTab.value === 'zelle' ? zelleColumns.value : wechatColumns.value
})

const enableAction = computed(() => {
  return activeTab.value === 'zelle'
})

const allocMap = ref(new Map())
const allByType = ref({ wechat: [], zelle: [] })

const allocationOf = (item, type = activeTab.value) => {
  return allocMap.value.get(withdrawalKey(item, type)) || { lines: [], unallocated: 0, text: '', nos: '' }
}

const decorateRow = (item, type = activeTab.value) => {
  const alloc = allocationOf(item, type)
  return {
    ...item,
    created_at: formatRowTime(item, type === 'zelle'
      ? ['create_time', 'created_at', 'createdAt']
      : ['created_at', 'create_time', 'createdAt']),
    updated_at: formatRowTime(item, type === 'zelle'
      ? ['update_time', 'updated_at', 'updatedAt']
      : ['updated_at', 'update_time', 'updatedAt']),
    paid_at: formatRowTime(item, ['paid_at', 'pay_time', 'paidAt', 'payout_at']),
    status: type === 'zelle' ? zStatusMap[item.status] : wStatusMap[item.status],
    actionable: item.status === 0,
    order_lines: alloc.lines,
    order_unallocated: alloc.unallocated,
    order_alloc_text: alloc.text,
    order_nos: alloc.nos,
  }
}

const filteredData = computed(() => {
  if (!activeTab.value) return []
  const keyword = searchQuery.value.trim().toLowerCase()
  return data.value.filter((item) => {
    if (selectedStatus.value !== 'All' && String(item.status) !== String(selectedStatus.value)) return false
    const alloc = allocationOf(item)
    if (!keyword) return true
    const haystack = [
      ...Object.values(item),
      alloc.text,
      alloc.nos,
      ...(alloc.lines || []).map((line) => `${line.order_no} ${line.confirmation_num} ${line.order_id}`),
    ].join(' ').toLowerCase()
    return haystack.includes(keyword)
  }).map((item) => decorateRow(item))
})

const handleTabChange = (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  statusMap.value = tab === 'zelle' ? zStatusMap : wStatusMap
  selectedStatus.value = 'All'
  currentPage.value = 1
  data.value = allByType.value[tab] || []
  totalItems.value = data.value.length
}

async function fetchAllPages(loadPage) {
  const pageSize = 200
  const rows = []
  let page = 1
  let total = Infinity
  while (page <= 50 && rows.length < total) {
    const res = await loadPage(page, pageSize)
    const chunk = res?.data || []
    total = Number(res?.pagination?.totalItems || rows.length + chunk.length)
    rows.push(...chunk)
    if (!chunk.length || chunk.length < pageSize) break
    page += 1
  }
  return rows
}

async function fetchAllWithdrawals(type) {
  return fetchAllPages((page, pageSize) => {
    const params = new URLSearchParams({
      type,
      page: String(page),
      limit: String(pageSize),
      status: 'All',
    })
    if (route.query.from) params.set('from', route.query.from)
    if (route.query.to) params.set('to', route.query.to)
    return getWithdrawals(params)
  })
}

async function fetchCashbackOrders() {
  const rows = await fetchAllPages((page, pageSize) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      cashback: '1',
    })
    return getUserOrders(params)
  })
  return rows.filter((order) => [1, 2].includes(Number(order.status)))
}

const fetchWithdrawals = async () => {
  loading.value = true
  try {
    const [orders, wechat, zelle] = await Promise.all([
      fetchCashbackOrders().catch(() => []),
      fetchAllWithdrawals('wechat'),
      fetchAllWithdrawals('zelle'),
    ])
    allByType.value = { wechat, zelle }
    allocMap.value = allocateWithdrawalsFifo(orders, [
      ...wechat.map((item) => ({ ...item, channel: 'wechat' })),
      ...zelle.map((item) => ({ ...item, channel: 'zelle' })),
    ])
    data.value = allByType.value[activeTab.value] || []
    totalItems.value = data.value.length
    loading.value = false
  } catch (error) {
    loading.value = false
    console.error("Failed to fetch withdrawals:", error)
    showToast('获取提现订单失败，请重试','error')
  }
}

const handleActionClick =(item)=>{
  currentTransaction.value = item
  isPopoverOpen.value = true
}

const exportRows = () => {
  const columns = [
    ...(activeTab.value === 'zelle' ? zelleColumns.value : wechatColumns.value),
    { key: 'order_nos', label: '关联订单号' },
  ]
  downloadExcel(
    exportFileName(activeTab.value === 'zelle' ? 'Zelle提现' : '微信提现'),
    columns,
    filteredData.value,
  )
}

watch([searchQuery, selectedStatus], () => {
  currentPage.value = 1
})

onMounted(() => {
  if (route.query.pending === '1') selectedStatus.value = '0'
  fetchWithdrawals()
})
</script>

<style scoped>
.orders-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  color: #333;
}
.page-header { display: flex; justify-content: space-between; align-items: center; }
.hint { color: #6b7280; font-size: 13px; margin: 8px 0 16px; }
.search-btn { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
.alloc { display: flex; flex-direction: column; gap: 4px; font-size: 13px; line-height: 1.4; }
.alloc-gap { color: #b45309; }
.order-link { color: #2563eb; }

/* Tab Switcher Styling */
.tab-bar {
  display: flex;
  gap: 12px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 20px;
}

.tab-btn {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  font-size: 1rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -2px;
}

.tab-btn:hover {
  color: #2563eb;
}

.tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 600;
}

/* Toolbar & Filters */
.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 280px;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;
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

.status-select-wrapper {
  min-width: 160px;
}

.status-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: #ffffff;
  font-size: 0.9rem;
  color: #374151;
  outline: none;
  cursor: pointer;
}

.table-container {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}
</style>