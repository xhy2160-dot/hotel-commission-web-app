<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>提现记录</h2>
      <button class="search-btn" type="button" @click="exportRows">导出</button>
    </header>

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
            placeholder="搜索订单/流水号..."
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
            {{ label }}
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
          :total="totalItems"
          :enableAction
          @action_btn_click="handleActionClick"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DataTable from "@/components/DataTable.vue"
import { formatLocalTime, formatLocalISO } from "@/utils/formatDate.js"
import {getWithdrawals} from "@/api/index.js";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import WithdrawPopover from "@/components/WithdrawPopover.vue";
import { useToast } from '@/composables/useToast';
import { downloadExcel, exportFileName } from '@/utils/exportExcel.js'
const { showToast } = useToast();
const route = useRoute()
const loading = ref(false);


// --- Active Tab State ---
const activeTab = ref('zelle') // 'zelle' or 'wechat'

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
  "-1":"失败",
  "0": "已提交",
  "1": "出款中",
  "2": "已出款",
  "3": "等待用户确认"
}

const zStatusMap={
  "0": "待审核",
  "1": "审核通过",
  "2": "审核拒绝",
  "3": "打款中",
  "4": "打款成功",
  "5": "打款失败"
}
const statusMap = ref(zStatusMap)
// Columns dynamically change based on active tab
const zelleColumns = ref([
  { key: "withdraw_no", label: "ID" },
  { key: "user_id", label: "用户ID" },
  { key: "zelle_name", label: "姓名" },
  { key: "zelle_phone", label: "Zelle 账号" },
  { key: "amount", label: "提现金额 (¥)" },
  { key: "status", label: "状态" },
  { key: "pay_remark", label: "备注" },
  { key: "reviewer_staff_id", label: "审核人" },
  { key: "paid_at", label: "付款时间" },
  { key: "created_at", label: "申请时间" },
])

const wechatColumns = ref([
  { key: "out_bill_no", label: "ID" },
  { key: "user_id", label: "用户ID" },
  { key: "real_name", label: "姓名" },
  { key: "amount", label: "提现金额 (¥)" },
  { key: "status", label: "状态" },
  { key: "reviewer_staff_id", label: "审核人" },
  { key: "paid_at", label: "付款时间" },
  { key: "created_at", label: "申请时间" }
])

const activeColumns = computed(() => {
  return activeTab.value === 'zelle' ? zelleColumns.value : wechatColumns.value
})

const enableAction = computed(() => {
  return activeTab.value === 'zelle'
})

const filteredData = computed(() => {
  if(!activeTab.value) return []
  const keyword = searchQuery.value.trim().toLowerCase()
  return data.value.filter((item) => {
    if (selectedStatus.value !== 'All' && String(item.status) !== String(selectedStatus.value)) return false
    if (!keyword) return true
    return Object.values(item).join(' ').toLowerCase().includes(keyword)
  }).map((item) => {
    return {
      ...item,
      created_at: activeTab.value === 'zelle'? formatLocalISO(item.create_time):formatLocalTime(new Date(item.created_at)),
      paid_at: item.paid_at ? formatLocalTime(item.paid_at) : '',
      status: activeTab.value === 'zelle'? zStatusMap[item.status]:wStatusMap[item.status],
    }
  })
})
// Tab Switch Handler
const handleTabChange = (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  statusMap.value = tab === 'zelle' ? zStatusMap : wStatusMap
  selectedStatus.value = 'All'
  currentPage.value = 1
  fetchWithdrawals()
}

// Fetch Data Mock / API call
const fetchWithdrawals = async () => {
  const params = new URLSearchParams({
    type: activeTab.value,
    page: currentPage.value,
    limit,
    status: selectedStatus.value,
    search: searchQuery.value
  })
  if (route.query.from) params.set('from', route.query.from)
  if (route.query.to) params.set('to', route.query.to)
  if (route.query.pending) params.set('pending', route.query.pending)
loading.value = true
  try {
    const res = await getWithdrawals(params)
 loading.value = false
    data.value = res.data
    totalItems.value = res.pagination?.totalItems || res.data?.length || 0
  } catch (error) {
    loading.value = false
    console.error("Failed to fetch withdrawals:", error)
    showToast('获取提现订单失败，请重试','error')
  }
}

// Re-fetch data whenever pagination, tab, or filters change
// watch([currentPage, selectedStatus], () => {
//   fetchWithdrawals()
// })
const handleActionClick =(item)=>{
  currentTransaction.value = item
  isPopoverOpen.value = true
}

const exportRows = () => {
  const columns = activeTab.value === 'zelle' ? zelleColumns.value : wechatColumns.value
  downloadExcel(exportFileName(activeTab.value === 'zelle' ? 'Zelle提现' : '微信提现'), columns, filteredData.value)
}

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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #333;
}
.page-header { display: flex; justify-content: space-between; align-items: center; }
.search-btn { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }

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