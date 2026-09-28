<template>
  <div class="chart">
    <div class="chart__head">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="chart__legend">
        <span v-for="line in lines" :key="line.key" class="chart__key">
          <i :style="{ background: line.color }" />{{ line.label }}
        </span>
      </div>
    </div>
    <div v-if="!labels.length" class="chart__empty">这个范围内没有数据</div>
    <svg v-else :viewBox="`0 0 ${width} ${height}`" class="chart__svg" role="img">
      <g v-for="tick in yTicks" :key="tick.value">
        <line :x1="pad.left" :x2="width - pad.right" :y1="tick.y" :y2="tick.y" class="chart__grid" />
        <text :x="pad.left - 8" :y="tick.y + 4" class="chart__tick">{{ tick.label }}</text>
      </g>
      <g v-for="line in plotted" :key="line.key">
        <path v-if="line.area" :d="line.area" :fill="line.color" class="chart__area" />
        <path :d="line.path" :stroke="line.color" class="chart__line" />
      </g>
      <g v-for="label in xLabels" :key="`${label.index}-${label.text}`">
        <text :x="xAt(label.index)" :y="height - 10" class="chart__xlabel">{{ label.text }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  labels: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  fill: { type: Boolean, default: false },
})

const width = 720
const height = 240
const pad = { top: 16, right: 16, bottom: 32, left: 52 }

const lines = computed(() => props.series.filter((item) => item && item.values))

const maxValue = computed(() => {
  const values = lines.value.flatMap((item) => item.values.map((value) => Number(value) || 0))
  const max = Math.max(0, ...values)
  if (max <= 5) return 5
  const step = 10 ** Math.floor(Math.log10(max))
  return Math.ceil(max / step) * step
})

const yTicks = computed(() => {
  const ticks = 4
  return Array.from({ length: ticks + 1 }, (_, index) => {
    const value = (maxValue.value / ticks) * index
    const y = pad.top + (1 - index / ticks) * (height - pad.top - pad.bottom)
    return { value, y, label: formatTick(value) }
  })
})

const xLabels = computed(() => {
  if (!props.labels.length) return []
  const count = props.labels.length
  const step = count <= 8 ? 1 : Math.ceil(count / 6)
  const marks = []
  for (let index = 0; index < count; index += step) marks.push({ index, text: formatLabel(props.labels[index]) })
  if (marks[marks.length - 1]?.index !== count - 1) {
    marks.push({ index: count - 1, text: formatLabel(props.labels[count - 1]) })
  }
  return marks
})

function formatTick(value) {
  const abs = Math.abs(value)
  if (abs >= 10000) {
    const wan = value / 10000
    return `${Number.isInteger(wan) ? wan : wan.toFixed(1)}万`
  }
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1)
}

function formatLabel(label) {
  const text = String(label || '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(5)
  if (/^\d{4}-\d{2}$/.test(text)) return text.slice(2)
  return text
}

function xAt(index) {
  const count = Math.max(props.labels.length - 1, 1)
  return pad.left + (index / count) * (width - pad.left - pad.right)
}

function yAt(value) {
  const max = maxValue.value || 1
  return pad.top + (1 - (Number(value) || 0) / max) * (height - pad.top - pad.bottom)
}

const plotted = computed(() => lines.value.map((line) => {
  const points = (line.values || []).map((value, index) => `${xAt(index)},${yAt(value)}`)
  const path = points.length ? `M${points.join(' L')}` : ''
  const last = points[points.length - 1]
  const first = points[0]
  const area = props.fill && first && last
    ? `${path} L${xAt((line.values.length || 1) - 1)},${height - pad.bottom} L${xAt(0)},${height - pad.bottom} Z`
    : ''
  return { ...line, path, area }
}))
</script>

<style scoped>
.chart { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 16px 8px; }
.chart__head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 8px; }
.chart__head h3 { margin: 0; font-size: 15px; }
.chart__head p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
.chart__legend { display: flex; gap: 12px; flex-wrap: wrap; }
.chart__key { display: inline-flex; align-items: center; gap: 6px; color: #4b5563; font-size: 12px; }
.chart__key i { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
.chart__empty { height: 180px; display: grid; place-items: center; color: #9ca3af; font-size: 13px; }
.chart__svg { width: 100%; height: 240px; display: block; }
.chart__grid { stroke: #f3f4f6; stroke-width: 1; }
.chart__tick, .chart__xlabel { fill: #9ca3af; font-size: 10px; text-anchor: end; }
.chart__xlabel { text-anchor: middle; }
.chart__line { fill: none; stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }
.chart__area { opacity: 0.12; }
</style>
