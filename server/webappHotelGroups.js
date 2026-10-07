/**
 * Hotel group order / room-night stats for /webapp only.
 *   require('./webappHotelGroups')(router);
 */
const fs = require('fs')
const path = require('path')

function loadCatalog() {
    const files = [
        path.join(__dirname, 'hotel-groups.json'),
        path.join(__dirname, '..', 'src', 'data', 'hotel-groups.json'),
        path.join(__dirname, '..', 'hotel-groups.json'),
    ]
    const file = files.find((item) => fs.existsSync(item))
    return file ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
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

function exactCatalogBrand(catalog, groupId, brandName) {
    const group = catalog.find((item) => item.id === groupId)
    if (!group || !brandName) return null
    const normal = normalize(brandName)
    const packed = compact(brandName)
    return (group.brands || []).find((brand) => normalize(brand.name) === normal || compact(brand.name) === packed) || null
}

function buildMatchers(catalog) {
    const rows = []
    for (const group of catalog) {
        for (const brand of group.brands || []) {
            for (const keyword of brand.keywords || []) {
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

function classify(name, matchers) {
    const hit = bestHit(name, matchers, true)
    if (!hit) return { groupId: 'unmatched', groupName: '未匹配', groupNameEn: 'Unmatched', brandName: '未匹配' }
    return hit
}

function canonicalBrand(catalog, groupId, brandName, extraText, matchers) {
    if (!groupId || groupId === 'unmatched') return brandName || '未匹配'
    const scoped = matchers.filter((row) => row.groupId === groupId)
    const exact = exactCatalogBrand(catalog, groupId, brandName)
    if (exact) return exact.name
    const fromBrand = bestHit(brandName, scoped, false) || bestHit(brandName, scoped, true)
    if (fromBrand) return fromBrand.brandName
    const fromExtra = bestHit(extraText, scoped, false)
    if (fromExtra) return fromExtra.brandName
    if (brandName && !isGenericKeyword(brandName)) return brandName
    const generic = bestHit(extraText, scoped, true)
    return generic ? generic.brandName : (brandName || '未匹配')
}

function roomNights(checkIn, checkOut) {
    const start = new Date(String(checkIn || '').slice(0, 10))
    const end = new Date(String(checkOut || '').slice(0, 10))
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
    const nights = Math.round((end - start) / 86400000)
    return nights > 0 ? nights : 1
}

function hotelNameOf(order) {
    return order.hotel_name_cn || order.hotel_name || order.hotel_name_en || order.property_name || ''
}

function pad(num) {
    return String(num).padStart(2, '0')
}

function dayValue(order) {
    const raw = order.submitted_at || order.created_at || order.createdAt || order.create_time
    if (!raw && raw !== 0) return ''
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}-${pad(raw.getDate())}`
    }
    const text = String(raw).trim()
    if (/^\d{10,13}$/.test(text)) {
        const date = new Date(text.length === 10 ? Number(text) * 1000 : Number(text))
        if (!Number.isNaN(date.getTime())) {
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
        }
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
    const parsed = new Date(text.includes('T') ? text : text.replace(' ', 'T'))
    if (!Number.isNaN(parsed.getTime())) {
        return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
    }
    return ''
}

function inRange(order, from, to) {
    const day = dayValue(order)
    if (from && day && day < from) return false
    if (to && day && day > to) return false
    return true
}

function pickField(columns, candidates) {
    const lower = columns.map((col) => String(col.Field || col.field || col).toLowerCase())
    for (const name of candidates) {
        const index = lower.indexOf(name)
        if (index >= 0) return columns[index].Field || columns[index].field || name
    }
    return null
}

module.exports = function registerHotelGroups(router) {
    const db = require('../models')
    const { sequelize } = db
    const catalog = loadCatalog()
    const matchers = buildMatchers(catalog)

    const resolveGroup = (value) => {
        const label = normalize(value)
        if (!label) return null
        return catalog.find((group) => (
            group.id === label || normalize(group.name) === label || normalize(group.name_en) === label
        )) || null
    }

    const loadHotelRows = async () => {
        try {
            const [tables] = await sequelize.query("SHOW TABLES LIKE 'site2_hotels'")
            if (!tables.length) return []
            const [columns] = await sequelize.query('SHOW COLUMNS FROM site2_hotels')
            const groupCol = pickField(columns, ['group', 'hotel_group', 'group_name', 'chain'])
            const brandCol = pickField(columns, ['display_brand', 'brand_canonical', 'brand', 'hotel_brand', 'brand_name'])
            const nameZhCol = pickField(columns, ['name_zh', 'name_cn', 'hotel_name_cn', 'display_name', 'name'])
            const nameEnCol = pickField(columns, ['name_en', 'hotel_name_en'])
            const displayNameCol = pickField(columns, ['display_name'])
            if (!nameZhCol && !nameEnCol && !displayNameCol) return []
            const select = [
                nameZhCol ? `\`${nameZhCol}\` AS name_zh` : 'NULL AS name_zh',
                nameEnCol ? `\`${nameEnCol}\` AS name_en` : 'NULL AS name_en',
                displayNameCol && displayNameCol !== nameZhCol ? `\`${displayNameCol}\` AS display_name` : 'NULL AS display_name',
                groupCol ? `\`${groupCol}\` AS hotel_group` : 'NULL AS hotel_group',
                brandCol ? `\`${brandCol}\` AS hotel_brand` : 'NULL AS hotel_brand',
            ].join(', ')
            const [rows] = await sequelize.query(`SELECT ${select} FROM site2_hotels`)
            return rows
        } catch {
            return []
        }
    }

    const loadMappingMatchers = async () => {
        try {
            const [tables] = await sequelize.query("SHOW TABLES LIKE 'site2_hotel_brand_mapping'")
            if (!tables.length) return []
            const [rows] = await sequelize.query('SELECT `group`, brand_name FROM site2_hotel_brand_mapping')
            const extra = []
            for (const row of rows) {
                const group = resolveGroup(row.group)
                const brand = String(row.brand_name || '').trim()
                if (!group || brand.length < 3) continue
                extra.push({
                    groupId: group.id,
                    groupName: group.name,
                    groupNameEn: group.name_en,
                    brandName: brand,
                    keyword: normalize(brand),
                    packed: compact(brand),
                })
            }
            extra.sort((a, b) => (b.packed.length - a.packed.length) || (b.keyword.length - a.keyword.length))
            return extra
        } catch {
            return []
        }
    }

    const buildHotelIndex = (hotels) => {
        const exact = new Map()
        for (const hotel of hotels) {
            const group = resolveGroup(hotel.hotel_group)
            if (!group) continue
            const brandName = String(hotel.hotel_brand || '').trim() || '未匹配'
            const names = [hotel.name_zh, hotel.display_name, hotel.name_en]
                .map(normalize)
                .filter((name) => name && name.length >= 2)
            for (const name of names) {
                if (!exact.has(name)) {
                    exact.set(name, { groupId: group.id, groupName: group.name, groupNameEn: group.name_en, brandName })
                }
            }
        }
        return { exact }
    }

    const hotelService = (() => {
        try {
            return require('../utils/hotel_name_crawler').hotelService
        } catch {
            return null
        }
    })()

    const classifyByHotelsExact = (order, index) => {
        const names = [order.hotel_name_cn, order.hotel_name_en, hotelNameOf(order)]
            .map(normalize)
            .filter(Boolean)
        for (const name of names) {
            if (index.exact.has(name)) {
                return { ...index.exact.get(name), source: 'hotel_library' }
            }
        }
        return null
    }

    const searchLooksUsable = (query, item) => {
        const q = normalize(query)
        if (!q || q.length < 8) return false
        const words = q.split(/[^a-z0-9\u4e00-\u9fff]+/).filter((word) => word.length >= 4)
        if (words.length < 2 && q.length < 12) return false
        const hay = normalize([item.hotel_name_en, item.hotel_name_zh, item.displayName].filter(Boolean).join(' '))
        return words.some((word) => hay.includes(word))
    }

    const searchOne = async (name) => {
        if (!hotelService || !name || String(name).trim().length < 4) return null
        try {
            const res = await hotelService.searchHotels({ q: name, limit: 3, withDetails: true })
            const item = res && res.results && res.results[0]
            if (!item || !searchLooksUsable(name, item)) return null
            const group = resolveGroup(item.group_name || item.group)
            if (!group) return null
            return {
                groupId: group.id,
                groupName: group.name,
                groupNameEn: group.name_en,
                brandName: item.brand_canonical || item.brand || '',
                source: 'search',
            }
        } catch {
            return null
        }
    }

    const mapPool = async (items, concurrency, worker) => {
        const out = new Array(items.length)
        let next = 0
        const run = async () => {
            while (next < items.length) {
                const index = next
                next += 1
                out[index] = await worker(items[index])
            }
        }
        await Promise.all(Array.from({ length: Math.min(concurrency, items.length) || 1 }, run))
        return out
    }

    const classifyOrder = (order, index, extraMatchers, searchHit) => {
        const name = hotelNameOf(order)
        let hit = classifyByHotelsExact(order, index) || searchHit || null
        if (!hit) {
            const mapped = extraMatchers.length ? classify(name, extraMatchers) : null
            if (mapped && mapped.groupId !== 'unmatched') hit = { ...mapped, source: 'keyword' }
        }
        if (!hit) {
            const keyed = classify(name, matchers)
            hit = keyed.groupId !== 'unmatched'
                ? { ...keyed, source: 'keyword' }
                : { ...keyed, source: 'unmatched' }
        }
        return {
            groupId: hit.groupId,
            groupName: hit.groupName,
            groupNameEn: hit.groupNameEn,
            brandName: canonicalBrand(catalog, hit.groupId, hit.brandName, name, matchers),
            source: hit.source || 'unmatched',
        }
    }

    router.get('/hotel-groups', async (req, res) => {
        try {
            const [orderColumns] = await sequelize.query('SHOW COLUMNS FROM site2_user_orders')
            const nameCol = pickField(orderColumns, ['hotel_name_cn', 'hotel_name', 'property_name'])
            const nameEnCol = pickField(orderColumns, ['hotel_name_en'])
            const checkInCol = pickField(orderColumns, ['check_in_date', 'check_in', 'checkin'])
            const checkOutCol = pickField(orderColumns, ['check_out_date', 'check_out', 'checkout'])
            const submittedCol = pickField(orderColumns, ['submitted_at', 'created_at', 'create_time', 'createdAt'])
            const extraTimeCol = pickField(orderColumns, ['created_at', 'create_time', 'submitted_at'])
            const orderNoCol = pickField(orderColumns, ['order_no'])
            const userIdCol = pickField(orderColumns, ['user_id'])
            const confirmCol = pickField(orderColumns, ['confirmation_num'])
            const statusCol = pickField(orderColumns, ['status'])
            const select = [
                'id',
                orderNoCol ? `\`${orderNoCol}\` AS order_no` : 'NULL AS order_no',
                userIdCol ? `\`${userIdCol}\` AS user_id` : 'NULL AS user_id',
                confirmCol ? `\`${confirmCol}\` AS confirmation_num` : 'NULL AS confirmation_num',
                statusCol ? `\`${statusCol}\` AS status` : 'NULL AS status',
                nameCol ? `\`${nameCol}\` AS hotel_name_cn` : 'NULL AS hotel_name_cn',
                nameEnCol ? `\`${nameEnCol}\` AS hotel_name_en` : 'NULL AS hotel_name_en',
                checkInCol ? `\`${checkInCol}\` AS check_in_date` : 'NULL AS check_in_date',
                checkOutCol ? `\`${checkOutCol}\` AS check_out_date` : 'NULL AS check_out_date',
                submittedCol ? `\`${submittedCol}\` AS submitted_at` : 'NULL AS submitted_at',
                extraTimeCol && extraTimeCol !== submittedCol ? `\`${extraTimeCol}\` AS created_at` : 'NULL AS created_at',
            ].join(', ')
            const [orders, hotels, extraMatchers] = await Promise.all([
                sequelize.query(`SELECT ${select} FROM site2_user_orders`).then(([rows]) => rows),
                loadHotelRows(),
                loadMappingMatchers(),
            ])
            const hotelIndex = buildHotelIndex(hotels)
            const from = req.query.from || ''
            const to = req.query.to || ''
            const groupId = String(req.query.group || '').trim()
            const brandFilter = String(req.query.brand || '').trim()
            const filtered = orders.filter((order) => inRange(order, from, to))
            const searchHits = new Map()
            const pendingNames = [...new Set(filtered.map(hotelNameOf).filter(Boolean))]
                .filter((name) => !hotelIndex.exact.has(normalize(name)))
            if (hotelService && pendingNames.length) {
                await mapPool(pendingNames, 8, async (name) => {
                    const hit = await searchOne(name)
                    if (hit) searchHits.set(normalize(name), hit)
                })
            }
            const classified = filtered.map((order) => ({
                ...classifyOrder(order, hotelIndex, extraMatchers, searchHits.get(normalize(hotelNameOf(order)))),
                nights: roomNights(order.check_in_date, order.check_out_date),
                order,
            }))

            const groupMap = new Map()
            for (const group of catalog) {
                groupMap.set(group.id, { id: group.id, name: group.name, name_en: group.name_en, orders: 0, nights: 0 })
            }
            groupMap.set('unmatched', { id: 'unmatched', name: '未匹配', name_en: 'Unmatched', orders: 0, nights: 0 })

            const brandMap = new Map()
            for (const row of classified) {
                if (!groupMap.has(row.groupId)) {
                    groupMap.set(row.groupId, { id: row.groupId, name: row.groupName, name_en: row.groupNameEn, orders: 0, nights: 0 })
                }
                const group = groupMap.get(row.groupId)
                group.orders += 1
                group.nights += row.nights
                if (groupId && row.groupId !== groupId) continue
                const key = `${row.groupId}::${row.brandName}`
                if (!brandMap.has(key)) brandMap.set(key, { group_id: row.groupId, brand: row.brandName, orders: 0, nights: 0 })
                brandMap.get(key).orders += 1
                brandMap.get(key).nights += row.nights
            }

            const groups = [...groupMap.values()].filter((row) => row.id !== 'unmatched' || row.orders > 0)
            const brandOrders = brandFilter
                ? classified
                    .filter((row) => (!groupId || row.groupId === groupId) && row.brandName === brandFilter)
                    .map((row) => ({
                        id: row.order.id,
                        order_no: row.order.order_no || '',
                        user_id: row.order.user_id,
                        confirmation_num: row.order.confirmation_num || '',
                        hotel_name_cn: hotelNameOf(row.order),
                        check_in_date: row.order.check_in_date || '',
                        check_out_date: row.order.check_out_date || '',
                        nights: row.nights,
                        status: row.order.status,
                        source: row.source || 'unmatched',
                        submitted_at: row.order.submitted_at || row.order.created_at || '',
                    }))
                : []
            return res.json({
                success: true,
                data: {
                    groups,
                    selected: groupId ? groups.find((row) => row.id === groupId) || null : null,
                    brands: [...brandMap.values()].sort((a, b) => b.orders - a.orders || b.nights - a.nights),
                    orders: brandOrders,
                    totals: {
                        orders: classified.length,
                        nights: classified.reduce((sum, row) => sum + row.nights, 0),
                    },
                },
            })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    })
}
