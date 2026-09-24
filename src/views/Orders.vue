<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>返现订单</h2>
      <button class="search-btn" @click="exportRows">导出</button>
    </header>
    <p v-if="route.query.cashback === '1'" class="filter-note">当前显示可返现和已返现的用户订单。</p>

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
      <DataTable :columns="columns" :data="filteredOrders" v-model:page="currentPage" :limit :total="totalItems" @page-change="fetchOrders" @update:page="val => currentPage = val">
        <template #[`cell(confirmation_num)`]="{ row }">
          <router-link class="order-link" :to="`/user-orders/${row.id}`">{{ row.confirmation_num }}</router-link>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import {computed, onMounted, ref, watch} from 'vue'
import { useRoute } from 'vue-router'
import DataTable from "@/components/DataTable.vue";
import {getOderByConfirm, getUserOrders} from "@/api/index.js";
import {formatLocalTime} from "@/utils/formatDate.js";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import {useToast} from "@/composables/useToast.js";
import { downloadExcel, exportFileName } from '@/utils/exportExcel.js'
const {showToast} = useToast();
const route = useRoute()
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
  "1": "可返现",
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
  if (route.query.from) params.set('from', route.query.from)
  if (route.query.to) params.set('to', route.query.to)
  if (route.query.cashback) params.set('cashback', route.query.cashback)
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
    return
  }
  const res =await getOderByConfirm({confirmation:searchQuery.value})
  data.value = res.data
}
onMounted(() => {
  fetchOrders()
})
watch(() => [route.query.from, route.query.to, route.query.cashback], () => {
  currentPage.value = 1
  fetchOrders()
})

const exportColumns = [
  { key: 'order_no', label: '订单号' },
  { key: 'confirmation_num', label: '确认号' },
  { key: 'user_id', label: '用户ID' },
  { key: 'hotel_name_cn', label: '酒店' },
  { key: 'commission_cny', label: '人民币佣金合计' },
  { key: 'rebate_rate', label: '当时返现比例' },
  { key: 'amount', label: '人民币应返' },
  { key: 'status', label: '状态' },
  { key: 'submitted_at', label: '提交时间' },
]
const exportRows = async () => {
  const params = new URLSearchParams({ page: 1, limit: 5000 })
  if (route.query.from) params.set('from', route.query.from)
  if (route.query.to) params.set('to', route.query.to)
  if (route.query.cashback) params.set('cashback', route.query.cashback)
  if (searchQuery.value.trim()) params.set('confirmation', searchQuery.value.trim())
  const res = await getUserOrders(params)
  const rows = (res.data || []).map((order) => ({
    ...order,
    status: statusMap[order.status] || order.status,
  }))
  downloadExcel(exportFileName('订单'), exportColumns, rows)
}
</script>

<style scoped>
.orders-page {
  max-width: 1500px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #333;
}

.page-header { display: flex; justify-content: space-between; align-items: center; }
.page-header h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.5rem;
}
.search-btn { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
.filter-note { color: #6b7280; font-size: 13px; }

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

.order-link {
  color: #2563eb;
  font-weight: 600;
  text-decoration: none;
}
</style>