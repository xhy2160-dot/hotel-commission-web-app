<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>提现记录</h2>
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
    <LoadingSpinner v-if="loading" />
    <div v-if="!loading" class="table-container">
      <DataTable
          :columns="activeColumns"
          :data="data"
          v-model:page="currentPage"
          :limit="limit"
          :total="totalItems"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import DataTable from "@/components/DataTable.vue"
import { formatLocalTime } from "@/utils/formatDate.js"
import {getWithdrawals} from "@/api/index.js";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import {useToast} from "@/composables/useToast.js";

const showToast = useToast();
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

// Status mapping
const statusMap = {
  "0": "处理中",
  "1": "已转账",
  "2": "提现失败",
  "3": "已关闭"
}

// Columns dynamically change based on active tab
const zelleColumns = ref([
  { key: "id", label: "ID" },
  { key: "user_id", label: "用户ID" },
  { key: "zelle_email", label: "Zelle 账号/邮箱" },
  { key: "amount", label: "提现金额 ($)" },
  { key: "status", label: "状态" },
  { key: "createdAt", label: "申请时间" }
])

const wechatColumns = ref([
  { key: "id", label: "ID" },
  { key: "user_id", label: "用户ID" },
  { key: "wechat_openid", label: "微信OpenID" },
  { key: "amount_rmb", label: "提现金额 (¥)" },
  { key: "status", label: "状态" },
  { key: "createdAt", label: "申请时间" }
])

const activeColumns = computed(() => {
  return activeTab.value === 'zelle' ? zelleColumns.value : wechatColumns.value
})

// Tab Switch Handler
const handleTabChange = (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  currentPage.value = 1 // Reset pagination on tab switch
  fetchWithdrawals()
}

// Fetch Data Mock / API call
const fetchWithdrawals = async () => {
  const params = new URLSearchParams({
    type: activeTab.value, // Pass 'zelle' or 'wechat' to backend
    page: currentPage.value,
    limit,
    status: selectedStatus.value,
    search: searchQuery.value
  })
loading.value = true
  try {
    const res = await getWithdrawals(params)
 loading.value = false
    data.value = res.data
    totalItems.value = res.pagination.totalItems
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

onMounted(() => {
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