<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>集团订单</h2>
    </header>
    <p class="hint">集团和品牌以线上酒店库为准（万豪、洲际、希尔顿、雅高、凯悦、温德姆）。房晚 = 离店日期 − 入住日期，同一天按 1 晚。统计全部已提交的用户酒店订单。</p>
    <div class="filter-toolbar">
      <label>集团
        <select v-model="group">
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
        <h3>{{ group ? `${currentLabel}品牌` : '各集团' }}</h3>
        <div class="table-container">
          <table>
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
              <tr v-for="row in tableRows" :key="row.key">
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
import { useToast } from '@/composables/useToast.js'

const { showToast } = useToast()
const loading = ref(false)
const group = ref('marriott')
const from = ref('')
const to = ref('')
const groups = ref([])
const brands = ref([])
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

const selectGroup = (id) => {
  group.value = group.value === id ? '' : id
  load()
}

const load = async () => {
  loading.value = true
  try {
    const res = await getHotelGroupStats({
      group: group.value,
      from: from.value,
      to: to.value,
    })
    groups.value = res.data.groups || []
    brands.value = res.data.brands || []
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
.panel h3 { margin: 0 0 12px; font-size: 15px; }
.table-container { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
@media (max-width: 800px) {
  .summary { grid-template-columns: 1fr 1fr; }
}
</style>
