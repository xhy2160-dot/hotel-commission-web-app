<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>返现订单</h2>
    </header>

    <!-- Search Bar & Filters -->
    <div class="filter-toolbar">
      <div class="search-box">
        <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索唯一确认号..."
            class="search-input"
            @input="handleSearchOrder"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">✕</button>
      </div>

      <!-- Status Select Dropdown -->
<!--      <div class="status-select-wrapper">-->
<!--        <select v-model="selectedStatus" class="status-select">-->
<!--          <option value="All">全部状态</option>-->
<!--          <option-->
<!--              v-for="(label, key) in statusMap"-->
<!--              :key="key"-->
<!--              :value="key"-->
<!--          >-->
<!--            {{ label }}-->
<!--          </option>-->
<!--        </select>-->
<!--      </div>-->
    </div>
<LoadingSpinner v-if="loading"/>
    <!-- Data Table -->
    <div class="table-container" v-if="!loading">
      <DataTable :columns="columns" :data="filteredOrders" v-model:page="currentPage" :limit :total="totalItems" @page-change="fetchOrders" @update:page="val => currentPage = val" />
    </div>
  </div>
</template>

<script setup>
import {computed, onMounted, ref} from 'vue'
import DataTable from "@/components/DataTable.vue";
import {getOderByConfirm, getUserOrders} from "@/api/index.js";
import {formatLocalTime} from "@/utils/formatDate.js";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import {useToast} from "@/composables/useToast.js";
const {showToast} = useToast();
// --- State ---
const searchQuery = ref('')
const selectedStatus = ref('All')

const currentPage = ref(1)
const limit = 10
const totalItems = ref(0)
const loading = ref(false)


// Table columns
const columns = ref([
  "id",
  "user_id",
  "amount",
  "check_in_date",
  "check_out_date",
  "confirmation_num",
  "hotel_name_cn",
  "status",
  "remark",
  "appeal_id",
  "createdAt"
])

const data = ref([])

const statusMap = {
  "0": "已提交",
  "1": "已匹配",
  "2": "已返现",
  "3": "可申诉",
  "4": "已提交申述",
  "5": "关闭"
}


// --- Filtering & Searching ---
// --- Filtering, Searching & Mapping ---
const filteredOrders = computed(() => {
  return data.value
      .filter(order => {
        // 2. Status filter (comparing against raw numeric string status)
        return selectedStatus.value === 'All' || String(order.status) === selectedStatus.value
      })
      .map(order => ({
        ...order,
        // Maps numeric status to human-readable label (e.g. "0" -> "已提交")
        status: statusMap[order.status] || order.status,
        createdAt:formatLocalTime(order.createdAt),
      }))
})

// Methods
const fetchOrders = async () => {
  const params = new URLSearchParams({
    page: currentPage.value,
    limit,
  })
  loading.value = true
  try {
    const res = await getUserOrders(params)
    loading.value = false
    data.value = res.data
    currentPage.value = res.pagination.currentPage
    totalItems.value = res.pagination.totalItems
  } catch (error) {
    console.error("Error fetching user orders:", error)
    loading.value = false
    showToast('获取订单失败，请重试','error')
  }
}
const handleSearchOrder=async ()=>{
  if(!searchQuery.value.trim()){
    currentPage.value=1
    await fetchOrders()
  }
  const res =await getOderByConfirm({confirmation:searchQuery.value})
  data.value = res.data
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #333;
}

.page-header h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.5rem;
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

/* Dropdown Select Styling */
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
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.status-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Table Container */
.table-container {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}
</style>