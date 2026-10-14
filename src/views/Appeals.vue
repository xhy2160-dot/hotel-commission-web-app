<template>
  <div class="appeal-container">
    <div class="search-box">
      <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索唯一订单号..."
          class="search-input"
          @keyup.enter="handleSearch"
      />
      <button class="btn btn-primary" @click="handleSearch">查询</button>
      <button class="btn btn-secondary" @click="exportRows">导出</button>
      <button v-if="searchKeyword" class="btn btn-secondary" @click="handleReset">Reset</button>
    </div>

    <div class="tab-bar">
      <div
          v-for="(tab, index) in tabList"
          :key="index"
          class="tab-item"
          :class="{ active: currentTab === index }"
          @click="handleTabChange(index)"
      >
        {{ tab.name }}
      </div>
    </div>

    <AppealPopover
        :isOpen="isPopoverOpen"
        :data="currentAppeal"
        @close="isPopoverOpen = false"
        @save="fetchAppeals"
    />

    <div v-if="emailOpen" class="email-overlay" @click.self="emailOpen = false">
      <div class="email-card">
        <div class="email-header">
          <span>申诉邮件</span>
          <button type="button" class="close-icon" @click="emailOpen = false">&times;</button>
        </div>
        <label class="email-label">主题</label>
        <input v-model="emailDraft.subject" class="email-subject" />
        <label class="email-label">正文（加粗斜体下划线为需手填）</label>
        <div
          ref="emailBodyEl"
          class="email-body email-body--rich"
          contenteditable="true"
          @input="syncEmailBody"
        />
        <div class="email-actions">
          <button type="button" class="btn btn-secondary" @click="emailOpen = false">关闭</button>
          <button type="button" class="btn btn-primary" @click="copyEmail">复制邮件</button>
        </div>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />
    <div v-else class="table-wrapper">
      <DataTable
          :columns="columns"
          :data="appealList"
          v-model:page="currentPage"
          :limit="limit"
          :total="appealList.length"
          enable-action
          @action_btn_click="handleActionClick"
      >
        <template #[`cell(user_id)`]="{ row }">
          <router-link class="table-link" :to="`/users/${row.user_id}`">{{ row.user_id }}</router-link>
        </template>
        <template #[`cell(confirmation_num)`]="{ row }">
          <router-link
              v-if="row.hotel_order_id"
              class="table-link"
              :to="`/user-orders/${row.hotel_order_id}`"
          >
            {{ row.confirmation_num || row.hotel_order_id }}
          </router-link>
          <span v-else>{{ row.confirmation_num || '-' }}</span>
        </template>
        <template #[`cell(amount)`]="{ value }">
          {{ value === '-' || value === '' || value == null ? '-' : `¥${value}` }}
        </template>
        <template #[`cell(status)`]="{ row }">
          <span class="status-badge" :class="getStatusClass(row.status)">
            {{ statusLabel[row.status] || row.status }}
          </span>
        </template>
        <template #[`cell(email)`]="{ row }">
          <button type="button" class="mail-btn" :disabled="emailLoadingId === row.id" @click="openEmail(row)">
            {{ emailLoadingId === row.id ? '生成中...' : '发邮件' }}
          </button>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import DataTable from '@/components/DataTable.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import AppealPopover from '@/components/AppealPopover.vue'
import { getAppeals, getOrderDetail, searchScraperOrders } from '@/api/index.js'
import { inDayRange, parseTime } from '@/utils/range.js'
import { formatLocalISO, formatLocalTime } from '@/utils/formatDate.js'
import { downloadExcel, exportFileName } from '@/utils/exportExcel.js'
import { buildAppealEmail, pickScraperHit } from '@/utils/appealEmail.js'
import { useToast } from '@/composables/useToast.js'

const route = useRoute()
const { showToast } = useToast()

const searchKeyword = ref('')
const currentTab = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const limit = 10
const isPopoverOpen = ref(false)
const currentAppeal = ref({})
const emailOpen = ref(false)
const emailDraft = ref({ subject: '', body: '', bodyHtml: '' })
const emailBodyEl = ref(null)
const emailLoadingId = ref(null)

