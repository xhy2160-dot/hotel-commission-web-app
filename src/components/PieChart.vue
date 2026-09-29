<template>
  <div class="pie">
    <div class="pie__head">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="pie__legend">
        <span v-for="slice in slices" :key="slice.key" class="pie__key">
          <i :style="{ background: slice.color }" />{{ slice.label }}
        </span>
      </div>
    </div>
    <div v-if="!total" class="pie__empty">{{ emptyText }}</div>
    <div v-else class="pie__body" @mouseleave="hoverKey = null">
      <svg viewBox="0 0 200 200" class="pie__svg" role="img">
        <path
            v-for="slice in plotted"
            :key="slice.key"
            :d="slice.d"
            :fill="slice.color"
            :class="{ 'pie__slice--active': hoverKey === slice.key }"
            @mouseenter="hoverKey = slice.key"
        >
          <title>{{ slice.label }}：{{ slice.value }} 人</title>
        </path>
        <circle cx="100" cy="100" :r="innerR" fill="#fff" pointer-events="none" />
        <text x="100" y="96" class="pie__center" pointer-events="none">{{ center }}</text>
        <text v-if="centerHint" x="100" y="116" class="pie__hint" pointer-events="none">{{ centerHint }}</text>
      </svg>
      <div v-if="hover" class="pie__tip">
        <strong>{{ hover.label }}</strong>
        <p>
          <i :style="{ background: hover.color }" />
          <span>{{ hover.count }} 人</span>
          <em>{{ hover.percent }}</em>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  center: { type: String, default: '' },
  centerHint: { type: String, default: '' },
  emptyText: { type: String, default: '这个范围内没有数据' },
  slices: { type: Array, default: () => [] },
})

const outerR = 78
const innerR = 48
const hoverKey = ref(null)

const slices = computed(() => (props.slices || []).filter((item) => Number(item.value) > 0))
const total = computed(() => slices.value.reduce((sum, item) => sum + Number(item.value || 0), 0))

function polar(radius, angle) {
  const rad = ((angle - 90) * Math.PI) / 180
  return [100 + radius * Math.cos(rad), 100 + radius * Math.sin(rad)]
}

function pieSlice(start, end) {
  if (end - start >= 359.999) {
    return [
      `M ${100 - outerR} 100`,
      `A ${outerR} ${outerR} 0 1 1 ${100 + outerR} 100`,
      `A ${outerR} ${outerR} 0 1 1 ${100 - outerR} 100`,
      'Z',
    ].join(' ')
  }
  const [x1, y1] = polar(outerR, start)
  const [x2, y2] = polar(outerR, end)
  const large = end - start > 180 ? 1 : 0
  return `M 100 100 L ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} Z`
}

const plotted = computed(() => {
  let angle = 0
  return slices.value.map((item) => {
    const value = Number(item.value) || 0
    const sweep = total.value ? (value / total.value) * 360 : 0
    const start = angle
    const end = angle + sweep
    angle = end
    return { ...item, value, start, end, d: pieSlice(start, end) }
  })
})

const hover = computed(() => {
  const slice = plotted.value.find((item) => item.key === hoverKey.value)
  if (!slice) return null
  const percent = total.value ? `${((slice.value / total.value) * 100).toFixed(1)}%` : '0.0%'
  return {
    label: slice.label,
    color: slice.color,
    count: slice.value.toLocaleString('zh-CN'),
    percent,
  }
})
</script>

<style scoped>
.pie { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
.pie__head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 8px; }
.pie__head h3 { margin: 0; font-size: 15px; }
.pie__head p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
.pie__legend { display: flex; gap: 12px; flex-wrap: wrap; }
.pie__key { display: inline-flex; align-items: center; gap: 6px; color: #4b5563; font-size: 12px; }
.pie__key i { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
.pie__empty { height: 180px; display: grid; place-items: center; color: #9ca3af; font-size: 13px; }
.pie__body { position: relative; display: grid; place-items: center; }
.pie__svg { width: 220px; height: 220px; display: block; }
.pie__svg path { cursor: pointer; transform-origin: 100px 100px; transition: opacity 0.15s ease; }
.pie__svg path:hover, .pie__slice--active { opacity: 0.86; }
.pie__center { fill: #111827; font-size: 22px; font-weight: 700; text-anchor: middle; }
.pie__hint { fill: #9ca3af; font-size: 11px; text-anchor: middle; }
.pie__tip {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  min-width: 132px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  pointer-events: none;
}
.pie__tip strong { display: block; margin-bottom: 6px; font-size: 12px; }
.pie__tip p {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #4b5563;
  font-size: 12px;
}
.pie__tip i { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
.pie__tip em { margin-left: auto; font-style: normal; color: #111827; font-weight: 600; }
</style>
