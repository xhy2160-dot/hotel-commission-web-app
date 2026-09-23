<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>用户管理</h2>
    </header>
    <div class="filter-toolbar">
      <div class="search-box">
        <input
            v-model="keyword"
            type="text"
            class="search-input"
            placeholder="搜索用户ID、手机号、昵称或姓名"
            @keyup.enter="search"
        />
      </div>
      <button class="search-btn" @click="search">查询</button>
    </div>
    <LoadingSpinner v-if="loading" />
    <div v-else class="table-container">
      <DataTable
          :columns="columns"
          :data="rows"
          v-model:page="page"
          :limit="limit"
          :total="total"
          @page-change="load"
          @update:page="val => page = val"
      >
        <template #[`cell(id)`]="{ row }">
          <router-link class="order-link" :to="`/users/${row.id}`">{{ row.id }}</router-link>
        </template>
        <template #[`cell(rebate_rate)`]="{ row }">
          {{ formatRate(row.rebate_rate) }}
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import DataTable from '@/components/DataTable.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getAdminUsers } from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'

const { showToast } = useToast()
const keyword = ref('')
const loading = ref(false)
const rows = ref([])
const page = ref(1)
const limit = 10
const total = ref(0)

const columns = [
  { key: 'id', label: '用户ID' },
  { key: 'legal_name', label: '姓名' },
  { key: 'nickname', label: '昵称' },
  { key: 'phone', label: '手机' },
  { key: 'registered_at', label: '注册时间' },
  { key: 'vip_name', label: '会员等级' },
  { key: 'rebate_rate', label: '返现比例' },
  { key: 'inviter_id', label: '邀请人ID' },
  { key: 'status', label: '状态' },
  { key: 'order_count', label: '累计订单' },
  { key: 'rebate_sum', label: '累计返现(¥)' }
]

const formatRate = (rate) => {
  if (rate === null || rate === undefined || rate === '') return '-'
  return `${Math.round(Number(rate) * 1000) / 10}%`
}

const load = async () => {
  loading.value = true
  try {
    const res = await getAdminUsers({ page: page.value, limit, q: keyword.value.trim() })
    rows.value = res.data || []
    total.value = res.pagination?.totalItems || 0
  } catch (error) {
    showToast('获取用户失败', 'error')
  } finally {
    loading.value = false
  }
}

const search = async () => {
  page.value = 1
  await load()
}

onMounted(load)
</script>

<style scoped>
.orders-page { max-width: 1500px; margin: 0 auto; padding: 24px; }
.page-header h2 { margin-top: 0; }
.filter-toolbar { display: flex; gap: 12px; margin-bottom: 20px; }
.search-box { flex: 1; }
.search-input { width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 6px; }
.search-btn { padding: 10px 18px; border: none; border-radius: 6px; background: #2563eb; color: white; cursor: pointer; }
.table-container { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.order-link { color: #2563eb; font-weight: 600; text-decoration: none; }
</style>
