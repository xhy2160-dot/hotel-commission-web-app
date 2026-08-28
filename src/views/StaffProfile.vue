<template>
  <div class="dashboard">

    <!-- Header -->
    <div class="dashboard__header">
      <div>
        <p class="dashboard__eyebrow">Dashboard</p>
        <h1 class="dashboard__title">Staff Tasks</h1>
      </div>

      <!-- Staff dropdown -->
      <div class="dropdown-wrap">
        <label for="staff-select" class="dropdown-label">Viewing tasks for</label>
        <div class="dropdown">
          <select id="staff-select" v-model="selectedId">
            <option value="">— Select a staff member —</option>
            <option v-for="s in staff" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <svg class="dropdown__chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Empty state: no staff chosen -->
    <div v-if="!selectedId" class="empty-state">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="10" width="28" height="24" rx="3" stroke="#d1d5db" stroke-width="1.8"/>
        <path d="M6 16h28" stroke="#d1d5db" stroke-width="1.8"/>
        <path d="M13 10V7M27 10V7" stroke="#d1d5db" stroke-width="1.8" stroke-linecap="round"/>
        <rect x="12" y="22" width="6" height="2" rx="1" fill="#e5e7eb"/>
        <rect x="22" y="22" width="6" height="2" rx="1" fill="#e5e7eb"/>
        <rect x="12" y="27" width="6" height="2" rx="1" fill="#e5e7eb"/>
        <rect x="22" y="27" width="6" height="2" rx="1" fill="#e5e7eb"/>
      </svg>
      <p class="empty-state__text">Select a staff member to view their tasks.</p>
    </div>

    <!-- Tasks panel -->
    <template v-else>
      <!-- Staff card + summary -->
      <div class="staff-bar">
        <div class="staff-bar__avatar">{{ initials }}</div>
        <div class="staff-bar__info">
          <span class="staff-bar__name">{{ selectedStaff.name }}</span>
          <span class="staff-bar__role">{{ selectedStaff.role }}</span>
        </div>
        <div class="staff-bar__pills">
          <span class="pill pill--inprogress">{{ countByStatus('In Progress') }} In Progress</span>
          <span class="pill pill--done">{{ countByStatus('Done') }} Done</span>
        </div>
        <div class="staff-bar__total">
          <span class="staff-bar__total-value">{{ fmtCurrency(totalFee) }}</span>
          <span class="staff-bar__total-label">Total fees</span>
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="filter-row">
        <button
            v-for="f in FILTERS"
            :key="f"
            class="filter-btn"
            :class="{ active: activeFilter === f }"
            @click="activeFilter = f"
        >{{ f }}</button>
        <span class="filter-row__count">{{ filteredTasks.length }} task{{ filteredTasks.length !== 1 ? 's' : '' }}</span>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <table class="task-table">
          <thead>
          <tr>
            <th
                v-for="col in COLUMNS"
                :key="col.key"
                :class="['task-table__th', `task-table__th--${col.key}`, { sortable: col.sortable }]"
                @click="col.sortable && setSort(col.key)"
            >
              {{ col.label }}
              <span v-if="col.sortable" class="sort-icon" :class="{ active: sortKey === col.key }">
                  {{ sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕' }}
                </span>
            </th>
          </tr>
          </thead>
          <tbody>
          <tr v-if="filteredTasks.length === 0">
            <td :colspan="COLUMNS.length" class="task-table__empty">No tasks match this filter.</td>
          </tr>
          <tr
              v-for="task in filteredTasks"
              :key="task.id"
              class="task-table__row"
          >
            <td class="task-table__td task-table__td--name">
              <span class="task-name">{{ task.name }}</span>
            </td>
            <td class="task-table__td task-table__td--location">
                <span class="location-tag">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1C4.343 1 3 2.343 3 4c0 2.25 3 7 3 7s3-4.75 3-7c0-1.657-1.343-3-3-3z" stroke="currentColor" stroke-width="1.2" fill="none"/>
                    <circle cx="6" cy="4" r="1" fill="currentColor"/>
                  </svg>
                  {{ task.location }}
                </span>
            </td>
            <td class="task-table__td task-table__td--fee">
              {{ fmtCurrency(task.fee) }}
            </td>
            <td class="task-table__td task-table__td--status">
              <span class="status-badge" :class="statusClass(task.status)">{{ task.status }}</span>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// ── Constants ─────────────────────────────────────────────────
const FILTERS = ['All', 'In Progress', 'Done']
const COLUMNS = [
  { key: 'name',     label: 'Task',     sortable: true  },
  { key: 'location', label: 'Location', sortable: false },
  { key: 'fee',      label: 'Fee',      sortable: true  },
  { key: 'status',   label: 'Status',   sortable: true  },
]

// ── Mock data ─────────────────────────────────────────────────
const staff = [
  {
    id: 1,
    name: 'Alice Martin',
    role: 'Senior Coordinator',
    tasks: [
      { id: 101, name: 'Client onboarding',       location: 'Toronto, ON',   fee: 1200, status: 'Done'        },
      { id: 102, name: 'Q3 budget review',         location: 'Remote',        fee: 850,  status: 'In Progress' },
      { id: 103, name: 'Vendor contract renewal',  location: 'Ottawa, ON',    fee: 2300, status: 'In Progress' },
      { id: 104, name: 'Staff training session',   location: 'Toronto, ON',   fee: 600,  status: 'Done'        },
    ]
  },
  {
    id: 2,
    name: 'Brian Chen',
    role: 'Project Manager',
    tasks: [
      { id: 201, name: 'Site assessment',          location: 'Mississauga, ON', fee: 1750, status: 'Done'        },
      { id: 202, name: 'Safety compliance audit',  location: 'Hamilton, ON',    fee: 3100, status: 'In Progress' },
      { id: 203, name: 'Equipment procurement',    location: 'Remote',          fee: 980,  status: 'In Progress' },
    ]
  },
  {
    id: 3,
    name: 'Diana Osei',
    role: 'Field Technician',
    tasks: [
      { id: 301, name: 'Network installation',     location: 'Brampton, ON',  fee: 2200, status: 'Done'        },
      { id: 302, name: 'Hardware diagnostics',     location: 'Brampton, ON',  fee: 450,  status: 'Done'        },
      { id: 303, name: 'Cable management',         location: 'Vaughan, ON',   fee: 700,  status: 'In Progress' },
      { id: 304, name: 'Server room setup',        location: 'Vaughan, ON',   fee: 3800, status: 'In Progress' },
      { id: 305, name: 'UPS installation',         location: 'Markham, ON',   fee: 1100, status: 'Done'        },
    ]
  },
  {
    id: 4,
    name: 'James Kowalski',
    role: 'Accounts Manager',
    tasks: [
      { id: 401, name: 'Invoice reconciliation',   location: 'Remote',        fee: 600,  status: 'Done'        },
      { id: 402, name: 'Year-end reporting',       location: 'Toronto, ON',   fee: 2900, status: 'In Progress' },
    ]
  },
]

// ── State ─────────────────────────────────────────────────────
const selectedId  = ref('')
const activeFilter = ref('All')
const sortKey     = ref('name')
const sortDir     = ref('asc')

// ── Derived ───────────────────────────────────────────────────
const selectedStaff = computed(() =>
    staff.find(s => s.id === selectedId.value) ?? null
)

const initials = computed(() => {
  if (!selectedStaff.value) return ''
  return selectedStaff.value.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
})

const filteredTasks = computed(() => {
  if (!selectedStaff.value) return []
  let tasks = selectedStaff.value.tasks
  if (activeFilter.value !== 'All') {
    tasks = tasks.filter(t => t.status === activeFilter.value)
  }
  return [...tasks].sort((a, b) => {
    let valA = a[sortKey.value]
    let valB = b[sortKey.value]
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    if (valA < valB) return sortDir.value === 'asc' ? -1 : 1
    if (valA > valB) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
})

const totalFee = computed(() =>
    (selectedStaff.value?.tasks ?? []).reduce((sum, t) => sum + t.fee, 0)
)

const countByStatus = (status) =>
    (selectedStaff.value?.tasks ?? []).filter(t => t.status === status).length

// ── Actions ───────────────────────────────────────────────────
const setSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

// ── Formatters ────────────────────────────────────────────────
const fmtCurrency = (val) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(val)

const statusClass = (status) => ({
  'status-badge--inprogress': status === 'In Progress',
  'status-badge--done':       status === 'Done',
})
</script>

<style scoped>
/* ── Page ───────────────────────────────────────────────── */
.dashboard {
  max-width: 960px;
  margin: 0 auto;
  padding: 44px 28px 72px;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Header ─────────────────────────────────────────────── */
.dashboard__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 32px;
}

.dashboard__eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
  margin: 0 0 6px;
}

.dashboard__title {
  font-size: 26px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  letter-spacing: -0.02em;
}

/* ── Dropdown ───────────────────────────────────────────── */
.dropdown-wrap {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 230px;
}

.dropdown-label {
  font-size: 11.5px;
  font-weight: 500;
  color: #6b7280;
  letter-spacing: 0.01em;
}

.dropdown {
  position: relative;
}

.dropdown select {
  width: 100%;
  appearance: none;
  padding: 9px 36px 9px 13px;
  border: 1.5px solid #e5e9ef;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #111827;
  background: #fff;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.dropdown select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.dropdown__chevron {
  position: absolute;
  right: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

/* ── Empty state ────────────────────────────────────────── */
.empty-state {
  margin-top: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.empty-state__text {
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
}

/* ── Staff bar ──────────────────────────────────────────── */
.staff-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: #f9fafb;
  border: 1px solid #e5e9ef;
  border-radius: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.staff-bar__avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #111827;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.03em;
}

.staff-bar__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 120px;
}

.staff-bar__name {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.staff-bar__role {
  font-size: 12px;
  color: #6b7280;
}

.staff-bar__pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pill {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 100px;
  letter-spacing: 0.01em;
}

.pill--inprogress {
  background: #eff6ff;
  color: #1d4ed8;
}

.pill--done {
  background: #f0fdf4;
  color: #15803d;
}

.staff-bar__total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.staff-bar__total-value {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.staff-bar__total-label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

/* ── Filter row ─────────────────────────────────────────── */
.filter-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.filter-btn {
  padding: 6px 14px;
  border-radius: 7px;
  border: 1.5px solid #e5e9ef;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn:hover {
  border-color: #d1d5db;
  color: #111827;
}

.filter-btn.active {
  background: #111827;
  border-color: #111827;
  color: #fff;
}

.filter-row__count {
  margin-left: auto;
  font-size: 12.5px;
  color: #9ca3af;
  font-weight: 500;
}

/* ── Table ──────────────────────────────────────────────── */
.table-wrap {
  border: 1px solid #e5e9ef;
  border-radius: 10px;
  overflow: hidden;
}

.task-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.task-table__th {
  padding: 11px 16px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e9ef;
  white-space: nowrap;
  user-select: none;
}

.task-table__th.sortable {
  cursor: pointer;
}

.task-table__th.sortable:hover {
  color: #111827;
}

.sort-icon {
  margin-left: 4px;
  color: #d1d5db;
  font-style: normal;
}

.sort-icon.active {
  color: #2563eb;
}

.task-table__row {
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.12s;
}

.task-table__row:last-child {
  border-bottom: none;
}

.task-table__row:hover {
  background: #f9fafb;
}

.task-table__td {
  padding: 13px 16px;
  color: #374151;
  vertical-align: middle;
}

.task-table__empty {
  padding: 40px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 13.5px;
}

/* ── Cell-specific ──────────────────────────────────────── */
.task-name {
  font-weight: 500;
  color: #111827;
}

.location-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #6b7280;
  font-size: 13px;
}

.task-table__td--fee {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
}

/* ── Status badge ───────────────────────────────────────── */
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.status-badge--inprogress {
  background: #eff6ff;
  color: #1d4ed8;
}

.status-badge--done {
  background: #f0fdf4;
  color: #15803d;
}

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 600px) {
  .dashboard {
    padding: 28px 16px 48px;
  }

  .dashboard__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dropdown-wrap {
    width: 100%;
  }

  .staff-bar {
    gap: 10px;
  }

  .staff-bar__total {
    align-items: flex-start;
    width: 100%;
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
}
</style>
