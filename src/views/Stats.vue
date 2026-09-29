<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>经营统计</h2>
    </header>
    <div class="filter-toolbar">
      <label>从 <input v-model="from" type="date" /></label>
      <label>到 <input v-model="to" type="date" /></label>
      <button class="search-btn" @click="load">查询</button>
    </div>
    <p class="hint">7日 / 30日首单率只统计注册已满观察期的用户；首单是该用户提交的第一笔酒店订单。累计金额是上线以来全部月份的合计，表格是当前查询区间。</p>
    <div class="summary summary--money">
      <div>
        <strong>¥{{ formatYuan(lifetime.commission) }}</strong>
        <span>累计佣金收入</span>
      </div>
      <div>
        <strong>¥{{ formatYuan(lifetime.rebate) }}</strong>
        <span>累计预计返现</span>
      </div>
      <div>
        <strong>¥{{ formatYuan(lifetime.payout) }}</strong>
        <span>累计实际出款</span>
      </div>
      <div>
        <strong>¥{{ formatYuan(lifetime.profit) }}</strong>
        <span>累计预计毛利</span>
      </div>
    </div>
    <div v-if="!loading && summary" class="pies">
      <PieChart
          title="注册后7日首单率"
          subtitle="已满7日观察期的注册用户"
          :center="formatFirstOrderRate(summary.days7)"
          :center-hint="firstOrderRateHint(summary.days7)"
          empty-text="这个范围内没有注册用户"
          :slices="rateSlices(summary.days7, '#2563eb', '#93c5fd')"
      />
      <PieChart
          title="注册后30日首单率"
          subtitle="已满30日观察期的注册用户"
          :center="formatFirstOrderRate(summary.days30)"
          :center-hint="firstOrderRateHint(summary.days30)"
          empty-text="这个范围内没有注册用户"
          :slices="rateSlices(summary.days30, '#d97706', '#fcd34d')"
      />
    </div>
    <div v-if="!loading && chartMonths.length" class="charts">
      <TrendChart
          title="月度佣金"
          subtitle="按爬虫入账，单位人民币"
          :labels="monthLabels"
          :series="moneySeries"
      />
      <TrendChart
          title="月度新增用户与订单"
          subtitle="用户按注册月，订单按提交月"
          :labels="monthLabels"
          :series="countSeries"
      />
      <TrendChart
          title="月度首单率"
          subtitle="已满观察期的注册队列"
          :labels="monthLabels"
          :series="rateSeries"
      />
    </div>
    <LoadingSpinner v-if="loading" />
    <template v-else>
      <div class="table-container">
        <table>
          <thead>
          <tr>
            <th>月份</th>
            <th>佣金收入(¥)</th>
            <th>预计返现(¥)</th>
            <th>实际出款(¥)</th>
            <th>预计毛利(¥)</th>
            <th>订单量</th>
            <th>新增用户</th>
            <th>7日首单率</th>
            <th>30日首单率</th>
            <th></th>
          </tr>
          </thead>
          <tbody>
          <tr v-if="months.length === 0"><td colspan="10">这个范围内没有订单</td></tr>
          <tr v-for="row in months" :key="row.month">
            <td>{{ row.month }}</td>
            <td>{{ row.commission }}</td>
            <td>{{ row.rebate }}</td>
            <td>{{ row.payout }}</td>
            <td>{{ row.profit }}</td>
            <td>{{ row.orders }}</td>
            <td>{{ row.users }}</td>
            <td :title="firstOrderRateHint(row.first_order_7d)">{{ formatFirstOrderRate(row.first_order_7d) }}</td>
            <td :title="firstOrderRateHint(row.first_order_30d)">{{ formatFirstOrderRate(row.first_order_30d) }}</td>
            <td><router-link :to="`/user-orders?from=${row.month}-01&to=${monthEnd(row.month)}`">订单明细</router-link></td>
          </tr>
          </tbody>
          <tfoot v-if="months.length">
            <tr>
              <td>区间合计</td>
              <td>{{ formatFixed(rangeTotals.commission) }}</td>
              <td>{{ formatFixed(rangeTotals.rebate) }}</td>
              <td>{{ formatFixed(rangeTotals.payout) }}</td>
              <td>{{ formatFixed(rangeTotals.profit) }}</td>
              <td>{{ rangeTotals.orders }}</td>
              <td>{{ rangeTotals.users }}</td>
              <td :title="firstOrderRateHint(rangeTotals.first_order_7d)">{{ formatFirstOrderRate(rangeTotals.first_order_7d) }}</td>
              <td :title="firstOrderRateHint(rangeTotals.first_order_30d)">{{ formatFirstOrderRate(rangeTotals.first_order_30d) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <h3>会员等级分布</h3>
      <div class="table-container">
        <table>
          <thead><tr><th>等级</th><th>返现比例</th><th>用户数</th></tr></thead>
          <tbody>
          <tr v-for="vip in vips" :key="vip.vip_name">
            <td>{{ vip.vip_name }}</td>
            <td>{{ formatRate(vip.rebate_rate) }}</td>
            <td>{{ vip.count }}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getBusinessStats, getFirstOrderRates } from '@/api/index.js'
import PieChart from '@/components/PieChart.vue'
import TrendChart from '@/components/TrendChart.vue'
import { firstOrderRateHint, formatFirstOrderRate } from '@/utils/firstOrderRates.js'
import { eachMonth, lastMonths, monthEnd } from '@/utils/range.js'

const route = useRoute()
const initial = lastMonths(6)
const from = ref(typeof route.query.from === 'string' ? route.query.from : initial.from)
const to = ref(typeof route.query.to === 'string' ? route.query.to : initial.to)
const loading = ref(false)
const months = ref([])
const vips = ref([])
const summary = ref(null)
const lifetime = ref({
  commission: null,
  rebate: null,
  payout: null,
  profit: null,
})

const emptyMonth = (month) => ({
  month,
  commission: '0.00',
  rebate: '0.00',
  payout: '0.00',
  profit: '0.00',
  orders: 0,
  users: 0,
  first_order_7d: { converted: 0, cohort: 0, rate: null },
  first_order_30d: { converted: 0, cohort: 0, rate: null },
})

const formatRate = (rate) => `${Math.round(Number(rate) * 1000) / 10}%`
function formatYuan(value) {
  if (value === null || value === undefined || value === '') return '—'
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatFixed(value) {
  return Number(value || 0).toFixed(2)
}
function sumMoney(rows) {
  return rows.reduce((acc, row) => ({
    commission: acc.commission + Number(row.commission || 0),
    rebate: acc.rebate + Number(row.rebate || 0),
    payout: acc.payout + Number(row.payout || 0),
    profit: acc.profit + Number(row.profit || 0),
    orders: acc.orders + Number(row.orders || 0),
    users: acc.users + Number(row.users || 0),
  }), { commission: 0, rebate: 0, payout: 0, profit: 0, orders: 0, users: 0 })
}
function sumRate(rows, key) {
  let converted = 0
  let cohort = 0
  for (const row of rows) {
    const item = row[key]
    if (!item) continue
    converted += Number(item.converted || 0)
    cohort += Number(item.cohort || 0)
  }
  return {
    converted,
    cohort,
    rate: cohort > 0 ? Math.round((converted / cohort) * 1000) / 1000 : null,
  }
}
const rangeTotals = computed(() => ({
  ...sumMoney(months.value),
  first_order_7d: sumRate(months.value, 'first_order_7d'),
  first_order_30d: sumRate(months.value, 'first_order_30d'),
}))
const chartMonths = computed(() => {
  const byMonth = new Map(months.value.map((row) => [row.month, row]))
  return eachMonth(from.value, to.value).map((month) => byMonth.get(month) || emptyMonth(month))
})
const monthLabels = computed(() => chartMonths.value.map((row) => row.month))
const moneySeries = computed(() => [
  { key: 'commission', label: '佣金收入', color: '#2563eb', values: chartMonths.value.map((row) => Number(row.commission) || 0) },
  { key: 'rebate', label: '预计返现', color: '#d97706', values: chartMonths.value.map((row) => Number(row.rebate) || 0) },
])
const countSeries = computed(() => [
  { key: 'users', label: '新增用户', color: '#2563eb', values: chartMonths.value.map((row) => Number(row.users) || 0) },
  { key: 'orders', label: '订单量', color: '#0f766e', values: chartMonths.value.map((row) => Number(row.orders) || 0) },
])
const rateSeries = computed(() => [
  { key: 'd7', label: '7日首单率%', color: '#2563eb', values: chartMonths.value.map((row) => percent(row.first_order_7d)) },
  { key: 'd30', label: '30日首单率%', color: '#d97706', values: chartMonths.value.map((row) => percent(row.first_order_30d)) },
])
const percent = (item) => (item && item.cohort && item.rate !== null && item.rate !== undefined ? Math.round(item.rate * 1000) / 10 : null)
const registeredUsers = computed(() => (summary.value?.months || []).reduce((sum, row) => sum + Number(row.users || 0), 0))
function rateSlices(item, convertedColor, missedColor) {
  const converted = Number(item?.converted || 0)
  const cohort = Number(item?.cohort || 0)
  return [
    { key: 'converted', label: '期内首单', value: converted, color: convertedColor },
    { key: 'missed', label: '期满未下单', value: Math.max(0, cohort - converted), color: missedColor },
    { key: 'watching', label: '观察中', value: Math.max(0, registeredUsers.value - cohort), color: '#e5e7eb' },
  ]
}

const loadLifetime = async () => {
  const res = await getBusinessStats({ from: '1970-01-01' }).catch(() => ({ data: null }))
  const totals = sumMoney(res?.data?.months || [])
  lifetime.value = {
    commission: res?.data?.months ? totals.commission : null,
    rebate: res?.data?.months ? totals.rebate : null,
    payout: res?.data?.months ? totals.payout : null,
    profit: res?.data?.months ? totals.profit : null,
  }
}

const load = async () => {
  loading.value = true
  try {
    const query = { from: from.value, to: to.value }
    const [res, rateRes] = await Promise.all([
      getBusinessStats(query).catch(() => ({ data: null })),
      getFirstOrderRates(query).catch(() => ({ data: null })),
    ])
    const rateByMonth = new Map((rateRes?.data?.months || []).map((row) => [row.month, row]))
    months.value = (res?.data?.months || []).map((row) => ({
      ...row,
      first_order_7d: row.first_order_7d || rateByMonth.get(row.month)?.days7 || { converted: 0, cohort: 0, rate: null },
      first_order_30d: row.first_order_30d || rateByMonth.get(row.month)?.days30 || { converted: 0, cohort: 0, rate: null },
    }))
    for (const row of rateRes?.data?.months || []) {
      if (months.value.some((item) => item.month === row.month)) continue
      months.value.push({
        month: row.month,
        commission: '0.00',
        rebate: '0.00',
        payout: '0.00',
        profit: '0.00',
        orders: 0,
        users: row.users,
        first_order_7d: row.days7,
        first_order_30d: row.days30,
      })
    }
    months.value.sort((a, b) => String(a.month).localeCompare(String(b.month)))
    summary.value = rateRes?.data || {
      days7: res?.data?.first_order_7d || null,
      days30: res?.data?.first_order_30d || null,
    }
    vips.value = res?.data?.vips || []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLifetime()
  load()
})
</script>

<style scoped>
.orders-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.filter-toolbar { display: flex; gap: 12px; align-items: center; margin: 16px 0; }
.hint { margin: 0 0 12px; color: #6b7280; font-size: 13px; }
.summary { display: grid; gap: 12px; margin-bottom: 16px; }
.summary--money { grid-template-columns: repeat(4, 1fr); }
.pies { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.summary div { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
.summary strong { display: block; font-size: 28px; letter-spacing: -0.03em; }
.summary span { color: #6b7280; font-size: 13px; }
tfoot td { font-weight: 600; background: #f8fafc; }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.charts > :last-child { grid-column: 1 / -1; }
@media (max-width: 900px) {
  .charts, .summary--money, .pies { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 700px) {
  .summary--money, .pies, .charts { grid-template-columns: 1fr; }
  .charts > :last-child { grid-column: auto; }
}
.search-btn { padding: 8px 14px; border: none; border-radius: 6px; background: #2563eb; color: white; cursor: pointer; }
.table-container { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
a { color: #2563eb; }
</style>