const tabList = [
  { name: '全部' },
  { name: '待处理' },
  { name: '已通过' },
  { name: '已拒绝' }
]

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'user_id', label: '用户ID' },
  { key: 'confirmation_num', label: '订单号' },
  { key: 'amount', label: '金额' },
  { key: 'status', label: '状态' },
  { key: 'content', label: '客人描述' },
  { key: 'reply_content', label: '处理回复' },
  { key: 'create_time', label: '创建时间' },
  { key: 'update_time', label: '更新时间' },
  { key: 'staff', label: '员工' },
  { key: 'email', label: '发邮件', sortable: false }
]

const appealList = ref([])

const statusLabel = { 0: '待处理', 1: '已通过', 2: '已拒绝' }

const getStatusClass = (status) => {
  switch (Number(status)) {
    case 0: return 'status-pending'
    case 1: return 'status-success'
    case 2: return 'status-rejected'
    default: return ''
  }
}

const formatAppealTime = (value) => {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const num = Number(value)
    return num > 1e12 ? formatLocalTime(num) : formatLocalISO(num)
  }
  const parsed = parseTime(value)
  return parsed ? formatLocalTime(parsed) : String(value)
}

const staffName = (item) => {
  const staff = item.staff
  if (staff && typeof staff === 'object') return staff.nickname || staff.name || ''
  return staff || item.staff_name || item.reviewer || item.reviewer_staff_id || ''
}

const normalizeAppeal = (item) => {
  const status = Number(item.status)
  return {
    ...item,
    hotel_order_id: item.hotel_order_id || item.order_id || null,
    confirmation_num: item.confirmation_num || item.confirm_num || item.order_no || '',
    amount: item.order?.amount || item.amount || '',
    content: item.content || item.reason || item.description || '',
    reply_content: item.reply_content || item.reply || item.remark || '',
    create_time: formatAppealTime(item.create_time || item.created_at || item.createdAt),
    update_time: formatAppealTime(item.update_time || item.updated_at || item.updatedAt),
    staff: staffName(item),
    status: Number.isFinite(status) ? status : item.status,
    status_label: statusLabel[status] || item.status,
    actionable:item.status===0
  }
}

const fetchAppeals = async () => {
  loading.value = true
  try {
    const res = await getAppeals()
    const raw = res?.data
    let list = Array.isArray(raw) ? raw : (raw?.list || raw?.rows || [])
    const keyword = searchKeyword.value.trim()
    if (keyword) {
      list = list.filter((item) => String(item.confirmation_num || item.confirm_num || item.order_no || '').includes(keyword))
    }
    if (currentTab.value === 1) list = list.filter((item) => Number(item.status) === 0)
    if (currentTab.value === 2) list = list.filter((item) => Number(item.status) === 1)
    if (currentTab.value === 3) list = list.filter((item) => Number(item.status) === 2)
    if (route.query.from || route.query.to) {
      list = list.filter((item) => inDayRange(item.create_time || item.created_at, route.query.from, route.query.to))
    }
    appealList.value = list.map(normalizeAppeal)
  } catch (err) {
    console.error('Failed to fetch appeals:', err)
    appealList.value = []
    showToast('获取申诉失败，请重试', 'error')
  } finally {
    loading.value = false
  }
}

const exportRows = () => {
  const rows = appealList.value.map((item) => ({
    ...item,
    status: statusLabel[item.status] || item.status
  }))
  downloadExcel(exportFileName('申诉'), columns.filter((col) => col.key !== 'email'), rows)
}

const handleSearch = () => {
  currentPage.value = 1
  fetchAppeals()
}

const handleReset = () => {
  searchKeyword.value = ''
  currentPage.value = 1
  fetchAppeals()
}

const handleTabChange = (index) => {
  currentTab.value = index
  currentPage.value = 1
  fetchAppeals()
}

const handleActionClick = (row) => {
  currentAppeal.value = row
  isPopoverOpen.value = true
}

