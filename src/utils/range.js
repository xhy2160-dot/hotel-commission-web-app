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
  } else if (range === 'last7') {
    from.setDate(from.getDate() - 6)
  } else if (range === 'last14') {
    from.setDate(from.getDate() - 13)
  } else if (range === 'last30') {
    from.setDate(from.getDate() - 29)
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

export function nextDay(day) {
  const [year, month, date] = String(day).split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, date + 1))
  const pad = (num) => String(num).padStart(2, '0')
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

export function eachDay(from, to) {
  const days = []
  if (!from || !to || from > to) return days
  let day = from
  while (day <= to) {
    days.push(day)
    day = nextDay(day)
  }
  return days
}

export function monthEnd(month) {
  const [year, mon] = String(month).split('-').map(Number)
  const last = new Date(year, mon, 0).getDate()
  return `${month}-${String(last).padStart(2, '0')}`
}

export function eachMonth(from, to) {
  const start = String(from || '').slice(0, 7)
  const end = String(to || '').slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end) || start > end) return []
  const months = []
  let [year, month] = start.split('-').map(Number)
  const [endYear, endMonth] = end.split('-').map(Number)
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return months
}

export function lastMonths(count, now = new Date()) {
  const to = startOfDay(now)
  const from = startOfDay(now)
  from.setDate(1)
  from.setMonth(from.getMonth() - (Math.max(Number(count) || 1, 1) - 1))
  return { from: formatDay(from), to: formatDay(to) }
}

export function inDayRange(value, from, to) {
  const date = parseTime(value)
  if (!date) return false
  if (from && date < parseTime(`${from} 00:00:00`)) return false
  if (to && date > parseTime(`${to} 23:59:59`)) return false
  return true
}
