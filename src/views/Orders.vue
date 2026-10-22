<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>返现订单</h2>
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
            @keyup.enter="handleSearch"
        />
        <button v-if="searchQuery" @click="clearSearch" class="clear-btn">✕</button>
      </div>

      <div class="date-range">
        <label class="date-field">
          <span>从</span>
          <input v-model="from" type="date" lang="zh-CN" class="date-input" @keyup.enter="handleSearch" />
        </label>
        <label class="date-field">
          <span>到</span>
          <input v-model="to" type="date" lang="zh-CN" class="date-input" @keyup.enter="handleSearch" />
        </label>
      </div>

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

      <button class="search-btn" @click="handleSearch">查询</button>
      <button class="search-btn ghost" @click="exportRows">导出</button>
    </div>
<LoadingSpinner v-if="loading"/>
    <!-- Data Table -->
    <div class="table-container">
      <DataTable :columns="columns" :data="filteredOrders" v-model:page="currentPage" :limit :total="totalItems" @page-change="fetchOrders" @update:page="val => currentPage = val">
        <template #[`cell(id)`]="{ row }">  <router-link class="order-link" :to="`/user-orders/${row.id}`">{{ row.id }}</router-link> </template>
        <template #[`cell(user_id)`]="{ row }">
          <router-link class="order-link" :to="`/users/${row.user_id}`">{{ row.user_id }}</router-link>
        </template>
        <template #[`cell(confirmation_num)`]="{ row }"><div @click="searchScraperOrder(row.confirmation_num)"><span :style="{ color: '#0000FF', cursor:'pointer',textDecoration: 'underline' }">{{ row.confirmation_num }}</span></div>
        </template>
        <template #[`cell(status)`]="{ row }"> <span :style="{ color: statusMap[String(row.status)]?.color || '#000' }" > {{ statusMap[String(row.status)]?.label || '未知' }} </span> </template>
      </DataTable>
    </div>
  </div>
  <JSONPopover :isOpen="JSONPopoverOpen" :searchData="scraperOrders" @close="JSONPopoverOpen=false"/>
</template>

<script setup>
import {computed, onMounted, ref, watch} from 'vue'
import { useRoute } from 'vue-router'
import DataTable from "@/components/DataTable.vue";
import JSONPopover from "@/components/JSONPopover.vue"
import {getOderByConfirm, getUserOrders,searchScraperOrders} from "@/api/index.js";
import {formatRowTime} from "@/utils/formatDate.js";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import {useToast} from "@/composables/useToast.js";
import { downloadExcel, exportFileName } from '@/utils/exportExcel.js'
const {showToast} = useToast();
const route = useRoute()
// --- State ---
const searchQuery = ref('')
const selectedStatus = ref('All')
const from = ref(route.query.from ? String(route.query.from) : '')
const to = ref(route.query.to ? String(route.query.to) : '')

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
  "createdAt",
  "updatedAt"
])

const data = ref([])


const statusMap = {
  "0": { label: "已提交", color: '#000' },    // Blue (Pending / Submitted)
  "1": { label: "可返现", color: '#A1D99B' },    // Light Green (Eligible)
  "2": { label: "已返现", color: '#238B45' },    // Dark Green (Completed)
  "3": { label: "可申诉", color: '#FFB74D' },    // Orange (Action required)
  "4": { label: "已提交申诉", color: '#FB8C00' },  // Purple/Indigo (Appeal in progress)
  "5": { label: "关闭", color: '#969696' },      // Grey (Closed)
  "6": { label: "已删除", color: '#636363' }     // Red (Deleted)
};


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
        createdAt: formatRowTime(order, ['createdAt', 'created_at', 'submitted_at', 'create_time']),
        updatedAt: formatRowTime(order, ['updatedAt']),
      }))
})

