import catalog from '@/data/hotel-groups.json'

export const HOTEL_GROUPS = catalog

export const UNMATCHED_GROUP = {
  id: 'unmatched',
  name: '未匹配',
  name_en: 'Unmatched',
}

const GENERIC_KEYWORDS = new Set([
  'marriott', '万豪',
  'hilton', '希尔顿',
  'hyatt', '凯悦',
  'wyndham', '温德姆',
  'ihg', '洲际', 'intercontinental',
  'accor', '雅高',
])

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function compact(value) {
  return normalize(value).replace(/[\s.\-_'’·]/g, '')
}

function isGenericKeyword(keyword) {
  return GENERIC_KEYWORDS.has(normalize(keyword)) || GENERIC_KEYWORDS.has(compact(keyword))
}

function textHits(text, scoped) {
  const normal = normalize(text)
  const packed = compact(text)
  if (!normal) return []
  return scoped.filter((row) => (
    (row.keyword && normal.includes(row.keyword))
    || (row.packed && packed.includes(row.packed))
  ))
}

function bestHit(text, scoped, allowGeneric = true) {
  const hits = textHits(text, scoped).filter((row) => allowGeneric || !isGenericKeyword(row.keyword))
  hits.sort((a, b) => (b.packed.length - a.packed.length) || (b.keyword.length - a.keyword.length))
  return hits[0] || null
}

function exactCatalogBrand(groupId, brandName) {
  const group = HOTEL_GROUPS.find((item) => item.id === groupId)
  if (!group || !brandName) return null
  const normal = normalize(brandName)
  const packed = compact(brandName)
  return group.brands.find((brand) => normalize(brand.name) === normal || compact(brand.name) === packed) || null
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
          packed: compact(keyword),
        })
      }
    }
  }
  rows.sort((a, b) => (b.packed.length - a.packed.length) || (b.keyword.length - a.keyword.length))
  return rows
}

const MATCHERS = buildMatchers()

export function canonicalBrandName(groupId, brandName, extraText = '') {
  if (!groupId || groupId === UNMATCHED_GROUP.id) return brandName || UNMATCHED_GROUP.name
  const scoped = MATCHERS.filter((row) => row.groupId === groupId)
  const exact = exactCatalogBrand(groupId, brandName)
  if (exact) return exact.name
  const fromBrand = bestHit(brandName, scoped, false) || bestHit(brandName, scoped, true)
  if (fromBrand) return fromBrand.brandName
  const fromExtra = bestHit(extraText, scoped, false)
  if (fromExtra) return fromExtra.brandName
  if (brandName && !isGenericKeyword(brandName)) return brandName
  const generic = bestHit(extraText, scoped, true)
  return generic ? generic.brandName : (brandName || UNMATCHED_GROUP.name)
}

export function classifyHotel(name) {
  const hit = bestHit(name, MATCHERS, true)
  if (!hit) return { groupId: UNMATCHED_GROUP.id, groupName: UNMATCHED_GROUP.name, groupNameEn: UNMATCHED_GROUP.name_en, brandName: '未匹配', source: 'unmatched' }
  return {
    groupId: hit.groupId,
    groupName: hit.groupName,
    groupNameEn: hit.groupNameEn,
    brandName: canonicalBrandName(hit.groupId, hit.brandName, name),
    source: 'keyword',
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

function packOrder(order, nights, brandName) {
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
    brand: brandName,
    submitted_at: order.submitted_at || order.created_at || order.createdAt || '',
  }
}

export function buildHotelGroupStats(orders, query = {}) {
  const groupId = String(query.group || '').trim()
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

  const brandOrders = rows
    .filter((row) => !groupId || row.groupId === groupId)
    .map((row) => packOrder(row.order, row.nights, row.brandName))

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
