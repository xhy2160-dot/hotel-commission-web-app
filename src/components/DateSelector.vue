<template>
  <div class="date-picker" role="application" :aria-label="`Date picker, ${monthLabel} ${currentYear}`">

    <!-- Month navigation -->
    <div class="dp__header">
      <button class="dp__nav-btn" @click="prevMonth" aria-label="Previous month">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <button class="dp__month-label" @click="toggleYearView" :aria-expanded="yearView">
        {{ monthLabel }} {{ currentYear }}
        <svg class="dp__month-chevron" :class="{ rotated: yearView }" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <button class="dp__nav-btn" @click="nextMonth" aria-label="Next month">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 2l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Year picker overlay -->
    <Transition name="fade">
      <div v-if="yearView" class="dp__year-grid" role="listbox" aria-label="Select year">
        <button
            v-for="y in yearRange"
            :key="y"
            class="dp__year-btn"
            :class="{ active: y === currentYear }"
            role="option"
            :aria-selected="y === currentYear"
            @click="selectYear(y)"
        >{{ y }}</button>
      </div>
    </Transition>

    <!-- Day-of-week headers -->
    <div class="dp__weekdays" aria-hidden="true">
      <span v-for="d in WEEKDAYS" :key="d">{{ d }}</span>
    </div>

    <!-- Calendar grid -->
    <div class="dp__grid" role="grid" :aria-label="`${monthLabel} ${currentYear}`">
      <button
          v-for="cell in calendarCells"
          :key="cell.key"
          class="dp__cell"
          :class="{
          'dp__cell--outside': cell.outside,
          'dp__cell--today':   cell.today,
          'dp__cell--selected': cell.selected,
          'dp__cell--disabled': cell.disabled,
        }"
          role="gridcell"
          :aria-label="cell.ariaLabel"
          :aria-selected="cell.selected"
          :aria-disabled="cell.disabled || cell.outside"
          :tabindex="cell.selected ? 0 : -1"
          :disabled="cell.disabled"
          @click="!cell.outside && !cell.disabled && selectDate(cell.date)"
          @keydown="handleKeydown($event, cell)"
      >
        <span class="dp__cell-inner">{{ cell.day }}</span>
        <span v-if="cell.today && !cell.selected" class="dp__today-dot" />
      </button>
    </div>

    <!-- Footer -->
    <div class="dp__footer">
      <button class="dp__today-btn" @click="goToday">Today</button>
      <span class="dp__selected-label" v-if="modelValue">
        {{ formattedSelected }}
      </span>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {useTreatmentStore} from "@/stores/treatment.js";
const treatmentStore = useTreatmentStore()

// ── Props & emits ──────────────────────────────────────────
const props = defineProps({
  modelValue: { type: Date, default: null },
  minDate:    { type: Date, default: null },
  maxDate:    { type: Date, default: null },
})
const emit = defineEmits(['update:modelValue'])

// ── Constants ──────────────────────────────────────────────
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS   = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

// ── State ──────────────────────────────────────────────────
const today = new Date()
today.setHours(0, 0, 0, 0)

const viewYear  = ref(props.modelValue?.getFullYear()  ?? today.getFullYear())
const viewMonth = ref(props.modelValue?.getMonth()     ?? today.getMonth())
const yearView  = ref(false)

// ── Derived ────────────────────────────────────────────────
const currentYear  = computed(() => viewYear.value)
const monthLabel   = computed(() => MONTHS[viewMonth.value])

const yearRange = computed(() => {
  const base = Math.floor(currentYear.value / 10) * 10 - 4
  return Array.from({ length: 16 }, (_, i) => base + i)
})

const calendarCells = computed(() => {
  const year  = viewYear.value
  const month = viewMonth.value

  const firstDay = new Date(year, month, 1).getDay()   // 0=Sun
  const daysInMonth     = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells = []

  // Trailing days from prev month
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i)
    cells.push(makeCell(d, true))
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(makeCell(new Date(year, month, d), false))
  }

  // Leading days of next month to fill 6 rows (42 cells)
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push(makeCell(new Date(year, month + 1, d), true))
  }

  return cells
})

const formattedSelected = computed(() => {
  if (!props.modelValue) return ''
  return props.modelValue.toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })
})

