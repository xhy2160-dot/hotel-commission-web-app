<template>
  <div class="orders-page">
    <header class="page-header">
      <router-link class="back" to="/user-orders">返回订单列表</router-link>
      <h2>酒店订单详情</h2>
    </header>
    <LoadingSpinner v-if="loading" />
    <template v-else-if="order">
      <section class="panel">
        <div class="grid">
          <div><span>订单号</span><strong>{{ order.order_no }}</strong></div>
          <div><span>确认号</span><strong>{{ order.confirmation_num }}</strong></div>
          <div><span>用户</span><strong><router-link v-if="user" :to="`/users/${user.id}`">{{ user.legal_name || user.nickname || user.id }}</router-link></strong></div>
          <div><span>酒店</span><strong>{{ order.hotel_name_cn }}</strong></div>
          <div><span>入住</span><strong>{{ order.check_in_date }}</strong></div>
          <div><span>离店</span><strong>{{ order.check_out_date }}</strong></div>
          <div><span>状态</span><strong>{{ statusText(order.status) }}</strong></div>
          <div><span>提交时间</span><strong>{{ order.submitted_at || '-' }}</strong></div>
          <div><span>当前会员</span><strong>{{ user?.vip_name || '-' }}</strong></div>
          <div><span>人民币应返</span><strong>¥{{ order.amount }}</strong></div>
        </div>
      </section>

      <section class="panel">
        <h3>返现计算</h3>
        <p v-if="!order.calc_lines.length" class="hint">
          这笔订单在开始记录快照之前已经入账，只保留当时写入的返现金额 ¥{{ order.amount }}。不会用今天的会员比例或汇率重算。
        </p>
        <template v-else>
          <p>计算时间（北京时间）：{{ order.calculated_at || '-' }}</p>
          <p>当时返现比例：{{ formatRate(order.rebate_rate) }}。当时渠道佣金合计：¥{{ order.commission_cny }}</p>
          <table>
            <thead>
            <tr><th>来源</th><th>佣金原币</th><th>币种</th><th>汇率</th><th>人民币佣金</th></tr>
            </thead>
            <tbody>
            <tr v-for="(line, index) in order.calc_lines" :key="index">
              <td>{{ line.source }}</td>
              <td>{{ line.amount }}</td>
              <td>{{ line.currency }}</td>
              <td>{{ line.fx_rate }}</td>
              <td>{{ line.cny }}</td>
            </tr>
            </tbody>
          </table>
          <p class="formula">
            人民币应返 = 各渠道佣金换成人民币后的合计 ¥{{ order.commission_cny }} × 当时返现比例 {{ formatRate(order.rebate_rate) }} = ¥{{ order.amount }}
          </p>
          <p class="hint">汇率是入账时「1 人民币可兑换的外币数量」。外币佣金 ÷ 汇率 = 人民币佣金。之后会员等级或汇率变化，不会改写这笔金额。</p>
        </template>
      </section>

      <section class="panel" v-if="appeal">
        <h3>申诉</h3>
        <p>状态 {{ appeal.status }}</p>
        <p>{{ appeal.content }}</p>
        <router-link to="/user-appeals">去申诉列表</router-link>
      </section>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getOrderDetail } from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'

const route = useRoute()
const { showToast } = useToast()
const loading = ref(false)
const order = ref(null)
const user = ref(null)
const appeal = ref(null)
const statusMap = { 0: '已提交', 1: '已匹配', 2: '已返现', 3: '可申诉', 4: '已提交申诉', 5: '关闭' }
const statusText = (status) => statusMap[status] || status
const formatRate = (rate) => {
  if (rate === null || rate === undefined || rate === '') return '-'
  return `${Math.round(Number(rate) * 1000) / 10}%`
}

const load = async () => {
  loading.value = true
  try {
    const res = await getOrderDetail(route.params.id)
    order.value = res.data.order
    user.value = res.data.user
    appeal.value = res.data.appeal
  } catch (error) {
    showToast('获取订单详情失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<style scoped>
.orders-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
.back { color: #2563eb; text-decoration: none; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.grid span { display: block; color: #6b7280; font-size: 12px; }
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px; }
.formula { font-weight: 600; }
.hint { color: #6b7280; }
a { color: #2563eb; }
</style>