const openEmail = async (row) => {
  emailLoadingId.value = row.id
  try {
    let extras = {}
    if (row.hotel_order_id) {
      try {
        const res = await getOrderDetail(row.hotel_order_id)
        extras = { order: res.data?.order || {}, user: res.data?.user || {} }
      } catch {
        extras = {}
      }
    }
    const confirmation = extras.order?.confirmation_num || row.confirmation_num
    if (confirmation) {
      try {
        const scraped = await searchScraperOrders({ query: confirmation })
        extras.scraper = pickScraperHit(scraped?.data, confirmation) || {}
      } catch {
        extras.scraper = {}
      }
    }
    emailDraft.value = buildAppealEmail(row, extras)
    emailOpen.value = true
    await nextTick()
    if (emailBodyEl.value) emailBodyEl.value.innerHTML = emailDraft.value.bodyHtml
  } catch (error) {
    showToast(error.message || '生成邮件失败', 'error')
  } finally {
    emailLoadingId.value = null
  }
}

const syncEmailBody = () => {
  if (!emailBodyEl.value) return
  emailDraft.value = {
    ...emailDraft.value,
    bodyHtml: emailBodyEl.value.innerHTML,
    body: emailBodyEl.value.innerText.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trimEnd(),
  }
}

const copyEmail = async () => {
  const html = emailDraft.value.bodyHtml || emailBodyEl.value?.innerHTML || ''
  const plain = `${emailDraft.value.subject}\n\n${emailDraft.value.body}`
  try {
    if (navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([`<p>${emailDraft.value.subject}</p>${html}`], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ])
    } else {
      await navigator.clipboard.writeText(plain)
    }
    showToast('邮件已复制', 'success')
  } catch {
    showToast('复制失败，请手动选择正文', 'error')
  }
}

onMounted(() => {
  if (route.query.pending === '1') currentTab.value = 1
  fetchAppeals()
})
watch(() => [route.query.from, route.query.to, route.query.pending], () => {
  if (route.query.pending === '1') currentTab.value = 1
  currentPage.value = 1
  fetchAppeals()
})
</script>

<style scoped>
.appeal-container {
  max-width: 1400px;
  margin: 20px auto;
  padding: 24px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.search-box {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 8px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: #409eff;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  cursor: pointer;
}

.btn:hover {
  opacity: 0.85;
}

.btn-primary {
  background-color: #409eff;
  color: #ffffff;
}

.btn-secondary {
  background-color: #e4e7ed;
  color: #606266;
}

.tab-bar {
  display: flex;
  border-bottom: 2px solid #e4e7ed;
  margin-bottom: 20px;
}

.tab-item {
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  margin-bottom: -2px;
  border-bottom: 2px solid transparent;
}

.tab-item.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 600;
}

.table-wrapper {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.table-link {
  color: #2563eb;
  text-decoration: none;
}

.table-link:hover {
  text-decoration: underline;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-pending {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.status-success {
  background-color: #f0f9eb;
  color: #67c23a;
}

.status-rejected {
  background-color: #fef0f0;
  color: #f56c6c;
}

.mail-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  color: #1d4ed8;
  white-space: nowrap;
}

.mail-btn:hover {
  background: #eff6ff;
}

.email-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
}

.email-card {
  width: min(720px, 100%);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 20px;
  display: grid;
  gap: 8px;
}

.email-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.close-icon {
  background: none;
  border: none;
  font-size: 22px;
  color: #9ca3af;
  cursor: pointer;
}

.email-label {
  font-size: 12px;
  color: #6b7280;
}

.email-subject,
.email-body {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 14px;
  box-sizing: border-box;
  font-family: inherit;
}

.email-body {
  resize: vertical;
  line-height: 1.5;
}

.email-body--rich {
  min-height: 280px;
  overflow: auto;
  background: #fff;
}

.email-body--rich:focus {
  outline: 1px solid #409eff;
}

.email-body--rich strong {
  font-weight: 700;
}

.email-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