// ── Helpers ────────────────────────────────────────────────
function makeCell(date, outside) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const sel = props.modelValue
      ? sameDay(d, props.modelValue)
      : false
  const disabled =
      (props.minDate && d < props.minDate) ||
      (props.maxDate && d > props.maxDate)

  return {
    key:       d.toISOString(),
    date:      d,
    day:       d.getDate(),
    outside,
    today:     sameDay(d, today),
    selected:  sel,
    disabled,
    ariaLabel: d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  }
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
      a.getMonth()    === b.getMonth()    &&
      a.getDate()     === b.getDate()
}

// ── Actions ────────────────────────────────────────────────
const prevMonth = () => {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
  yearView.value = false
}

const nextMonth = () => {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
  yearView.value = false
}

const selectDate = (date) => {
  emit('update:modelValue', new Date(date))
  treatmentStore.fetchTreatmentsByDate(date)
}

const goToday = () => {
  viewYear.value  = today.getFullYear()
  viewMonth.value = today.getMonth()
  emit('update:modelValue', new Date(today))
  yearView.value  = false
}

const toggleYearView = () => { yearView.value = !yearView.value }

const selectYear = (y) => {
  viewYear.value = y
  yearView.value = false
}

// Keyboard navigation
const handleKeydown = (e, cell) => {
  const map = {
    ArrowLeft:  -1,
    ArrowRight:  1,
    ArrowUp:    -7,
    ArrowDown:   7,
  }
  if (map[e.key] !== undefined) {
    e.preventDefault()
    const next = new Date(cell.date)
    next.setDate(next.getDate() + map[e.key])
    viewYear.value  = next.getFullYear()
    viewMonth.value = next.getMonth()
    emit('update:modelValue', next)
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    selectDate(cell.date)
  }
}
</script>

<style scoped>
/* ── Shell ──────────────────────────────────────────────── */
.date-picker {
  display: inline-flex;
  flex-direction: column;
  width: 240px;
  background: #ffffff;
  border: 1px solid #e5e9ef;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 12px;
  box-sizing: border-box;
  font-family: 'Inter', system-ui, sans-serif;
  position: relative;
  user-select: none;
}

/* ── Header ─────────────────────────────────────────────── */
.dp__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.dp__nav-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.13s, color 0.13s;
}

.dp__nav-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.dp__month-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.13s;
  letter-spacing: -0.01em;
}

.dp__month-label:hover {
  background: #f3f4f6;
}

.dp__month-chevron {
  color: #9ca3af;
  transition: transform 0.2s;
}

.dp__month-chevron.rotated {
  transform: rotate(180deg);
}

/* ── Year grid ──────────────────────────────────────────── */
.dp__year-grid {
  position: absolute;
  top: 44px;
  left: 12px;
  right: 12px;
  background: #fff;
  border: 1px solid #e5e9ef;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  padding: 8px;
  z-index: 10;
}

.dp__year-btn {
  padding: 6px 0;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  color: #374151;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  text-align: center;
}

.dp__year-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.dp__year-btn.active {
  background: #111827;
  color: #fff;
}

/* ── Weekday headers ────────────────────────────────────── */
.dp__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}

.dp__weekdays span {
  text-align: center;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #9ca3af;
  padding: 2px 0 4px;
  text-transform: uppercase;
}

/* ── Grid ───────────────────────────────────────────────── */
.dp__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.dp__cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  transition: background 0.12s;
  outline: none;
}

.dp__cell:focus-visible {
  box-shadow: 0 0 0 2px #2563eb;
}

.dp__cell--outside {
  opacity: 0;
  pointer-events: none;
}

.dp__cell:not(.dp__cell--outside):not(.dp__cell--selected):not(.dp__cell--disabled):hover {
  background: #f3f4f6;
}

.dp__cell--today .dp__cell-inner {
  color: #2563eb;
  font-weight: 700;
}

.dp__cell--selected {
  background: #111827 !important;
  border-radius: 6px;
}

.dp__cell--selected .dp__cell-inner {
  color: #fff;
  font-weight: 600;
}

.dp__cell--disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.dp__cell-inner {
  font-size: 12.5px;
  color: #374151;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

/* Today dot */
.dp__today-dot {
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #2563eb;
}

/* ── Footer ─────────────────────────────────────────────── */
.dp__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f3f4f6;
}

.dp__today-btn {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 5px;
  font-family: inherit;
  transition: background 0.13s;
}

.dp__today-btn:hover {
  background: #eff6ff;
}

.dp__selected-label {
  font-size: 11px;
  color: #9ca3af;
  text-align: right;
  max-width: 130px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Transition ─────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>