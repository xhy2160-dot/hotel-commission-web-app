<template>
  <div class="appeal-container">
    <!-- 1. Search Section -->
    <div class="search-box">
      <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索唯一订单号..."
          class="search-input"
          @keyup.enter="handleSearch"
      />
      <button class="btn btn-primary" @click="handleSearch">查询</button>
      <button v-if="searchKeyword" class="btn btn-secondary" @click="handleReset">重置</button>
    </div>

  <LoadingSpinner v-if="loading"></LoadingSpinner>

    <!-- 2. Status Filter Tabs -->
    <div class="tab-bar" v-if="!isSearch">
      <div
          v-for="(tab, index) in tabList"
          :key="index"
          class="tab-item"
          :class="{ active: currentTab === index }"
          @click="handleTabChange(index)"
      >
        {{ tab.name }}
      </div>
    </div>
    <!-- 3. Table Component -->
    <div class="table-wrapper" v-if="!isSearch">
      <DataTable
          :total
          :columns
          :data="formattedOrders"
          v-model:page="currentPage"
      />
    </div>
    <div class="json-container" v-if="isSearch">
      <pre v-if="searchData.length>0"><code>{{ JSON.stringify(searchData, null, 2) }}</code></pre>
      <pre v-else ><code>{{ '未找到相关记录' }}</code></pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import DataTable from '@/components/DataTable.vue'
import {getScrapperOrders, searchScraperOrders} from "@/api/index.js";
import {formatToLocalTime} from '@/utils/formatDate.js'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const searchKeyword = ref('')
const currentTab = ref(0)
const loading = ref(false)
const isSearch = ref(false)

const tabList = ref([
  { name: 'ONYX' },
  { name: 'TACS' },
])

const total = ref(0)
const currentPage = ref(1)
const searchData = ref({
  tacs_id: 10293,
  guest_name: "LUO, WENWEI",
  confirmation: "3374032874",
  payment_amt: "17.85",
  payment_curr: "USD"
});

const onyxColumns =[
  {key:'id',label:'id'},
  {key:'confirmation_number',label:'确认号'},
  {key:'gnr_num',label:'gnr_num'},
  {key:'property_name',label:'酒店名'},
  {key:'guest_last_name',label:'客人姓'},
  {key:'arrival_date',label:'入住'},
  {key:'departure_date',label:'离店'},
  {key:'commission_amount',label:'金额'},
  {key:'commission_currency',label:'币种'},
  {key:'commission_status',label:'佣金状态'},
  {key:'createdAt',label:'爬取'}]

const columns = ref(onyxColumns)

const tacColumns = [
  { key: "tacs_id", label: "TACS ID" },
  { key: "payor_name", label: "酒店名称" },
  { key: "guest_name", label: "客人姓名" },
  { key: "confirmation", label: "确认号" },
  { key: "arrival", label: "入住" },
  { key: "departure", label: "离店" },
  { key: "txn", label: "佣金状态" },
  { key: "payment_amt", label: "应付佣金" },
  { key: "payment_curr", label: "应付币种" },
  { key: "paid_amt", label: "实付佣金" },
  { key: "paid_curr", label: "实付币种" },
  { key: "createdAt", label: "创建时间" },
]

const orderList = ref([])

const getStatusClass = (status) => {
  switch (status) {
    case 0: return 'status-pending'
    case 1: return 'status-success'
    case 2: return 'status-rejected'
    default: return ''
  }
}

const formattedOrders = computed(()=>{
  return orderList.value.map(order=>({
        ...order,
    createdAt:formatToLocalTime(order.createdAt)
  }))

})

const fetchOrders = async () => {
  loading.value = true
  const query ={
    page:currentPage.value,
    tab:currentTab.value,
  }
  try {
 const res = await getScrapperOrders(query)
    loading.value = false
    orderList.value = res.data
    total.value = res.pagination.totalItems
  } catch (err) {
    loading.value = false
  }
}

const handleSearch = async () => {
  const keyword = searchKeyword.value.trim()

  // Guard clause before setting loading state
  if (!keyword) {
    isSearch.value = false
    searchData.value = []
    return
  }

  isSearch.value = true
  loading.value = true
  searchData.value = []

  try {
    // Pass the string keyword directly
    const res = await searchScraperOrders({query:keyword})

    if (res.success) {
      searchData.value = res.data
    }
  } catch (error) {
    console.error('Error searching scraper orders:', error)
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  searchKeyword.value = ''
  isSearch.value = false
}

const handleTabChange = (index) => {
  currentTab.value = index
  currentPage.value = 0;
  columns.value=index===0?onyxColumns:tacColumns
  setTimeout(()=>{
    currentPage.value = 1;
  },300)
}

const goToDetail = (id) => {
  // Replace with vue-router navigation (e.g., router.push(`/appeal/${id}`))
  console.log('Navigate to detail page for ID:', id)
}

watch(currentPage, () => {
  if (currentPage.value === 0) {return}
  fetchOrders();
});

onMounted(() => fetchOrders())
</script>

<style scoped>
.appeal-container {
  max-width: 90%;
  margin: 20px auto;
  padding: 24px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* Search Area */
.search-box {
  width: 25%;
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 8px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #409eff;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.85;
}

.btn-primary {
  background-color: #409eff;
  color: #ffffff;
}

.btn-secondary {
  background-color: #e4e7ed;
  color: #606266;
}

.tab-bar{
  display: flex;
  margin-bottom: 20px;
}

.tab-item {
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  margin-bottom: -2px;
  border-bottom: 2px solid transparent;
}

.tab-item.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 600;
}

.json-container pre {
  background-color: #e4e7ed;
  color: #000;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 0.875rem;
}

/* Table */
.table-wrapper {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.appeal-table th {
  background-color: #fafafa;
  color: #303133;
  padding: 12px 16px;
  font-weight: 600;
  border-bottom: 1px solid #ebeef5;
}

.appeal-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  color: #606266;
}

.appeal-table tr:last-child td {
  border-bottom: none;
}

</style>