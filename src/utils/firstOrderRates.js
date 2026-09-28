import { parseTime } from './range.js'

const DAY = 86400000

function firstOrderAt(userId, orders) {
  let first = null
  for (const order of orders) {
    if (Number(order.user_id) !== Number(userId)) continue
    const at = parseTime(order.submitted_at || order.created_at || order.createdAt)
    if (!at) continue
    if (!first || at < first) first = at
  }
  return first
}

function pack(converted, cohort) {
  const count = Number(converted || 0)
  const den = Number(cohort || 0)
  return {
    converted: count,
    cohort: den,
    rate: den > 0 ? Math.round((count / den) * 1000) / 1000 : null,
  }
}

export function formatFirstOrderRate(item) {
  if (!item) return '-'
  if (item.rate === null || item.rate === undefined || !item.cohort) return '观察中'
  return `${(Number(item.rate) * 100).toFixed(1)}%`
}

export function firstOrderRateHint(item) {
  if (!item || !item.cohort) return '注册未满观察期，暂不计入'
  return `${item.converted}/${item.cohort}`
}

export function buildFirstOrderRates(users, orders, query = {}, now = new Date()) {
  const nowMs = now.getTime()
  const months = new Map()
  let cohort7 = 0
  let first7 = 0
  let cohort30 = 0
  let first30 = 0

  for (const user of users) {
    const registeredAt = parseTime(user.registered_at || user.create_time)
    if (!registeredAt) continue
    if (query.from && registeredAt < parseTime(`${query.from} 00:00:00`)) continue
    if (query.to && registeredAt > parseTime(`${query.to} 23:59:59`)) continue

    const month = `${registeredAt.getFullYear()}-${String(registeredAt.getMonth() + 1).padStart(2, '0')}`
    if (!months.has(month)) {
      months.set(month, { month, users: 0, cohort7: 0, first7: 0, cohort30: 0, first30: 0 })
    }
    const row = months.get(month)
    row.users += 1

    const firstAt = firstOrderAt(user.id, orders)
    const within = (days) => {
      if (!firstAt) return false
      const delta = firstAt.getTime() - registeredAt.getTime()
      return delta >= 0 && delta < days * DAY
    }
    if (registeredAt.getTime() + 7 * DAY <= nowMs) {
      row.cohort7 += 1
      cohort7 += 1
      if (within(7)) {
        row.first7 += 1
        first7 += 1
      }
    }
    if (registeredAt.getTime() + 30 * DAY <= nowMs) {
      row.cohort30 += 1
      cohort30 += 1
      if (within(30)) {
        row.first30 += 1
        first30 += 1
      }
    }
  }

  return {
    days7: pack(first7, cohort7),
    days30: pack(first30, cohort30),
    months: [...months.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({
        month: row.month,
        users: row.users,
        days7: pack(row.first7, row.cohort7),
        days30: pack(row.first30, row.cohort30),
      })),
  }
}
