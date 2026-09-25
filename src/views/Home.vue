<template>
  <section class="home-nav">
    <div class="home-nav__header">
      <div>
        <p class="home-nav__eyebrow">飞筝</p>
        <h1 class="home-nav__title">{{greeting}}{{ userName ? `, ${userName}` : '' }}.</h1>
        <p class="home-nav__subtitle">欢迎登录小程序后台系统</p>
      </div>
      <div class="home-nav__date">
        <span class="home-nav__date-day">{{ today.day }}</span>
        <span class="home-nav__date-label">{{ today.label }}</span>
      </div>
    </div>

    <section class="board">
      <div class="board__head">
        <h2>运营看板</h2>
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
      <div class="metrics">
        <router-link v-for="item in metrics" :key="item.label" :to="item.to" class="metric">
          <span class="metric__value">{{ item.value }}</span>
          <span class="metric__label">{{ item.label }}</span>
        </router-link>
      </div>
    </section>

    <div class="home-nav__grid">
      <NavCard
          v-for="card in cards"
          :key="card.to"
          v-bind="card"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import NavCard from "@/components/NavCard.vue";
import { useAuthStore } from "@/stores/auth.js";
import { getDashboard } from "@/api/index.js";
import { rangeBounds } from "@/utils/range.js";

const authStore = useAuthStore();
const userName = authStore.user?.nickname

const greeting = computed(() => {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return '早上好'
  } else if (hour >= 12 && hour < 18) {
    return '下午好'
  } else {
    return '晚上好'
  }
})

