/**
 * Hotel group order / room-night stats for /webapp only.
 *   require('./webappHotelGroups')(router);
 */
const fs = require('fs')
const path = require('path')

function loadCatalog() {
    const files = [
        path.join(__dirname, '..', 'src', 'data', 'hotel-groups.json'),
        path.join(__dirname, 'hotel-groups.json'),
        path.join(__dirname, '..', 'hotel-groups.json'),
    ]
    const file = files.find((item) => fs.existsSync(item))
    return file ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
}

function normalize(value) {
    return String(value || '').trim().toLowerCase()
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
                })
            }
        }
    }
    rows.sort((a, b) => b.keyword.length - a.keyword.length)
    return rows
}

function classify(name, matchers) {
    const text = normalize(name)
    if (!text) return { groupId: 'unmatched', groupName: '未匹配', groupNameEn: 'Unmatched', brandName: '未匹配' }
    const hit = matchers.find((row) => text.includes(row.keyword))
    if (!hit) return { groupId: 'unmatched', groupName: '未匹配', groupNameEn: 'Unmatched', brandName: '未匹配' }
    return hit
}

function canonicalBrand(groupId, brandName, extraText, matchers) {
    if (!groupId || groupId === 'unmatched') return brandName || '未匹配'
    const scoped = matchers.filter((row) => row.groupId === groupId)
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
    return brandName || '未匹配'
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
                })
            }
            extra.sort((a, b) => b.keyword.length - a.keyword.length)
            return extra
        } catch {
            return []
        }
    }

    const buildHotelIndex = (hotels) => {
        const exact = new Map()
        const fuzzy = []
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
                fuzzy.push({
                    name,
                    len: name.length,
                    groupId: group.id,
                    groupName: group.name,
                    groupNameEn: group.name_en,
                    brandName,
                })
            }
        }
        fuzzy.sort((a, b) => b.len - a.len)
        return { exact, fuzzy }
    }

    const classifyByHotels = (order, index) => {
        const names = [order.hotel_name_cn, order.hotel_name_en, hotelNameOf(order)]
            .map(normalize)
            .filter(Boolean)
        for (const name of names) {
            if (index.exact.has(name)) return index.exact.get(name)
        }
        for (const name of names) {
            const contained = index.fuzzy.find((row) => row.len >= 4 && name.includes(row.name))
            if (contained) return contained
        }
        for (const name of names) {
            if (name.length < 6) continue
            const container = index.fuzzy.find((row) => row.name.includes(name))
            if (container) return container
        }
        return null
    }

    const classifyOrder = (order, index, extraMatchers) => {
        const name = hotelNameOf(order)
        let hit = classifyByHotels(order, index)
        if (!hit) {
            const mapped = extraMatchers.length ? classify(name, extraMatchers) : null
            hit = mapped && mapped.groupId !== 'unmatched' ? mapped : classify(name, matchers)
        }
        return {
            groupId: hit.groupId,
            groupName: hit.groupName,
            groupNameEn: hit.groupNameEn,
            brandName: canonicalBrand(hit.groupId, hit.brandName, name, matchers),
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
            const select = [
                'id',
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
            const filtered = orders.filter((order) => inRange(order, from, to))
            const classified = filtered.map((order) => ({
                ...classifyOrder(order, hotelIndex, extraMatchers),
                nights: roomNights(order.check_in_date, order.check_out_date),
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
            return res.json({
                success: true,
                data: {
                    groups,
                    selected: groupId ? groups.find((row) => row.id === groupId) || null : null,
                    brands: [...brandMap.values()].sort((a, b) => b.orders - a.orders || b.nights - a.nights),
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
