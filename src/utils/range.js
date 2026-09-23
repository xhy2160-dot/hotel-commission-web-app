export function startOfDay(date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

export function formatDay(date) {
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function rangeBounds(range, now = new Date()) {
  const to = startOfDay(now)
  const from = startOfDay(now)
  if (range === 'week') {
    const weekday = from.getDay() || 7
    from.setDate(from.getDate() - weekday + 1)
  } else if (range === 'month') {
    from.setDate(1)
  }
  return { from: formatDay(from), to: formatDay(to) }
}

export function parseTime(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return new Date(value * 1000)
  const text = String(value).trim()
  if (/^\d+$/.test(text)) return new Date(Number(text) * 1000)
  const normalized = text.includes('T') ? text : text.replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function inDayRange(value, from, to) {
  const date = parseTime(value)
  if (!date) return false
  if (from && date < parseTime(`${from} 00:00:00`)) return false
  if (to && date > parseTime(`${to} 23:59:59`)) return false
  return true
}