// Methods
const fetchOrders = async () => {
  const params = new URLSearchParams({
    page: currentPage.value,
    limit,
    status: selectedStatus.value,
  })
  if (from.value) params.set('from', from.value)
  if (to.value) params.set('to', to.value)
  if (route.query.cashback) params.set('cashback', route.query.cashback)
  if (searchQuery.value.trim()) params.set('confirmation', searchQuery.value.trim())
  loading.value = true
  try {
    const res = await getUserOrders(params)
    loading.value = false
    data.value = res.data || []
    currentPage.value = res.pagination?.currentPage || 1
    totalItems.value = res.pagination?.totalItems || 0
  } catch (error) {
    console.error("Error fetching user orders:", error)
    loading.value = false
    showToast('获取订单失败，请重试','error')
  }
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

const scraperOrders = ref(null)
const JSONPopoverOpen = ref(false)

const searchScraperOrder = async (confirmNo) => {
  if (!confirmNo) return;

  loading.value = true;
  try {
    const res = await searchScraperOrders({ query: String(confirmNo) });
    scraperOrders.value = res?.data || [];
    JSONPopoverOpen.value = true;
  } catch (error) {
    console.error('Failed to fetch scraper orders:', error);
    // Optional: add UI notification/toast alert here
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchOrders()
})
watch(() => [route.query.from, route.query.to, route.query.cashback], ([newFrom, newTo]) => {
  from.value = newFrom ? String(newFrom) : ''
  to.value = newTo ? String(newTo) : ''
  currentPage.value = 1
  fetchOrders()
})

watch(() => selectedStatus.value, () => {
  currentPage.value = 1
  fetchOrders()
})

const dateOnly = (value) => {
  const raw = String(value ?? '').trim()
  return raw ? raw.slice(0, 10) : ''
}

const exportColumns = [
  { key: 'order_no', label: '订单号' },
  { key: 'confirmation_num', label: '确认号' },
  { key: 'user_id', label: '用户ID' },
  { key: 'hotel_name_cn', label: '酒店' },
  { key: 'check_in_date', label: '入住日期' },
  { key: 'check_out_date', label: '离店日期' },
  { key: 'orig_amount', label: '原币金额' },
  { key: 'orig_currency', label: '原币种' },
  { key: 'fx_rate', label: '汇率' },
  { key: 'cny_amount', label: '人民币金额' },
  { key: 'rebate_rate', label: '当时返现比例' },
  { key: 'amount', label: '人民币应返' },
  { key: 'status', label: '状态' },
  { key: 'submitted_at', label: '提交时间' },
  { key: 'updatedAt', label: '更新时间' },
]

const parseCalcLines = (order) => {
  if (Array.isArray(order?.calc_lines) && order.calc_lines.length) return order.calc_lines
  const raw = order?.calc_detail
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const joinExportValues = (values, unique = false) => {
  const texts = values
    .map((value) => (value === null || value === undefined || value === '' ? '' : String(value)))
    .filter(Boolean)
  return (unique ? [...new Set(texts)] : texts).join('；')
}

const snapshotExport = (order) => {
  const lines = parseCalcLines(order)
  const cnyFromLines = joinExportValues(lines.map((line) => line.cny))
  return {
    orig_amount: joinExportValues(lines.map((line) => line.amount)),
    orig_currency: joinExportValues(lines.map((line) => line.currency), true),
    fx_rate: joinExportValues(lines.map((line) => line.fx_rate), true),
    cny_amount: order.commission_cny ?? cnyFromLines,
  }
}

const exportRows = async () => {
  try {
    const params = new URLSearchParams({ page: 1, limit: 5000 })
    if (from.value) params.set('from', from.value)
    if (to.value) params.set('to', to.value)
    if (route.query.cashback) params.set('cashback', route.query.cashback)
    if (selectedStatus.value !== 'All') params.set('status', selectedStatus.value)
    if (searchQuery.value.trim()) params.set('confirmation', searchQuery.value.trim())
    const res = await getUserOrders(params)
    const rows = (res.data || []).map((order) => ({
      ...order,
      order_no: order.order_no || order.id || '',
      check_in_date: dateOnly(order.check_in_date),
      check_out_date: dateOnly(order.check_out_date),
      ...snapshotExport(order),
      rebate_rate: order.rebate_rate === null || order.rebate_rate === undefined || order.rebate_rate === ''
        ? ''
        : `${Math.round(Number(order.rebate_rate) * 1000) / 10}%`,
      status: statusMap[String(order.status)]?.label || order.status,
      submitted_at: formatRowTime(order, ['submitted_at', 'created_at', 'createdAt', 'create_time']),
      updatedAt: formatRowTime(order, ['updatedAt']),
    }))
    downloadExcel(exportFileName('订单'), exportColumns, rows)
  } catch (error) {
    showToast('导出订单失败', 'error')
  }
}
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

/* Toolbar & Filters */
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

/* Dropdown Select Styling */
.status-select-wrapper {
  min-width: 140px;
}

.status-select {
  width: 100%;
  padding: 9px 14px;
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

.search-btn { padding: 10px 18px; border: none; border-radius: 6px; background: #2563eb; color: white; cursor: pointer; white-space: nowrap; }
.search-btn.ghost { background: #fff; color: #111827; border: 1px solid #d1d5db; }

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