<template>
  <div class="orders-page">
    <header class="page-header">
      <router-link class="back" to="/users">返回用户列表</router-link>
      <h2>用户详情</h2>
    </header>
    <LoadingSpinner v-if="loading" />
    <template v-else-if="user">
      <section class="panel">
        <div class="grid">
          <div><span>用户ID</span><strong>{{ user.id }}</strong></div>
          <div><span>姓名</span><strong>{{ user.legal_name || '-' }}</strong></div>
          <div><span>昵称</span><strong>{{ user.nickname || '-' }}</strong></div>
          <div><span>注册时间</span><strong>{{ user.registered_at || '-' }}</strong></div>
          <div><span>当前会员</span><strong>{{ user.vip_name || '-' }}</strong></div>
          <div><span>当前返现比例</span><strong>{{ formatRate(user.rebate_rate) }}</strong></div>
          <div><span>邀请人</span><strong>{{ inviterText }}</strong></div>
          <div><span>累计订单</span><strong>{{ user.order_count }}</strong></div>
          <div><span>累计返现</span><strong>¥{{ user.rebate_sum }}</strong></div>
        </div>
        <form class="edit" @submit.prevent="save">
          <label>
            会员等级
            <select v-model="form.vip_id">
              <option v-for="vip in vipLevels" :key="vip.id" :value="vip.id">
                {{ vip.vip_name }}（{{ formatRate(vip.rebate_rate) }}）
              </option>
            </select>
          </label>
          <label>
            账号状态
            <select v-model="form.status">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
          <button type="submit" :disabled="saving">保存</button>
        </form>
        <p class="hint">修改会员等级只影响之后新入账的返现。已经写入订单的返现金额不会跟着变。</p>
      </section>

      <section class="panel">
        <h3>订单</h3>
        <table>
          <thead><tr><th>ID</th><th>确认号</th><th>酒店</th><th>状态</th><th>应返(¥)</th></tr></thead>
          <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td><router-link :to="`/user-orders/${order.id}`">{{ order.id }}</router-link></td>
            <td>{{ order.confirmation_num }}</td>
            <td>{{ order.hotel_name_cn }}</td>
            <td>{{ statusText(order.status) }}</td>
            <td>{{ order.amount }}</td>
          </tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h3>返现</h3>
        <table>
          <thead><tr><th>订单</th><th>确认号</th><th>当时比例</th><th>人民币应返</th><th>计算时间</th></tr></thead>
          <tbody>
          <tr v-for="order in rebates" :key="order.id">
            <td><router-link :to="`/user-orders/${order.id}`">{{ order.order_no }}</router-link></td>
            <td>{{ order.confirmation_num }}</td>
            <td>{{ formatRate(order.rebate_rate) }}</td>
            <td>¥{{ order.amount }}</td>
            <td>{{ order.calculated_at || '-' }}</td>
          </tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h3>提现</h3>
        <table>
          <thead><tr><th>渠道</th><th>单号</th><th>金额</th><th>状态</th><th></th></tr></thead>
          <tbody>
          <tr v-for="item in withdrawals" :key="item.channel + item.id">
            <td>{{ item.channel === 'zelle' ? 'Zelle' : '微信' }}</td>
            <td>{{ item.withdraw_no || item.out_bill_no }}</td>
            <td>¥{{ item.amount }}</td>
            <td>{{ withdrawStatus(item) }}</td>
            <td><router-link to="/withdrawals">去出款页</router-link></td>
          </tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h3>申诉</h3>
        <table>
          <thead><tr><th>ID</th><th>订单ID</th><th>状态</th><th>内容</th><th></th></tr></thead>
          <tbody>
          <tr v-for="item in appeals" :key="item.id">
            <td>{{ item.id }}</td>
            <td><router-link :to="`/user-orders/${item.hotel_order_id}`">{{ item.hotel_order_id }}</router-link></td>
            <td>{{ item.status }}</td>
            <td>{{ item.content }}</td>
            <td><router-link to="/user-appeals">去申诉页</router-link></td>
          </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getAdminUserDetail, updateAdminUser } from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'

const route = useRoute()
const { showToast } = useToast()
const loading = ref(false)
const saving = ref(false)
const user = ref(null)
const vipLevels = ref([])
const orders = ref([])
const rebates = ref([])
const withdrawals = ref([])
const appeals = ref([])
const form = reactive({ vip_id: '', status: 'active' })

const statusMap = { 0: '已提交', 1: '可返现', 2: '已返现', 3: '可申诉', 4: '已提交申诉', 5: '关闭' }
const statusText = (status) => statusMap[status] || status
const withdrawStatus = (item) => {
  const zelle = { 0: '待审核', 1: '审核通过', 2: '审核拒绝', 3: '打款中', 4: '打款成功', 5: '打款失败' }
  const wechat = { '-1': '失败', 0: '已提交', 1: '出款中', 2: '已出款', 3: '等待用户确认' }
  const map = item.channel === 'zelle' ? zelle : wechat
  return map[item.status] || item.status
}
const formatRate = (rate) => {
  if (rate === null || rate === undefined || rate === '') return '-'
  return `${Math.round(Number(rate) * 1000) / 10}%`
}
const inviterText = computed(() => {
  if (!user.value?.inviter) return user.value?.inviter_id || '-'
  const person = user.value.inviter
  return `${person.id} ${person.legal_name || person.nickname || ''}`.trim()
})

const load = async () => {
  loading.value = true
  try {
    const res = await getAdminUserDetail(route.params.id)
    const data = res.data
    user.value = data.user
    vipLevels.value = data.vip_levels || []
    orders.value = data.orders || []
    rebates.value = data.rebates || []
    withdrawals.value = data.withdrawals || []
    appeals.value = data.appeals || []
    form.vip_id = data.user.vip_id
    form.status = data.user.status || 'active'
  } catch (error) {
    showToast('获取用户详情失败', 'error')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  try {
    await updateAdminUser({ id: user.value.id, vip_id: form.vip_id, status: form.status })
    showToast('已保存', 'success')
    await load()
  } catch (error) {
    showToast(error.message || '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<style scoped>
.orders-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.back { color: #2563eb; text-decoration: none; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.grid span { display: block; color: #6b7280; font-size: 12px; }
.edit { display: flex; gap: 16px; align-items: end; margin-top: 16px; flex-wrap: wrap; }
.edit select, .edit button { padding: 8px 12px; }
.edit button { background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; }
.hint { color: #6b7280; font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px; }
a { color: #2563eb; }
</style>
