<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="modelValue" class="popup-backdrop" @click.self="close" />
    </Transition>

    <Transition name="popup">
      <div v-if="modelValue" class="popup" role="dialog" aria-modal="true" aria-labelledby="popup-title">
        <div class="popup-header">
          <h2 id="popup-title">New event</h2>
          <button class="close-btn" @click="close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="popup-body">
          <!-- Title -->
          <div class="field">
            <label for="ev-title">Title <span class="required">*</span></label>
            <input
                id="ev-title"
                v-model="form.title"
                type="text"
                placeholder="Event title"
                autocomplete="off"
                ref="titleInput"
                :class="{ error: errors.title }"
            />
            <span v-if="errors.title" class="field-error">{{ errors.title }}</span>
          </div>

          <!-- All day toggle -->
          <div class="field field--row">
            <label class="toggle-label" for="ev-allday">
              <span>All day</span>
              <div class="toggle" :class="{ active: form.allDay }">
                <input id="ev-allday" type="checkbox" v-model="form.allDay" />
                <span class="toggle-thumb" />
              </div>
            </label>
          </div>

          <!-- Start -->
          <div class="field-row">
            <div class="field">
              <label for="ev-start-date">Start date <span class="required">*</span></label>
              <input
                  id="ev-start-date"
                  v-model="form.startDate"
                  type="date"
                  :class="{ error: errors.start }"
              />
            </div>
            <div class="field" v-if="!form.allDay">
              <label for="ev-start-time">Start time</label>
              <input id="ev-start-time" v-model="form.startTime" type="time" />
            </div>
          </div>

          <!-- End -->
          <div class="field-row">
            <div class="field">
              <label for="ev-end-date">End date <span class="required">*</span></label>
              <input
                  id="ev-end-date"
                  v-model="form.endDate"
                  type="date"
                  :class="{ error: errors.end }"
              />
            </div>
            <div class="field" v-if="!form.allDay">
              <label for="ev-end-time">End time</label>
              <input id="ev-end-time" v-model="form.endTime" type="time" />
            </div>
          </div>

          <span v-if="errors.end" class="field-error">{{ errors.end }}</span>
          <span v-if="errors.start" class="field-error">{{ errors.start }}</span>

          <!-- Description -->
          <div class="field">
            <label for="ev-description">Description</label>
            <textarea
                id="ev-description"
                v-model="form.description"
                placeholder="Optional notes…"
                rows="3"
            />
          </div>

          <!-- Color -->
          <div class="field">
            <label>Color</label>
            <div class="color-row">
              <button
                  v-for="color in COLORS"
                  :key="color.value"
                  type="button"
                  class="color-swatch"
                  :style="{ background: color.value }"
                  :class="{ selected: form.color === color.value }"
                  :aria-label="color.label"
                  @click="form.color = color.value"
              >
                <svg v-if="form.color === color.value" width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5 4.5-5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="popup-footer">
          <button class="btn btn--ghost" @click="close">Cancel</button>
          <button class="btn btn--primary" @click="submit">Add event</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // Pre-fill start when clicking a slot
  initialDate: {
    type: Date,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'add'])

// ─── Constants ───────────────────────────────────────────────
const COLORS = [
  { label: 'Indigo',  value: '#4f46e5' },
  { label: 'Sky',     value: '#0ea5e9' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Rose',    value: '#f43f5e' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Slate',   value: '#64748b' },
]

// ─── Helpers ─────────────────────────────────────────────────
const toDateStr = (date) => {
  const d = date || new Date()
  return d.toISOString().split('T')[0]
}

const toTimeStr = (date) => {
  const d = date || new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const buildDate = (dateStr, timeStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}

const buildAllDayStart = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0)
}

const buildAllDayEnd = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59)
}

// ─── Form state ──────────────────────────────────────────────
const defaultForm = () => {
  const base = props.initialDate || new Date()
  const end = new Date(base.getTime() + 60 * 60 * 1000)
  return {
    title: '',
    allDay: false,
    startDate: toDateStr(base),
    startTime: toTimeStr(base),
    endDate: toDateStr(end),
    endTime: toTimeStr(end),
    description: '',
    color: COLORS[0].value,
  }
}

const form = ref(defaultForm())
const errors = ref({})
const titleInput = ref(null)

