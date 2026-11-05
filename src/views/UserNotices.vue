<template>
  <div class="notice-page">
    <div class="tabs">
      <button
          v-for="t in TABS"
          :key="t.key"
          type="button"
          class="tab"
          :class="{ active: activeTab === t.key }"
          @click="switchTab(t.key)"
      >{{ t.label }}</button>
    </div>

    <!-- Compose -->
    <form v-if="activeTab === 'compose'" class="card notice-form" @submit.prevent="submitForm">
      <div class="form-group">
        <label class="form-label">用户 ID <span class="required">*</span></label>
        <input
            v-model.trim="form.user_id"
            type="text"
            inputmode="numeric"
            placeholder="请输入接收通知的用户 ID"
            class="form-input"
            :class="{ 'input-error': errors.user_id }"
            @input="errors.user_id = ''"
        />
        <p v-if="errors.user_id" class="error-text">{{ errors.user_id }}</p>
      </div>

      <div class="form-group">
        <label class="form-label">标题 <span class="required">*</span></label>
        <input
            v-model="form.subject"
            type="text"
            maxlength="255"
            placeholder="请输入通知标题"
            class="form-input"
            :class="{ 'input-error': errors.subject }"
            @input="errors.subject = ''"
        />
        <p v-if="errors.subject" class="error-text">{{ errors.subject }}</p>
      </div>

      <div class="form-group">
        <label class="form-label">内容 <span class="required">*</span></label>
        <textarea
            v-model="form.content"
            rows="6"
            placeholder="请输入通知内容"
            class="form-input form-textarea"
            :class="{ 'input-error': errors.content }"
            @input="errors.content = ''"
        />
        <p v-if="errors.content" class="error-text">{{ errors.content }}</p>
      </div>

      <div class="form-actions">
        <button type="submit" :disabled="submitting" class="btn btn-primary">
          {{ submitting ? '发送中...' : '提交' }}
        </button>
        <button type="button" class="btn btn-secondary" :disabled="submitting" @click="resetForm">重置</button>
      </div>
    </form>

    <!-- History -->
    <div v-else class="card">
      <div class="history-toolbar">
        <input
            v-model.trim="filterUserId"
            type="text"
            inputmode="numeric"
            placeholder="按用户 ID 筛选"
            class="form-input filter-input"
            @keyup.enter="reload"
        />
        <button type="button" class="btn btn-secondary" @click="reload">查询</button>
      </div>
      <LoadingSpinner v-if="loading" />
      <DataTable
          v-else
          :data="notices"
          :columns="COLUMNS"
          :limit="limit"
          :total="total"
          v-model:page="page"
          @page-change="loadNotices"
      >
        <template #cell(content)="{ value }">
          <span class="content-cell" :title="value">{{ value }}</span>
        </template>
        <template #cell(create_time)="{ value }">{{ formatAnyTime(value) }}</template>
        <template #cell(read_time)="{ value }">
          <span v-if="value">{{ formatAnyTime(value) }}</span>
          <span v-else class="unread">未读</span>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import DataTable from '@/components/DataTable.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { sendUserNotice, getUserNotices } from '@/api/index.js'
import { formatAnyTime } from '@/utils/formatDate.js'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

const TABS = [
  { key: 'compose', label: '编辑通知' },
  { key: 'history', label: '历史通知' },
]
const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'user_id', label: '用户 ID' },
  { key: 'subject', label: '标题' },
  { key: 'content', label: '内容', sortable: false },
  { key: 'create_time', label: '发送时间' },
  { key: 'read_time', label: '阅读时间' },
]

const activeTab = ref('compose')

// ---- Compose ----
const submitting = ref(false)
const form = reactive({ user_id: '', subject: '', content: '' })
const errors = reactive({ user_id: '', subject: '', content: '' })

function validate() {
  errors.user_id = /^\d+$/.test(form.user_id) && Number(form.user_id) > 0 ? '' : '请输入有效的用户 ID'
  errors.subject = form.subject.trim() ? '' : '请输入通知标题'
  errors.content = form.content.trim() ? '' : '请输入通知内容'
  return !errors.user_id && !errors.subject && !errors.content
}

async function submitForm() {
  if (!validate()) return
  submitting.value = true
  try {
    await sendUserNotice({
      user_id: Number(form.user_id),
      subject: form.subject.trim(),
      content: form.content.trim(),
    })
    showToast('通知已发送', 'success')
    resetForm()
  } catch (err) {
    showToast(err.response?.data?.message || err.message || '发送失败，请稍后重试', 'error')
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.user_id = ''
  form.subject = ''
  form.content = ''
  Object.keys(errors).forEach((k) => (errors[k] = ''))
}

// ---- History ----
const loading = ref(false)
const notices = ref([])
const total = ref(0)
const page = ref(1)
const limit = 20
const filterUserId = ref('')

async function loadNotices() {
  loading.value = true
  try {
    const query = { page: page.value, limit }
    if (/^\d+$/.test(filterUserId.value)) query.user_id = filterUserId.value
    const res = await getUserNotices(query)
    notices.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (err) {
    showToast(err.response?.data?.message || err.message || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  loadNotices()
}

function switchTab(key) {
  activeTab.value = key
  if (key === 'history') reload()
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.notice-page {
  max-width: 1100px;
  margin: 24px auto;
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #e5e9ef;
  margin-bottom: 16px;
}

.tab {
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
}

.tab:hover {
  color: #1f2937;
}

.tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.card {
  padding: 24px;
  background-color: #fff;
  border-radius: 12px;
  border: 1px solid #eaedf1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.notice-form {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.required {
  color: #ef4444;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  background-color: #fff;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.input-error {
  border-color: #ef4444 !important;
}

.error-text {
  margin: 4px 0 0;
  font-size: 12px;
  color: #ef4444;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 9px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:disabled {
  cursor: not-allowed;
}

.btn-primary {
  background-color: #2563eb;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.btn-primary:disabled {
  background-color: #93c5fd;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.history-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-input {
  max-width: 220px;
}

.content-cell {
  display: inline-block;
  max-width: 360px;
  white-space: pre-wrap;
  word-break: break-word;
}

.unread {
  color: #9ca3af;
}
</style>