// ── Icons (inline SVG components) ────────────────────────────
const IconCalendar = {
  template: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M3 8h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M7 2v3M13 2v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="6" y="11" width="2" height="2" rx="0.5" fill="currentColor"/>
    <rect x="9" y="11" width="2" height="2" rx="0.5" fill="currentColor"/>
    <rect x="12" y="11" width="2" height="2" rx="0.5" fill="currentColor"/>
  </svg>`
}

const IconChart = {
  template: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 14l4-4 3 3 4-5 3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 17h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

const IconUsers = {
  template: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/>
    <path d="M2 17c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M14 5a3 3 0 010 6M18 17c0-2.5-1.5-4.5-4-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

const IconTask = {
  template: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}

const IconSettings = {
  template: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M4.929 4.929l1.06 1.06M13.01 13.01l1.06 1.06M4.929 15.07l1.06-1.06M13.01 6.99l1.06-1.06"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
}

// ── Cards config ──────────────────────────────────────────────
const cards = [
  {
    to: '/users',
    icon: IconUsers,
    label: '用户',
    title: '用户管理',
    description: '搜索用户，查看订单、返现、提现和申诉',
    accent: '#2667ff',
  },
  {
    to: '/stats',
    icon: IconChart,
    label: '统计',
    title: '经营统计',
    description: '按月看佣金、返现、出款和毛利',
    accent: '#2667ff',
  },
  {
    to: '/promotions',
    icon: IconChart,
    label: '推广',
    title: '推广追踪',
    description: '记录投放，对比基线算 CPL / CAC / CPA',
    accent: '#2667ff',
  },
  {
    to: '/user-orders',
    icon: IconChart,
    label: '订单',
    title: '酒店订单',
    description: '用户提交订单查询',
    accent: '#2667ff',
    stats: [
      { value: '94%', label: 'uptime' },
      { value: '↑ 12%', label: 'vs last mo.' },
    ]
  },
  {
    to: '/scrapper-orders',
    icon: IconChart,
    label: '订单',
    title: '爬虫订单',
    description: '爬虫订单查询，操作',
    accent: '#2667ff',
    stats: [
      { value: '94%', label: 'uptime' },
      { value: '↑ 12%', label: 'vs last mo.' },
    ]
  },
  {
    to: '/withdrawals',
    icon: IconChart,
    label: 'Zelle, WeChat',
    title: '提现',
    description: '办理查询Zelle，微信提现',
    accent: '#2667ff',
    stats: [
      { value: '94%', label: 'uptime' },
      { value: '↑ 12%', label: 'vs last mo.' },
    ]
  },
  {
    to: '/user-appeals',
    icon: IconChart,
    label: '申诉',
    title: '申诉',
    description: '申诉相关查询操作',
    accent: '#2667ff',
    stats: [
      { value: '94%', label: 'uptime' },
      { value: '↑ 12%', label: 'vs last mo.' },
    ]
  },
  {
    to: '/wechat-article',
    icon: IconCalendar,
    label: '公众号',
    title: '公众号关联',
    description: '添加公众号和缩略图',
    accent: '#2667ff',
    stats: [
      { value: '3', label: 'today' },
      { value: '18', label: 'this week' },
    ]
  },
  {
    to: '/manual-orders',
    icon: IconTask,
    label: '出款',
    title: '手动返现订单号提交',
    description: '提交已手动返现订单号，防止客户再次提交',
    accent: '#2667ff',
    // tag: 'New',
    stats: [
      { value: '7', label: 'open' },
      { value: '2', label: 'overdue' },
    ]
  },
  {
    to: '/staff',
    icon: IconUsers,
    label: '员工',
    title: '员工登陆管理',
    description: '添加编辑员工登录账号',
    accent: '#2667ff',
    stats: [
      { value: '24', label: 'members' },
      { value: '19', label: 'active' },
    ]
  },
]

const ranges = [
  { id: 'today', label: '今日' },
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
]
const range = ref('today')
const counts = ref({
  newUsers: 0,
  newOrders: 0,
  cashbackOrders: 0,
  withdrawalApplies: 0,
  pendingWithdrawals: 0,
  pendingAppeals: 0,
})
const bounds = computed(() => rangeBounds(range.value))
const metrics = computed(() => {
  const query = `from=${bounds.value.from}&to=${bounds.value.to}`
  return [
    { label: '新用户', value: counts.value.newUsers, to: `/users?${query}` },
    { label: '新订单', value: counts.value.newOrders, to: `/user-orders?${query}` },
    { label: '可返现订单', value: counts.value.cashbackOrders, to: `/user-orders?${query}&cashback=1` },
    { label: '提现申请', value: counts.value.withdrawalApplies, to: `/withdrawals?${query}` },
    { label: '待处理提现', value: counts.value.pendingWithdrawals, to: `/withdrawals?${query}&pending=1` },
    { label: '待处理申诉', value: counts.value.pendingAppeals, to: `/user-appeals?${query}&pending=1` },
  ]
})

async function loadDashboard() {
  try {
    const res = await getDashboard(bounds.value)
    counts.value = res.data
  } catch {
    // Keep last counts; login cookie may still be settling on localhost.
  }
}

watch(range, loadDashboard, { immediate: true })

// ── Date header ───────────────────────────────────────────────
const today = computed(() => {
  const d = new Date()
  return {
    day: d.getDate(),
    label: d.toLocaleDateString('zh-CN', { weekday: 'short', month: 'short' })
  }
})
</script>

<style scoped>
.home-nav {
  max-width: 1400px; /* Expanded container width to fit 4 cards nicely */
  margin: 0 auto;
  padding: 48px 24px 64px;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Header ─────────────────────────────────────────────── */
.home-nav__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 36px;
  gap: 16px;
}

.home-nav__eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9ca3af;
  margin: 0 0 8px;
}

.home-nav__title {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.home-nav__subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.home-nav__date {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #e5e9ef;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  width: 56px;
}

.home-nav__date-day {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
  line-height: 1;
  padding: 8px 0 6px;
  font-variant-numeric: tabular-nums;
}

.home-nav__date-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #ffffff;
  background: #111827;
  width: 100%;
  text-align: center;
  padding: 4px 0;
}

/* ── Grid Layout (Responsive 4-column) ──────────────────── */
.home-nav__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 4 cards per row on desktop */
  gap: 16px;
}

/* Tablet screens (2 cards per row) */
@media (max-width: 1024px) {
  .home-nav__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile screens (1 card per row) */
@media (max-width: 600px) {
  .home-nav__grid {
    grid-template-columns: 1fr;
  }

  .home-nav__title {
    font-size: 22px;
  }
}

.board { margin-bottom: 28px; }
.board__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.board__head h2 { margin: 0; font-size: 18px; }
.ranges { display: flex; gap: 8px; }
.ranges button { border: 1px solid #d1d5db; background: #fff; border-radius: 999px; padding: 6px 12px; cursor: pointer; }
.ranges button.active { background: #111827; color: #fff; border-color: #111827; }
.metrics { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
.metric { display: flex; flex-direction: column; gap: 4px; padding: 14px; background: #fff; border: 1px solid #e5e9ef; border-radius: 10px; text-decoration: none; color: inherit; }
.metric:hover { border-color: #2563eb; }
.metric__value { font-size: 28px; font-weight: 700; letter-spacing: -0.03em; }
.metric__label { color: #6b7280; font-size: 13px; }
@media (max-width: 1024px) { .metrics { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 600px) { .metrics { grid-template-columns: repeat(2, 1fr); } }
</style>