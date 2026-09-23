<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>经营统计</h2>
      <p class="note">金额按提交时间归月。佣金收入是各渠道佣金换成人民币后的合计，还没乘会员比例。预计返现是写入订单的人民币应返。实际出款是已打款的提现。预计毛利 = 佣金收入 − 预计返现。</p>
    </header>
    <div class="filter-toolbar">
      <label>从 <input v-model="from" type="date" /></label>
      <label>到 <input v-model="to" type="date" /></label>
      <button class="search-btn" @click="load">查询</button>
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
            <th></th>
          </tr>
          </thead>
          <tbody>
          <tr v-if="months.length === 0"><td colspan="8">这个范围内没有订单</td></tr>
          <tr v-for="row in months" :key="row.month">
            <td>{{ row.month }}</td>
            <td>{{ row.commission }}</td>
            <td>{{ row.rebate }}</td>
            <td>{{ row.payout }}</td>
            <td>{{ row.profit }}</td>
            <td>{{ row.orders }}</td>
            <td>{{ row.users }}</td>
            <td><router-link :to="`/user-orders?from=${row.month}-01&to=${row.month}-31`">订单明细</router-link></td>
          </tr>
          </tbody>
        </table>
      </div>
      <h3>会员等级分布</h3>
      <p class="note">等级名称和返现比例接上后台后读取 site2_app_vip_level。这里的人数是当前全部用户，不随日期范围变化。</p>
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
import { onMounted, ref } from 'vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getBusinessStats } from '@/api/index.js'
import { rangeBounds } from '@/utils/range.js'

const initial = rangeBounds('month')
const from = ref(initial.from)
const to = ref(initial.to)
const loading = ref(false)
const months = ref([])
const vips = ref([])

const formatRate = (rate) => `${Math.round(Number(rate) * 1000) / 10}%`

const load = async () => {
  loading.value = true
  try {
    const res = await getBusinessStats({ from: from.value, to: to.value })
    months.value = res.data.months
    vips.value = res.data.vips
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.orders-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.note { color: #6b7280; font-size: 13px; }
.filter-toolbar { display: flex; gap: 12px; align-items: center; margin: 16px 0; }
.search-btn { padding: 8px 14px; border: none; border-radius: 6px; background: #2563eb; color: white; cursor: pointer; }
.table-container { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
a { color: #2563eb; }
</style>
