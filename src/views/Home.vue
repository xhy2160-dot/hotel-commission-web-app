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
import { computed } from 'vue'
import NavCard from "@/components/NavCard.vue";
import { useAuthStore } from "@/stores/auth.js";
import {oneColor} from "@/utils/color.js";

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
    title: '出款',
    description: '办理查询Zelle，微信出款',
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
</style>