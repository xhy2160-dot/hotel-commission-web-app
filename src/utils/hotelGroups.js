import catalog from '@/data/hotel-groups.json'

export const HOTEL_GROUPS = catalog

export const UNMATCHED_GROUP = {
  id: 'unmatched',
  name: '未匹配',
  name_en: 'Unmatched',
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function buildMatchers() {
  const rows = []
  for (const group of HOTEL_GROUPS) {
    for (const brand of group.brands) {
      for (const keyword of brand.keywords) {
        rows.push({
          groupId: group.id,
          groupName: group.name,
          groupNameEn: group.name_en,
          brandName: brand.name,
          keyword: normalize(keyword),
        })
      }
    }
  }
  rows.sort((a, b) => b.keyword.length - a.keyword.length)
  return rows
}

const MATCHERS = buildMatchers()

export function canonicalBrandName(groupId, brandName, extraText = '') {
  if (!groupId || groupId === UNMATCHED_GROUP.id) return brandName || UNMATCHED_GROUP.name
  const scoped = MATCHERS.filter((row) => row.groupId === groupId)
  const brandText = normalize(brandName)
  if (brandText) {
    const hit = scoped.find((row) => brandText.includes(row.keyword))
    if (hit) return hit.brandName
  }
  const extra = normalize(extraText)
  if (extra) {
    const hit = scoped.find((row) => extra.includes(row.keyword))
    if (hit) return hit.brandName
  }
  return brandName || UNMATCHED_GROUP.name
}

export function classifyHotel(name) {
  const text = normalize(name)
  if (!text) return { groupId: UNMATCHED_GROUP.id, groupName: UNMATCHED_GROUP.name, groupNameEn: UNMATCHED_GROUP.name_en, brandName: '未匹配' }
  const hit = MATCHERS.find((row) => text.includes(row.keyword))
  if (!hit) return { groupId: UNMATCHED_GROUP.id, groupName: UNMATCHED_GROUP.name, groupNameEn: UNMATCHED_GROUP.name_en, brandName: '未匹配' }
  return {
    groupId: hit.groupId,
    groupName: hit.groupName,
    groupNameEn: hit.groupNameEn,
    brandName: canonicalBrandName(hit.groupId, hit.brandName, name),
  }
}

export function roomNights(checkIn, checkOut) {
  const start = new Date(String(checkIn || '').slice(0, 10))
  const end = new Date(String(checkOut || '').slice(0, 10))
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const nights = Math.round((end - start) / 86400000)
  return nights > 0 ? nights : 1
}

export function hotelNameOf(order) {
  return order.hotel_name_cn || order.hotel_name || order.hotel_name_en || order.property_name || ''
}

function packOrder(order, nights) {
  return {
    id: order.id,
    order_no: order.order_no || '',
    user_id: order.user_id,
    confirmation_num: order.confirmation_num || '',
    hotel_name_cn: hotelNameOf(order),
    check_in_date: order.check_in_date || '',
    check_out_date: order.check_out_date || '',
    nights,
    status: order.status,
    submitted_at: order.submitted_at || order.created_at || order.createdAt || '',
  }
}

export function buildHotelGroupStats(orders, query = {}) {
  const groupId = String(query.group || '').trim()
  const brandFilter = String(query.brand || '').trim()
  const rows = (orders || []).map((order) => {
    const name = hotelNameOf(order)
    const classified = classifyHotel(name)
    return {
      ...classified,
      brandName: canonicalBrandName(classified.groupId, classified.brandName, name),
      nights: roomNights(order.check_in_date, order.check_out_date),
      order,
    }
  })

  const groupMap = new Map()
  for (const group of HOTEL_GROUPS) {
    groupMap.set(group.id, {
      id: group.id,
      name: group.name,
      name_en: group.name_en,
      orders: 0,
      nights: 0,
    })
  }
  groupMap.set(UNMATCHED_GROUP.id, {
    id: UNMATCHED_GROUP.id,
    name: UNMATCHED_GROUP.name,
    name_en: UNMATCHED_GROUP.name_en,
    orders: 0,
    nights: 0,
  })

  const brandMap = new Map()
  for (const row of rows) {
    const group = groupMap.get(row.groupId) || groupMap.get(UNMATCHED_GROUP.id)
    group.orders += 1
    group.nights += row.nights
    if (groupId && row.groupId !== groupId) continue
    const key = `${row.groupId}::${row.brandName}`
    if (!brandMap.has(key)) {
      brandMap.set(key, {
        group_id: row.groupId,
        brand: row.brandName,
        orders: 0,
        nights: 0,
      })
    }
    const brand = brandMap.get(key)
    brand.orders += 1
    brand.nights += row.nights
  }

  const groups = [...groupMap.values()].filter((row) => row.id !== UNMATCHED_GROUP.id || row.orders > 0)
  const selected = groupId ? groups.find((row) => row.id === groupId) || null : null
  const brands = [...brandMap.values()]
    .filter((row) => !groupId || row.group_id === groupId)
    .sort((a, b) => b.orders - a.orders || b.nights - a.nights)

  const brandOrders = brandFilter
    ? rows
      .filter((row) => (!groupId || row.groupId === groupId) && row.brandName === brandFilter)
      .map((row) => packOrder(row.order, row.nights))
    : []

  return {
    groups,
    selected,
    brands,
    orders: brandOrders,
    totals: {
      orders: rows.length,
      nights: rows.reduce((sum, row) => sum + row.nights, 0),
    },
  }
}
