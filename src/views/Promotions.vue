<template>
  <div class="orders-page">
    <header class="page-header">
      <router-link class="back" to="/">返回首页</router-link>
      <h2>推广追踪</h2>
      <button class="search-btn" @click="exportRows">导出</button>
    </header>
    <p class="note">
      额外用户 = 投放期内新注册用户 − 基线日均 × 持续天数。基线默认取开始前 7 天日均新用户，也可手填。
      CPL / CAC / CPA = 花费 ÷ 额外注册 / 额外下单用户 / 额外可返现用户，要扣自然基线。
      CPO = 花费 ÷ 期内新用户实际订单，不扣基线、不含老用户。
    </p>

    <section class="panel">
      <h3>{{ editingId ? '编辑推广' : '登记推广' }}</h3>
      <form class="form" @submit.prevent="save">
        <label>
          平台
          <select v-model="form.platform">
            <option disabled value="">请选择</option>
            <option v-for="item in platforms" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <label v-if="form.platform === '其他'">
          平台名称
          <input v-model="form.platformOther" type="text" placeholder="例如：小红书信息流" />
        </label>
        <label>
          开始时间
          <input v-model="form.start_at" type="datetime-local" />
        </label>
        <label>
          持续天数
          <input v-model="form.duration_days" type="number" min="0.1" step="0.1" />
        </label>
        <label>
          花费（¥）
          <input v-model="form.amount" type="number" min="0" step="0.01" />
        </label>
        <label>
          基线日均（可空）
          <input v-model="form.baseline_daily" type="number" min="0" step="0.1" placeholder="空则自动取前7天" />
        </label>
        <label class="wide">
          备注
          <input v-model="form.note" type="text" placeholder="投放计划、素材或渠道备注" />
        </label>
        <div class="actions">
          <button class="search-btn" type="submit" :disabled="saving">{{ editingId ? '保存修改' : '登记' }}</button>
          <button v-if="editingId" class="search-btn ghost" type="button" @click="resetForm">取消编辑</button>
        </div>
      </form>
      <div v-if="preview" class="preview">
        <span>预估基线 {{ preview.baseline_daily }}/天</span>
        <span>期内注册 {{ preview.actual_leads }}</span>
        <span>额外用户 {{ preview.extra_leads }}</span>
        <span>CPL {{ formatCost(preview.cpl) }}</span>
        <span>CAC {{ formatCost(preview.cac) }}</span>
        <span>CPO {{ formatCost(preview.cpo) }}</span>
        <span>CPA {{ formatCost(preview.cpa) }}</span>
        <span>评分 {{ preview.score }} {{ preview.score_label }}</span>
      </div>
    </section>

    <LoadingSpinner v-if="loading" />
    <div v-else class="table-container">
      <DataTable
        :columns="columns"
        :data="rows"
        :limit="0"
        :total="rows.length"
      >
        <template #[`cell(platform)`]="{ row }">
          <router-link class="order-link" :to="`/promotions/${row.id}`">{{ row.platform }}</router-link>
        </template>
        <template #[`cell(score)`]="{ row }">
          <span class="score" :class="scoreClass(row.score_label)">{{ row.score }} {{ row.score_label }}</span>
        </template>
        <template #[`cell(actions)`]="{ row }">
          <button class="link-btn" type="button" @click="edit(row)">编辑</button>
          <button class="link-btn danger" type="button" @click="remove(row)">删除</button>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import DataTable from '@/components/DataTable.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import {
  createPromotion,
  deletePromotion,
  getPromotions,
  previewPromotion,
  updatePromotion,
} from '@/api/index.js'
import { useToast } from '@/composables/useToast.js'
import { downloadExcel, exportFileName } from '@/utils/exportExcel.js'
import { formatCost, formatBeijing, PROMO_PLATFORMS } from '@/utils/promoMetrics.js'

const { showToast } = useToast()
const platforms = PROMO_PLATFORMS
const loading = ref(false)
const saving = ref(false)
const source = ref([])
const rows = ref([])
const preview = ref(null)
const editingId = ref(null)
const form = reactive({
  platform: '',
  platformOther: '',
  start_at: '',
  duration_days: 7,
  amount: '',
  baseline_daily: '',
  note: '',
})

const columns = [
  { key: 'platform', label: '平台' },
  { key: 'start_at', label: '开始' },
  { key: 'duration_days', label: '天数' },
  { key: 'amount', label: '花费(¥)' },
  { key: 'actual_leads', label: '期内注册' },
  { key: 'extra_leads', label: '额外用户' },
  { key: 'cpl', label: 'CPL' },
  { key: 'cac', label: 'CAC' },
  { key: 'cpo', label: 'CPO' },
  { key: 'cpa', label: 'CPA' },
  { key: 'score', label: '评分' },
  { key: 'actions', label: '操作' },
]

