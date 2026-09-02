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
      <button v-if="searchKeyword" class="btn btn-secondary" @click="handleReset">Reset</button>
    </div>

    <!-- 2. Status Filter Tabs -->
    <div class="tab-bar">
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
    <div class="table-wrapper">
      <DataTable :columns :data="appealList" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DataTable from '@/components/DataTable.vue'
import {getAppeals} from "@/api/index.js";

const searchKeyword = ref('')
const currentTab = ref(0)
const loading = ref(false)

const tabList = ref([
  { name: 'All' },
  { name: 'Pending' },
  { name: 'Approved' },
  { name: 'Rejected' }
])

const columns =[{key:'id',label:'id'},{key:'user_id',label:'用户id'},{key:'confirmation_num',label:'订单号'},{key:'amount',label:'金额'},{key:'status',label:'状态'},{key:'content',label:'客人描述'},{key:'reply_content',label:'处理回复'},{key:'create_time',label:'创建时间'},{key:'update_time',label:'更新时间'},{key:'staff',label:'员工'},{key:'action',label:'办理'}]

const appealList = ref([])

const getStatusClass = (status) => {
  switch (status) {
    case 0: return 'status-pending'
    case 1: return 'status-success'
    case 2: return 'status-rejected'
    default: return ''
  }
}

const fetchAppeals = async () => {
  loading.value = true

  try {
 const res = await getAppeals()
    appealList.value = res.data
    console.log(res)
  } catch (err) {
    loading.value = false
    console.error('Failed to fetch appeals:', err)
  }
}

const handleSearch = () => fetchAppeals()

const handleReset = () => {
  searchKeyword.value = ''
  fetchAppeals()
}

const handleTabChange = (index) => {
  currentTab.value = index
  fetchAppeals()
}

const goToDetail = (id) => {
  // Replace with vue-router navigation (e.g., router.push(`/appeal/${id}`))
  console.log('Navigate to detail page for ID:', id)
}

onMounted(() => fetchAppeals())
</script>

<style scoped>
.appeal-container {
  max-width: 1000px;
  margin: 20px auto;
  padding: 24px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* Search Area */
.search-box {
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

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

/* Tabs */
.tab-bar {
  display: flex;
  border-bottom: 2px solid #e4e7ed;
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

/* Table */
.table-wrapper {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.appeal-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
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

.font-mono {
  font-family: monospace;
}

/* Status Badges */
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-pending {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.status-success {
  background-color: #f0f9eb;
  color: #67c23a;
}

.status-rejected {
  background-color: #fef0f0;
  color: #f56c6c;
}

.state-cell {
  text-align: center;
  padding: 40px !important;
  color: #909399;
}
</style>