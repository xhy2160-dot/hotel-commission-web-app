<template>
  <div class="data-table-wrapper">
    <!-- Main Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
        <tr>
          <th
              v-for="col in normalizedColumns"
              :key="col.key"
              class="sortable"
              @click="toggleSort(col.key)"
          >
            <div class="header-content">
              <span>{{ col.label }}</span>
              <span v-if="sortKey === col.key" class="sort-indicator">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
            </div>
          </th>
          <th v-if="props.enableAction"></th>
        </tr>
        </thead>
        <tbody>
        <tr v-if="props.data.length === 0">
          <td :colspan="normalizedColumns.length" class="empty-cell">
            暂无数据
          </td>
        </tr>
        <tr v-for="(row, index) in displayData" :key="row.id ?? index">
          <td v-for="col in normalizedColumns" :key="col.key">
            <!-- Dynamic Named Slot by column key -->
            <slot :name="`cell(${col.key})`" :row="row" :value="row[col.key]">
              {{ row[col.key] ?? '-' }}
            </slot>
          </td>
          <td v-if="props.enableAction"><button class="page-btn" @click="emit('action_btn_click',row)" >办理</button></td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- Bottom Bar: Pagination -->
    <div v-if="limit > 0" class="pagination-bar">
      <span class="pagination-info">
        共 {{ total }} 条记录 | 页数 {{ props.page }} / {{ totalPages }}
      </span>
      <div class="pagination-actions">
        <button
            class="page-btn"
            :disabled="props.page <= 1"
            @click="handlePageClick('previous')"
        >
          上一页
        </button>
        <button
            class="page-btn"
            :disabled="props.page >= totalPages"
            @click="handlePageClick('next')"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    required: true,
    default: () => []
  },
  // Accepts either array of strings ['id', 'name'] OR array of objects [{ key: 'id', label: 'ID', sortable: true }]
  columns: {
    type: Array,
    required: true,
    default: () => []
  },
  limit: {
    type: Number,
    default: 10
  },
  // If total is provided (>0), component assumes server-side pagination
  total: {
    type: Number,
    default: 0
  },
  page: { type: Number, default: 1 },
  enableAction:{type:Boolean, default: false},
})
const emit = defineEmits(['pageChange','update:page','action_btn_click'])

// --- Normalize Columns ---
const normalizedColumns = computed(() => {
  return props.columns.map(col => {
    if (typeof col === 'string') {
      return { key: col, label: col }
    }
    return {
      key: col.key,
      label: col.label || col.key,
    }
  })
})

const sortKey = ref('')
const sortDir = ref('asc')

const toggleSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const displayData = computed(() => {
  if (!sortKey.value) return props.data
  const direction = sortDir.value === 'asc' ? 1 : -1
  return [...props.data].sort((a, b) => String(a[sortKey.value] ?? '').localeCompare(String(b[sortKey.value] ?? ''), 'zh', { numeric: true }) * direction)
})

const totalPages = computed(() => {
  if (!props.limit || props.limit <= 0) return 1
  return Math.ceil(props.total / props.limit) || 1
})

const handlePageClick = (direction) => {
  if (direction === 'previous' && props.page  > 1) {
    emit('update:page', props.page - 1)
    emit('pageChange')
  } else if (direction === 'next' && props.page  < totalPages.value) {
    emit('update:page', props.page + 1)
    emit('pageChange')
  }
}

</script>

<style scoped>
.data-table-wrapper {
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #333;
}

.table-toolbar {
  margin-bottom: 12px;
  display: flex;
  justify-content: flex-end;
}

.search-input-wrapper {
  position: relative;
  width: 260px;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
}

.table-container {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875rem;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.data-table th {
  background-color: #f9fafb;
  font-weight: 600;
  color: #4b5563;
  user-select: none;
}

.data-table th.sortable {
  cursor: pointer;
}

.data-table th.sortable:hover {
  background-color: #f3f4f6;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-indicator {
  font-size: 0.75rem;
  color: #3b82f6;
}

.empty-cell {
  text-align: center;
  color: #9ca3af;
  padding: 32px;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  font-size: 0.85rem;
  color: #6b7280;
}

.pagination-actions {
  display: flex;
  gap: 8px;
}

.page-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn:not(:disabled):hover {
  background: #f3f4f6;
}
</style>