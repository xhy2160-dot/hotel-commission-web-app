<template>
  <div class="orders-page">
    <header class="page-header">
      <router-link class="back" to="/promotions">返回推广列表</router-link>
      <h2>推广详情</h2>
    </header>
    <LoadingSpinner v-if="loading" />
    <template v-else-if="row">
      <section class="panel">
        <div class="grid">
          <div><span>平台</span><strong>{{ row.platform }}</strong></div>
          <div><span>开始</span><strong>{{ formatBeijing(row.start_at) }}</strong></div>
          <div><span>结束</span><strong>{{ formatBeijing(row.end_at) }}</strong></div>
          <div><span>持续</span><strong>{{ row.duration_days }} 天</strong></div>
          <div><span>花费</span><strong>¥{{ Number(row.amount).toFixed(2) }}</strong></div>
          <div><span>评分</span><strong>{{ row.score }} {{ row.score_label }}</strong></div>
        </div>
        <p v-if="row.note" class="note">{{ row.note }}</p>
      </section>

      <section class="panel">
        <h3>效果</h3>
        <table>
          <thead>
            <tr><th></th><th>注册用户</th><th>下单用户</th><th>订单</th><th>可返现用户</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>投放期内实际</td>
              <td>{{ row.actual_leads }}</td>
              <td>{{ row.actual_acq }}</td>
              <td>{{ row.actual_orders }}</td>
              <td>{{ row.actual_cpa }}</td>
            </tr>
            <tr>
              <td>按基线预计</td>
              <td>{{ row.expected_leads }}</td>
              <td>{{ (row.actual_acq - row.extra_acq).toFixed(1) }}</td>
              <td>{{ (row.actual_orders - row.extra_orders).toFixed(1) }}</td>
              <td>{{ (row.actual_cpa - row.extra_cpa).toFixed(1) }}</td>
            </tr>
            <tr>
              <td>额外获取</td>
              <td>{{ row.extra_leads }}</td>
              <td>{{ row.extra_acq }}</td>
              <td>{{ row.extra_orders }}</td>
              <td>{{ row.extra_cpa }}</td>
            </tr>
            <tr>
              <td>单位成本</td>
              <td>{{ formatCost(row.cpl) }} CPL</td>
              <td>{{ formatCost(row.cac) }} CAC</td>
              <td>{{ formatCost(row.cpo) }} CPO</td>
              <td>{{ formatCost(row.cpa) }} CPA</td>
            </tr>
          </tbody>
        </table>
        <p class="note">
          基线{{ row.baseline_source === 'manual' ? '为手填' : `取开始前 ${row.baseline_days} 天` }}，日均 {{ row.baseline_daily }} 人。
          额外为负表示没超过自然增长。CPL/CAC/CPA 只在额外量为正时计算。CPO 是花费 ÷ 期内新用户实际订单，不扣基线、不含老用户。
          评分看有没有跑赢基线，以及这批新用户里下单、可返现的比例。
        </p>
        <p>
          <router-link :to="`/users?from=${row.users_from}&to=${row.users_to}`">查看投放期内注册用户</router-link>
        </p>
      </section>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getPromotionDetail } from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'
import { formatBeijing, formatCost } from '@/utils/promoMetrics.js'

const route = useRoute()
const { showToast } = useToast()
const loading = ref(false)
const row = ref(null)

const load = async () => {
  loading.value = true
  try {
    const res = await getPromotionDetail(route.params.id)
    row.value = res.data
  } catch {
    showToast('获取推广详情失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<style scoped>
.orders-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; align-items: center; gap: 16px; }
.page-header h2 { margin: 0; }
.back { color: #2563eb; text-decoration: none; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.grid span { display: block; color: #6b7280; font-size: 12px; }
.note { color: #6b7280; font-size: 13px; line-height: 1.5; }
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px; }
a { color: #2563eb; }
</style>