// Reset form when popup opens or initialDate changes
watch(() => props.modelValue, (open) => {
  if (open) {
    form.value = defaultForm()
    errors.value = {}
    nextTick(() => titleInput.value?.focus())
  }
})

watch(() => props.initialDate, () => {
  if (props.modelValue) {
    form.value = defaultForm()
  }
})

// Keep end date in sync when start date moves past it
watch(() => form.value.startDate, (newVal) => {
  if (newVal > form.value.endDate) {
    form.value.endDate = newVal
  }
})

// ─── Actions ─────────────────────────────────────────────────
const close = () => emit('update:modelValue', false)

const validate = () => {
  const e = {}
  if (!form.value.title.trim()) {
    e.title = 'Title is required.'
  }
  if (!form.value.startDate) {
    e.start = 'Start date is required.'
  }
  if (!form.value.endDate) {
    e.end = 'End date is required.'
  }
  if (form.value.startDate && form.value.endDate && !form.value.allDay) {
    const start = buildDate(form.value.startDate, form.value.startTime)
    const end = buildDate(form.value.endDate, form.value.endTime)
    if (end <= start) {
      e.end = 'End must be after start.'
    }
  }
  errors.value = e
  return Object.keys(e).length === 0
}

const submit = () => {
  if (!validate()) return

  const start = form.value.allDay
      ? buildAllDayStart(form.value.startDate)
      : buildDate(form.value.startDate, form.value.startTime)

  const end = form.value.allDay
      ? buildAllDayEnd(form.value.endDate)
      : buildDate(form.value.endDate, form.value.endTime)

  const event = {
    id: `evt-${Date.now()}`,
    title: form.value.title.trim(),
    start,
    end,
    allDay: form.value.allDay,
    color: form.value.color,
    description: form.value.description.trim() || undefined,
  }

  emit('add', event)
  close()
}
</script>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────── */
.popup-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  z-index: 1000;
}

/* ── Popup ────────────────────────────────────────────── */
.popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
  width: 440px;
  max-width: calc(100vw - 32px);
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08);
  font-family: 'Inter', system-ui, sans-serif;
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────── */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.popup-header h2 {
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.01em;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* ── Body ─────────────────────────────────────────────── */
.popup-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Fields ───────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field label {
  font-size: 12.5px;
  font-weight: 500;
  color: #475569;
  letter-spacing: 0.01em;
}

.required {
  color: #f43f5e;
  margin-left: 2px;
}

.field input[type="text"],
.field input[type="date"],
.field input[type="time"],
.field textarea {
  padding: 8px 11px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #0f172a;
  background: #f8fafc;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.field input:focus,
.field textarea:focus {
  border-color: #4f46e5;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.field input.error,
.field textarea.error {
  border-color: #f43f5e;
}

.field textarea {
  resize: vertical;
  min-height: 72px;
  line-height: 1.5;
}

.field-error {
  font-size: 12px;
  color: #f43f5e;
  margin-top: -2px;
}

/* ── All-day toggle ───────────────────────────────────── */
.field--row {
  flex-direction: row;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.toggle {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 100px;
  background: #e2e8f0;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle.active {
  background: #4f46e5;
}

.toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}

.toggle.active .toggle-thumb {
  transform: translateX(16px);
}

/* ── Color picker ─────────────────────────────────────── */
.color-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
  outline: none;
}

.color-swatch:hover {
  transform: scale(1.15);
}

.color-swatch.selected {
  border-color: #fff;
  box-shadow: 0 0 0 2.5px currentColor, 0 2px 8px rgba(0,0,0,0.2);
}

/* ── Footer ───────────────────────────────────────────── */
.popup-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}

.btn {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  border: none;
  transition: background 0.15s, box-shadow 0.15s;
}

.btn--ghost {
  background: #f1f5f9;
  color: #475569;
}

.btn--ghost:hover {
  background: #e2e8f0;
}

.btn--primary {
  background: #4f46e5;
  color: #fff;
  box-shadow: 0 1px 3px rgba(79, 70, 229, 0.3);
}

.btn--primary:hover {
  background: #4338ca;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}

/* ── Transitions ──────────────────────────────────────── */
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

.popup-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.popup-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.popup-enter-from {
  opacity: 0;
  transform: translate(-50%, -48%) scale(0.96);
}
.popup-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.96);
}
</style>