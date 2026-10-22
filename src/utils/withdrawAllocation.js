export function money(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

export function isEligibleOrder(order) {
  return [1, 2].includes(Number(order?.status)) && money(order?.amount) > 0
}

export function consumesWithdrawal(item) {
  const channel = item?.channel || item?.type
  const status = Number(item?.status)
  if (channel === 'wechat') return status !== -1
  if (channel === 'zelle') return status !== 2 && status !== 5
  return status !== -1 && status !== 2 && status !== 5
}

export function orderCreditTime(order) {
  return order?.cashback_date
    || order?.cashback_available_at
    || order?.rebate_calculated_at
    || order?.calculated_at
    || order?.updatedAt
    || order?.updated_at
    || order?.submitted_at
    || order?.created_at
    || order?.createdAt
    || order?.create_time
    || ''
}

export function withdrawalApplyTime(item) {
  return item?.create_time
    || item?.created_at
    || item?.createdAt
    || item?.paid_at
    || item?.payout_at
    || ''
}

export function withdrawalKey(item, type) {
  const channel = type || item?.channel || 'unknown'
  return `${channel}:${item?.id ?? item?.withdraw_no ?? item?.out_bill_no}`
}

export function orderNo(order) {
  return String(order?.confirmation_num || order?.order_no || order?.id || '')
}

export function toMillis(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(String(value).trim()))) {
    const num = Number(value)
    if (!Number.isFinite(num) || num === 0) return 0
    return num > 1e12 ? num : num * 1000
  }
  const parsed = Date.parse(String(value).replace(' ', 'T'))
  return Number.isFinite(parsed) ? parsed : 0
}

export function emptyAllocation() {
  return { lines: [], unallocated: 0, text: '', nos: '' }
}

export function formatAllocation(lines, unallocated = 0) {
  const text = lines.map((line) => `${line.order_no} ¥${money(line.amount).toFixed(2)}`).join('；')
  const nos = lines
    .flatMap((line) => [line.confirmation_num, line.match_order_no, line.order_no, line.order_id])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(',')
  const gap = money(unallocated)
  return {
    lines,
    unallocated: gap,
    text: gap > 0 ? `${text}${text ? '；' : ''}未匹配 ¥${gap.toFixed(2)}` : text,
    nos,
  }
}

export function allocateWithdrawalsFifo(orders, withdrawals) {
  const byUser = new Map()
  for (const order of orders || []) {
    if (!isEligibleOrder(order)) continue
    const userId = Number(order.user_id)
    if (!userId) continue
    if (!byUser.has(userId)) byUser.set(userId, [])
    byUser.get(userId).push({
      ...order,
      remain: money(order.final_cashback ?? order.amount),
    })
  }
  for (const list of byUser.values()) {
    list.sort((left, right) => {
      const delta = toMillis(orderCreditTime(left)) - toMillis(orderCreditTime(right))
      return delta || Number(left.id) - Number(right.id)
    })
  }

  const items = [...(withdrawals || [])].sort((left, right) => {
    const delta = toMillis(withdrawalApplyTime(left)) - toMillis(withdrawalApplyTime(right))
    return delta || Number(left.id) - Number(right.id)
  })

  const result = new Map()
  for (const item of items) {
    const key = withdrawalKey(item)
    if (!consumesWithdrawal(item)) {
      result.set(key, emptyAllocation())
      continue
    }
    const pool = byUser.get(Number(item.user_id)) || []
    let remain = money(item.amount)
    const lines = []
    for (const order of pool) {
      if (remain <= 0) break
      if (order.remain <= 0) continue
      const take = money(Math.min(order.remain, remain))
      if (take <= 0) continue
      order.remain = money(order.remain - take)
      remain = money(remain - take)
      lines.push({
        order_id: order.id,
        order_no: orderNo(order),
        match_order_no: String(order.order_no || order.id || ''),
        confirmation_num: order.confirmation_num || '',
        amount: take,
        credit_at: orderCreditTime(order),
      })
    }
    result.set(key, formatAllocation(lines, remain))
  }
  return result
}
