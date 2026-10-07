<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>集团订单</h2>
    </header>
    <p class="hint">房晚 = 离店日期 − 入住日期，同一天按 1 晚。统计全部已提交的用户酒店订单。集团和品牌优先用客人搜酒店接口返回的信息，对不上再用酒店名关键词。</p>
    <div class="filter-toolbar">
      <label>集团
        <select v-model="group" @change="onGroupChange">
          <option value="">全部集团</option>
          <option v-for="item in groupOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>
      <label>从 <input v-model="from" type="date" /></label>
      <label>到 <input v-model="to" type="date" /></label>
      <button class="search-btn" type="button" @click="load">查询</button>
    </div>

    <LoadingSpinner v-if="loading" />
    <template v-else>
      <div class="summary">
        <div>
          <strong>{{ current.orders }}</strong>
          <span>{{ currentLabel }}订单</span>
        </div>
        <div>
          <strong>{{ current.nights }}</strong>
          <span>{{ currentLabel }}房晚</span>
        </div>
        <div>
          <strong>{{ totals.orders }}</strong>
          <span>全部订单</span>
        </div>
        <div>
          <strong>{{ totals.nights }}</strong>
          <span>全部房晚</span>
        </div>
      </div>

      <div class="chips">
        <button
            v-for="item in visibleGroups"
            :key="item.id"
            type="button"
            class="chip"
            :class="{ active: group === item.id }"
            @click="selectGroup(item.id)"
        >
          {{ item.name }}
          <em>{{ item.orders }} 单 / {{ item.nights }} 晚</em>
        </button>
      </div>

      <section class="panel">
        <h3>
          <button v-if="brand" type="button" class="back-btn" @click="clearBrand">返回品牌</button>
          {{ panelTitle }}
        </h3>
        <div class="table-container">
          <table v-if="brand">
            <thead>
              <tr>
                <th>订单</th>
                <th>确认号</th>
                <th>酒店</th>
                <th>入住</th>
                <th>离店</th>
                <th>房晚</th>
                <th>状态</th>
                <th>分类来源</th>
                <th>提交时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!orders.length"><td colspan="9">这个品牌在当前范围内没有订单</td></tr>
              <tr v-for="row in orders" :key="row.id">
                <td><router-link class="order-link" :to="`/user-orders/${row.id}`">{{ row.id }}</router-link></td>
                <td>{{ row.confirmation_num || '-' }}</td>
                <td>{{ row.hotel_name_cn || '-' }}</td>
                <td>{{ dateOnly(row.check_in_date) }}</td>
                <td>{{ dateOnly(row.check_out_date) }}</td>
                <td>{{ row.nights }}</td>
                <td>{{ statusText(row.status) }}</td>
                <td>{{ sourceText(row.source) }}</td>
                <td>{{ formatRowTime(row, ['submitted_at', 'created_at', 'create_time']) || '-' }}</td>
              </tr>
            </tbody>
          </table>
          <table v-else>
            <thead>
              <tr>
                <th>{{ group ? '品牌' : '集团' }}</th>
                <th>订单</th>
                <th>房晚</th>
                <th>订单占比</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!tableRows.length"><td colspan="4">这个范围内没有订单</td></tr>
              <tr
                  v-for="row in tableRows"
                  :key="row.key"
                  class="row-click"
                  @click="onRowClick(row)"
              >
                <td>{{ row.name }}</td>
                <td>{{ row.orders }}</td>
                <td>{{ row.nights }}</td>
                <td>{{ percent(row.orders, current.orders) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getHotelGroupStats } from '@/api/index.js'
import { HOTEL_GROUPS } from '@/utils/hotelGroups.js'
import { formatRowTime } from '@/utils/formatDate.js'
import { useToast } from '@/composables/useToast.js'

const STATUS_TEXT = {
  0: '已提交',
  1: '可返现',
  2: '已返现',
  3: '可申诉',
  4: '已提交申诉',
  5: '关闭',
  6: '已删除',
}

const { showToast } = useToast()
const loading = ref(false)
const group = ref('marriott')
const brand = ref('')
const from = ref('')
const to = ref('')
const groups = ref([])
const brands = ref([])
const orders = ref([])
const selected = ref(null)
const totals = ref({ orders: 0, nights: 0 })

const groupOptions = computed(() => HOTEL_GROUPS)
const visibleGroups = computed(() => groups.value.filter((item) => item.id !== 'unmatched' || item.orders > 0))
const current = computed(() => {
  if (group.value && selected.value) return selected.value
  if (group.value) return groups.value.find((item) => item.id === group.value) || { orders: 0, nights: 0 }
  return totals.value
})
const currentLabel = computed(() => {
  const row = HOTEL_GROUPS.find((item) => item.id === group.value) || selected.value
  return row ? `${row.name} ` : ''
})
const panelTitle = computed(() => {
  if (brand.value) return `${brand.value} 订单`
  if (group.value) return `${currentLabel.value}品牌`
  return '各集团'
})
const tableRows = computed(() => {
  if (group.value) {
    return brands.value.map((row) => ({ key: row.brand, name: row.brand, orders: row.orders, nights: row.nights }))
  }
  return visibleGroups.value.map((row) => ({ key: row.id, name: row.name, orders: row.orders, nights: row.nights }))
})

const percent = (part, all) => {
  if (!all) return '0%'
  return `${Math.round((Number(part) / Number(all)) * 1000) / 10}%`
}

const SOURCE_TEXT = {
  search: '酒店搜索',
  hotel_library: '酒店库',
  keyword: '关键词',
  unmatched: '未匹配',
}

const dateOnly = (value) => String(value || '').slice(0, 10) || '-'
const statusText = (status) => STATUS_TEXT[status] || STATUS_TEXT[String(status)] || status || '-'
const sourceText = (source) => SOURCE_TEXT[source] || source || '-'

const selectGroup = (id) => {
  group.value = group.value === id ? '' : id
  brand.value = ''
  load()
}

const onGroupChange = () => {
  brand.value = ''
}

const openBrand = (name) => {
  brand.value = name
  load()
}

const clearBrand = () => {
  brand.value = ''
  load()
}

const onRowClick = (row) => {
  if (group.value) {
    openBrand(row.name)
    return
  }
  group.value = row.key
  brand.value = ''
  load()
}

const load = async () => {
  loading.value = true
  try {
    const res = await getHotelGroupStats({
      group: group.value,
      brand: brand.value,
      from: from.value,
      to: to.value,
    })
    groups.value = res.data.groups || []
    brands.value = res.data.brands || []
    orders.value = res.data.orders || []
    selected.value = res.data.selected
    totals.value = res.data.totals || { orders: 0, nights: 0 }
  } catch (error) {
    showToast(error.message || '读取集团订单失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.orders-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
.page-header h2 { margin: 0; }
.hint { color: #6b7280; font-size: 13px; }
.filter-toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 16px 0; }
.filter-toolbar label { display: flex; align-items: center; gap: 8px; color: #4b5563; font-size: 13px; }
.filter-toolbar input, .filter-toolbar select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.search-btn { padding: 8px 14px; border: none; border-radius: 6px; background: #2563eb; color: #fff; cursor: pointer; }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.summary div { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
.summary strong { display: block; font-size: 28px; letter-spacing: -0.03em; }
.summary span { color: #6b7280; font-size: 13px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.chip {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  text-align: left;
}
.chip em { display: block; color: #6b7280; font-style: normal; font-size: 12px; }
.chip.active { background: #111827; color: #fff; border-color: #111827; }
.chip.active em { color: #d1d5db; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
.panel h3 { margin: 0 0 12px; font-size: 15px; display: flex; align-items: center; gap: 10px; }
.back-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 13px;
}
.table-container { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
.row-click { cursor: pointer; }
.row-click:hover { background: #f8fafc; }
.order-link { color: #2563eb; font-weight: 600; text-decoration: none; }
@media (max-width: 800px) {
  .summary { grid-template-columns: 1fr 1fr; }
}
</style>
