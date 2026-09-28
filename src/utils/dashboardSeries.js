import { eachDay, formatDay, parseTime } from './range.js'

function dayKey(value) {
  const date = parseTime(value)
  if (!date) return null
  return formatDay(date)
}

export function buildDashboardSeries(users, orders, query = {}) {
  const days = eachDay(query.from, query.to)
  const userCounts = new Map(days.map((day) => [day, 0]))
  const orderCounts = new Map(days.map((day) => [day, 0]))
  let usersBefore = 0
  let ordersBefore = 0

  for (const user of users) {
    const day = dayKey(user.registered_at || user.create_time)
    if (!day) continue
    if (query.from && day < query.from) usersBefore += 1
    else if (userCounts.has(day)) userCounts.set(day, userCounts.get(day) + 1)
  }
  for (const order of orders) {
    const day = dayKey(order.submitted_at || order.created_at || order.createdAt)
    if (!day) continue
    if (query.from && day < query.from) ordersBefore += 1
    else if (orderCounts.has(day)) orderCounts.set(day, orderCounts.get(day) + 1)
  }

  let usersCum = usersBefore
  let ordersCum = ordersBefore
  const series = days.map((day) => {
    const usersCount = userCounts.get(day) || 0
    const ordersCount = orderCounts.get(day) || 0
    usersCum += usersCount
    ordersCum += ordersCount
    return {
      day,
      users: usersCount,
      orders: ordersCount,
      users_cum: usersCum,
      orders_cum: ordersCum,
    }
  })

  return {
    totals: {
      users: users.length,
      orders: orders.length,
    },
    series,
  }
}
