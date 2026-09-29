<template>
  <section class="dash">
    <div class="dash__toolbar">
      <div>
        <p class="dash__hello">{{ greeting }}{{ userName ? `，${userName}` : '' }}</p>
        <h2>运营概览</h2>
      </div>
      <div class="ranges">
        <button
            v-for="item in ranges"
            :key="item.id"
            type="button"
            :class="{ active: range === item.id }"
            @click="range = item.id"
        >{{ item.label }}</button>
      </div>
    </div>

    <div class="kpis">
      <router-link v-for="item in growth" :key="item.label" :to="item.to" class="kpi">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <svg v-if="item.spark.length" viewBox="0 0 80 28" class="spark">
          <polyline :points="item.spark.map((point) => `${point.x},${point.y}`).join(' ')" fill="none" stroke="currentColor" stroke-width="1.8" />
          <circle v-for="point in item.spark" :key="`${item.label}-${point.day}`" :cx="point.x" :cy="point.y" r="1.8" fill="currentColor">
            <title>{{ point.day }}：{{ point.value }}</title>
          </circle>
        </svg>
      </router-link>
    </div>

    <div class="charts">
      <TrendChart
          title="每日新增"
          subtitle="期内新注册用户和新提交订单"
          :labels="chartLabels"
          :series="dailySeries"
      />
      <TrendChart
          title="累计用户与订单"
          subtitle="从系统上线累计到当天"
          fill
          :labels="chartLabels"
          :series="cumSeries"
      />
    </div>

    <section class="panel funds">
      <h3>微信商户余额</h3>
      <p v-if="wxBalance.error" class="funds__error">{{ wxBalance.error }}</p>
      <div v-else-if="wxBalance.available !== null" class="funds__grid">
        <div>
          <span>可用余额</span>
          <strong>¥{{ formatYuan(wxBalance.available) }}</strong>
        </div>
        <div v-if="wxBalance.pending !== null">
          <span>不可用</span>
          <strong>¥{{ formatYuan(wxBalance.pending) }}</strong>
        </div>
        <div v-for="item in wxBalance.accounts.filter((row) => row.available !== null)" :key="item.type">
          <span>{{ item.label }}</span>
          <strong>¥{{ formatYuan(item.available) }}</strong>
        </div>
      </div>
      <p v-else class="funds__hint">正在读取微信商户账户</p>
      <em v-if="wxBalance.mchid">商户号 {{ wxBalance.mchid }}{{ wxBalanceHint }}</em>
    </section>

    <div class="panels">
      <section class="panel">
        <h3>待办</h3>
        <router-link v-for="item in todos" :key="item.label" :to="item.to">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </router-link>
      </section>
      <section class="panel">
        <h3>转化</h3>
        <router-link to="/stats">
          <span>注册后7日首单率</span>
          <strong>{{ formatFirstOrderRate(counts.firstOrder7d) }}</strong>
          <em>{{ firstOrderRateHint(counts.firstOrder7d) }}</em>
        </router-link>
        <router-link to="/stats">
          <span>注册后30日首单率</span>
          <strong>{{ formatFirstOrderRate(counts.firstOrder30d) }}</strong>
          <em>{{ firstOrderRateHint(counts.firstOrder30d) }}</em>
        </router-link>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import TrendChart from '@/components/TrendChart.vue'
import { useAuthStore } from '@/stores/auth.js'
import { getDashboard, getDashboardSeries, getFirstOrderRates, getWechatMerchantBalance } from '@/api/index.js'
import { formatFirstOrderRate, firstOrderRateHint } from '@/utils/firstOrderRates.js'
import { rangeBounds } from '@/utils/range.js'

const authStore = useAuthStore()
const userName = authStore.user?.nickname
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return '早上好'
  if (hour >= 12 && hour < 18) return '下午好'
  return '晚上好'
})

const ranges = [
  { id: 'today', label: '今日' },
  { id: 'last7', label: '近7天' },
  { id: 'last30', label: '近30天' },
  { id: 'month', label: '本月' },
]
const range = ref('last30')
const counts = ref({
  newUsers: 0,
  newOrders: 0,
  cashbackOrders: 0,
  pendingWithdrawals: 0,
  pendingAppeals: 0,
  firstOrder7d: null,
  firstOrder30d: null,
  totals: { users: 0, orders: 0 },
  series: [],
})
const wxBalance = ref({
  mchid: '',
  available: null,
  pending: null,
  accounts: [],
  queried_at: '',
  as_of: '',
  source: '',
  error: '',
})

const bounds = computed(() => rangeBounds(range.value))
const chartBounds = computed(() => (range.value === 'today' ? rangeBounds('last14') : bounds.value))
const query = computed(() => `from=${bounds.value.from}&to=${bounds.value.to}`)
const points = computed(() => counts.value.series || [])
const chartLabels = computed(() => points.value.map((row) => row.day))
const dailySeries = computed(() => [
  { key: 'users', label: '新增用户', color: '#2563eb', values: points.value.map((row) => row.users) },
  { key: 'orders', label: '新增订单', color: '#0f766e', values: points.value.map((row) => row.orders) },
])
const cumSeries = computed(() => [
  { key: 'users', label: '累计用户', color: '#2563eb', values: points.value.map((row) => row.users_cum) },
  { key: 'orders', label: '累计订单', color: '#0f766e', values: points.value.map((row) => row.orders_cum) },
])

function spark(rows, key) {
  const values = rows.map((row) => Number(row[key]) || 0)
  if (!values.length) return []
  const max = Math.max(...values, 1)
  return values.map((value, index) => ({
    x: values.length === 1 ? 40 : (index / (values.length - 1)) * 80,
    y: 26 - (value / max) * 22,
    value,
    day: rows[index].day,
  }))
}

