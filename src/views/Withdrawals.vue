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
      >
        <template #[`cell(user_id)`]="{ row }">
          <router-link class="order-link" :to="`/users/${row.user_id}`">{{ row.user_id }}</router-link>      </template>
          <template #[`cell(status)`]="{ row }"> <span :style="{ color: row.status.color || '#000' }" > {{ row.status.label }} </span> </template>

      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DataTable from "@/components/DataTable.vue"
import { formatRowTime } from "@/utils/formatDate.js"
import {getWithdrawals} from "@/api/index.js";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import WithdrawPopover from "@/components/WithdrawPopover.vue";
import { useToast } from '@/composables/useToast';
const { showToast } = useToast();
import { downloadExcel, exportFileName } from '@/utils/exportExcel.js'



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
  { key: "created_at", label: "申请时间" },
  { key: "paid_at", label: "付款时间" },
  { key: "staff", label: "审核人" },
])

const wechatColumns = ref([
  { key: "out_bill_no", label: "ID" },
  { key: "user_id", label: "用户ID" },
  { key: "real_name", label: "姓名" },
  { key: "amount", label: "提现金额 (¥)" },
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
      created_at: formatRowTime(item, activeTab.value === 'zelle'
        ? ['create_time', 'created_at', 'createdAt']
        : ['created_at', 'create_time', 'createdAt']),
      updated_at: formatRowTime(item, activeTab.value === 'zelle'
        ? ['update_time', 'updated_at', 'updatedAt']
        : ['updated_at', 'update_time', 'updatedAt']),
      paid_at: formatRowTime(item, ['paid_at', 'pay_time', 'paidAt']),
      status: activeTab.value === 'zelle'? zStatusMap[item.status]:wStatusMap[item.status],
      actionable:item.status===0
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