const payload = () => ({
  platform: form.platform === '其他' ? (form.platformOther.trim() || '其他') : form.platform,
  start_at: form.start_at,
  duration_days: form.duration_days,
  amount: form.amount,
  baseline_daily: form.baseline_daily === '' ? null : form.baseline_daily,
  note: form.note,
})

const displayRows = (list) => list.map((row) => ({
  ...row,
  start_at_raw: row.start_at,
  amount_raw: row.amount,
  start_at: formatBeijing(row.start_at),
  amount: Number(row.amount).toFixed(2),
  cpl: formatCost(row.cpl),
  cac: formatCost(row.cac),
  cpo: formatCost(row.cpo),
  cpa: formatCost(row.cpa),
}))

const load = async () => {
  loading.value = true
  try {
    const res = await getPromotions()
    source.value = res.data || []
    rows.value = displayRows(source.value)
  } catch {
    showToast('获取推广记录失败', 'error')
  } finally {
    loading.value = false
  }
}

const refreshPreview = async () => {
  if (!form.start_at || !form.duration_days) {
    preview.value = null
    return
  }
  try {
    const res = await previewPromotion(payload())
    preview.value = res.data
  } catch {
    preview.value = null
  }
}

const save = async () => {
  if (!form.platform || !form.start_at) {
    showToast('请填写平台和开始时间', 'error')
    return
  }
  saving.value = true
  try {
    if (editingId.value) await updatePromotion({ id: editingId.value, ...payload() })
    else await createPromotion(payload())
    showToast(editingId.value ? '已保存' : '已登记', 'success')
    resetForm()
    await load()
  } catch (error) {
    showToast(error.message || '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

const edit = (row) => {
  editingId.value = row.id
  form.platform = platforms.includes(row.platform) ? row.platform : '其他'
  form.platformOther = platforms.includes(row.platform) ? '' : row.platform
  form.start_at = String(row.start_at_raw || '').slice(0, 16).replace(' ', 'T')
  form.duration_days = row.duration_days
  form.amount = row.amount_raw
  form.baseline_daily = row.baseline_source === 'manual' ? row.baseline_daily : ''
  form.note = row.note || ''
}

const remove = async (row) => {
  if (!confirm(`删除 ${row.platform} 这次推广？`)) return
  try {
    await deletePromotion({ id: row.id })
    showToast('已删除', 'success')
    if (editingId.value === row.id) resetForm()
    await load()
  } catch (error) {
    showToast(error.message || '删除失败', 'error')
  }
}

const resetForm = () => {
  editingId.value = null
  form.platform = ''
  form.platformOther = ''
  form.start_at = ''
  form.duration_days = 7
  form.amount = ''
  form.baseline_daily = ''
  form.note = ''
  preview.value = null
}

const exportRows = () => {
  downloadExcel(exportFileName('推广'), columns.filter((col) => col.key !== 'actions'), rows.value)
}

const scoreClass = (label) => {
  if (label === '优秀') return 'good'
  if (label === '良好') return 'ok'
  if (label === '未跑赢基线' || label === '较差') return 'bad'
  return 'mid'
}

onMounted(load)

watch(() => [form.start_at, form.duration_days, form.amount, form.baseline_daily], () => {
  refreshPreview()
})
</script>

<style scoped>
.orders-page { max-width: 1500px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; align-items: center; gap: 16px; }
.page-header h2 { margin: 0; flex: 1; }
.back { color: #2563eb; text-decoration: none; }
.note { color: #6b7280; font-size: 13px; line-height: 1.5; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }
.form { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #4b5563; }
.form .wide { grid-column: 1 / -1; }
.form input, .form select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; }
.actions { display: flex; gap: 8px; align-items: end; }
.search-btn { padding: 10px 18px; border: none; border-radius: 6px; background: #2563eb; color: white; cursor: pointer; }
.search-btn.ghost { background: #fff; color: #111827; border: 1px solid #d1d5db; }
.preview { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; color: #374151; font-size: 13px; }
.table-container { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.order-link { color: #2563eb; font-weight: 600; text-decoration: none; }
.link-btn { background: none; border: none; color: #2563eb; cursor: pointer; padding: 0 6px; }
.link-btn.danger { color: #dc2626; }
.score { padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.score.good { background: #dcfce7; color: #166534; }
.score.ok { background: #dbeafe; color: #1d4ed8; }
.score.mid { background: #fef3c7; color: #92400e; }
.score.bad { background: #fee2e2; color: #991b1b; }
</style>