const growth = computed(() => [
  { label: '新增用户', value: counts.value.newUsers, to: `/users?${query.value}`, spark: spark(points.value, 'users') },
  { label: '新增订单', value: counts.value.newOrders, to: `/user-orders?${query.value}`, spark: spark(points.value, 'orders') },
  { label: '累计用户', value: counts.value.totals.users, to: '/users', spark: spark(points.value, 'users_cum') },
  { label: '累计订单', value: counts.value.totals.orders, to: '/user-orders', spark: spark(points.value, 'orders_cum') },
])
function formatYuan(value) {
  if (value === null || value === undefined || value === '') return '—'
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatQueryTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function wechatErrorText(error) {
  const text = error?.response?.data?.message || error?.message || '读取微信商户余额失败'
  if (String(text).includes('NO_AUTH') || String(text).includes('没有使用该接口的权限') || String(text).includes('没有资金账单')) {
    return '商户号已接通。微信没有给普通商户开放实时余额接口；最近也还没有资金账单可用来估算结余。'
  }
  if (String(text).includes('未配置')) return '服务器还没有配置微信商户证书。'
  return text
}

const wxBalanceHint = computed(() => {
  if (wxBalance.value.as_of) return ` · 截至 ${wxBalance.value.as_of} 资金账单`
  if (wxBalance.value.queried_at) return ` · ${formatQueryTime(wxBalance.value.queried_at)}`
  return ''
})

const todos = computed(() => [
  { label: '待处理提现', value: counts.value.pendingWithdrawals, to: '/withdrawals?pending=1' },
  { label: '待处理申诉', value: counts.value.pendingAppeals, to: '/user-appeals?pending=1' },
  { label: '可返现订单', value: counts.value.cashbackOrders, to: `/user-orders?${query.value}&cashback=1` },
])

let loadId = 0
async function loadDashboard() {
  const requestId = ++loadId
  try {
    const allTime = { from: '1970-01-01', to: bounds.value.to }
    const [res, seriesRes, rateRes, pendingRes, wxRes] = await Promise.all([
      getDashboard(bounds.value),
      getDashboardSeries(chartBounds.value).catch(() => ({ data: null })),
      getFirstOrderRates().catch(() => ({ data: null })),
      getDashboard(allTime).catch(() => ({ data: null })),
      getWechatMerchantBalance().catch((error) => ({ error })),
    ])
    if (requestId !== loadId) return
    const period = res?.data || {}
    const pending = pendingRes?.data || period
    counts.value = {
      ...period,
      cashbackOrders: period.cashbackOrders || 0,
      pendingWithdrawals: pending.pendingWithdrawals || 0,
      pendingAppeals: pending.pendingAppeals || 0,
      firstOrder7d: rateRes.data?.days7 || period.first_order_7d || null,
      firstOrder30d: rateRes.data?.days30 || period.first_order_30d || null,
      totals: seriesRes.data?.totals || { users: 0, orders: 0 },
      series: seriesRes.data?.series || [],
    }
    if (wxRes?.error) {
      wxBalance.value = { ...wxBalance.value, error: wechatErrorText(wxRes.error) }
    } else {
      const wx = wxRes?.data || {}
      wxBalance.value = {
        mchid: wx.mchid || '',
        available: wx.available ?? null,
        pending: wx.pending ?? null,
        accounts: wx.accounts || [],
        queried_at: wx.queried_at || '',
        as_of: wx.as_of || '',
        source: wx.source || '',
        error: wx.message ? wechatErrorText(new Error(wx.message)) : '',
      }
    }
  } catch {
    // Keep last counts if the session cookie is still settling.
  }
}

watch(range, loadDashboard, { immediate: true })
</script>

<style scoped>
.dash { max-width: 1180px; margin: 0 auto; padding: 24px; }
.dash__toolbar { display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; margin-bottom: 20px; }
.dash__hello { margin: 0 0 4px; color: #6b7280; font-size: 13px; }
.dash__toolbar h2 { margin: 0; font-size: 22px; }
.ranges { display: flex; gap: 8px; flex-wrap: wrap; }
.ranges button { border: 1px solid #d1d5db; background: #fff; border-radius: 999px; padding: 6px 12px; cursor: pointer; }
.ranges button.active { background: #111827; color: #fff; border-color: #111827; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.kpi {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  text-decoration: none;
  color: inherit;
  display: grid;
  gap: 6px;
}
.kpi:hover { border-color: #2563eb; }
.kpi span { color: #6b7280; font-size: 13px; }
.kpi strong { font-size: 28px; letter-spacing: -0.03em; }
.spark { width: 80px; height: 28px; color: #2563eb; }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px; }
.funds { margin-bottom: 16px; padding: 12px 16px 14px; }
.funds__grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.funds__grid span { display: block; color: #6b7280; font-size: 13px; }
.funds__grid strong { display: block; margin-top: 4px; font-size: 22px; }
.funds__error, .funds__hint { margin: 8px 12px; color: #6b7280; font-size: 13px; }
.funds__error { color: #b45309; }
.funds em { display: block; margin: 8px 12px 0; color: #9ca3af; font-style: normal; font-size: 12px; }
.panel h3 { margin: 8px 12px 4px; font-size: 14px; }
.panel a {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
}
.panel a:hover { background: #f8fafc; }
.panel span { color: #4b5563; }
.panel strong { font-size: 20px; }
.panel em { color: #9ca3af; font-style: normal; font-size: 12px; }
@media (max-width: 1024px) {
  .kpis, .charts, .panels, .funds__grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 700px) {
  .dash__toolbar { flex-direction: column; align-items: flex-start; }
  .kpis, .charts, .panels, .funds__grid { grid-template-columns: 1fr; }
}
</style>
