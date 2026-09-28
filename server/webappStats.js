/**
 * Overrides /webapp/stats commission with ONYX + TACS scraper totals.
 * Mount BEFORE webappAdminP1, and rename P1 /stats so this handler wins.
 * Does not change mini-program /users or /admin responses.
 */
function num(value) {
    const n = parseFloat(value)
    return Number.isFinite(n) ? n : 0
}

function dayRange(from, to) {
    if (!from && !to) return null
    const start = from ? new Date(`${from}T00:00:00+08:00`) : new Date('1970-01-01T00:00:00+08:00')
    const end = to ? new Date(`${to}T23:59:59.999+08:00`) : new Date()
    return {
        startSql: `${from || '1970-01-01'} 00:00:00`,
        endSql: `${to || '2099-12-31'} 23:59:59`,
        startUnix: Math.floor(start.getTime() / 1000),
        endUnix: Math.floor(end.getTime() / 1000)
    }
}

function pickCol(cols, names) {
    const map = {}
    for (const col of cols) map[String(col).toLowerCase()] = col
    for (const name of names) {
        if (map[name.toLowerCase()]) return map[name.toLowerCase()]
    }
    return null
}

const EXCLUDED_IMPORT_DAYS = ['2026-09-03']

function beijingDay(value) {
    if (!value) return null
    if (typeof value === 'number') {
        const ms = value < 1e12 ? value * 1000 : value
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms))
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        const match = String(value).match(/(\d{4}-\d{2}-\d{2})/)
        return match ? match[1] : null
    }
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function monthKey(value) {
    if (!value) return null
    if (typeof value === 'number') {
        const ms = value < 1e12 ? value * 1000 : value
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' }).format(new Date(ms))
    }
    const text = String(value)
    const match = text.match(/(\d{4})[-/](\d{2})/)
    if (match) return `${match[1]}-${match[2]}`
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' }).format(date)
}

function toCny(amount, currency, rates) {
    const amt = num(amount)
    if (amt === 0) return 0
    const cur = String(currency || 'CNY').trim().toUpperCase()
    if (!cur || cur === 'CNY' || cur === 'RMB') return amt
    const row = rates.find((item) => String(item.target || '').toUpperCase() === cur)
        || rates.find((item) => String(item.base || '').toUpperCase() === cur)
    if (!row || !row.rate) return 0
    if (String(row.base || '').toUpperCase() === 'CNY' || String(row.base || '').toUpperCase() === 'RMB') return amt / row.rate
    if (String(row.target || '').toUpperCase() === 'CNY' || String(row.target || '').toUpperCase() === 'RMB') return amt * row.rate
    return amt / row.rate
}

async function loadRates(sequelize) {
    try {
        const [rows] = await sequelize.query('SELECT base_currency AS base, target_currency AS target, exchange_rate AS rate FROM site_exchange_rate')
        return rows.map((row) => ({ base: row.base, target: row.target, rate: num(row.rate) })).filter((row) => row.rate > 0)
    } catch {
        return []
    }
}

async function tableNames(sequelize) {
    const [rows] = await sequelize.query('SHOW TABLES')
    return rows.map((row) => Object.values(row)[0])
}

async function columnsOf(sequelize, table) {
    const [rows] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\``)
    return rows.map((row) => row.Field)
}

async function sumScraper(sequelize, table, kind, range, rates) {
    const cols = await columnsOf(sequelize, table)
    const dateCol = pickCol(cols, ['created_at', 'createdAt', 'create_time'])
    if (!dateCol) return []
    const isUnix = /create_time/i.test(dateCol)
    const amountCol = kind === 'tacs'
        ? pickCol(cols, ['paid_amt', 'payment_amt', 'commission_amount'])
        : pickCol(cols, ['commission_amount', 'payment_amt', 'paid_amt'])
    const altAmountCol = kind === 'tacs' ? pickCol(cols, ['payment_amt']) : null
    const currencyCol = kind === 'tacs'
        ? pickCol(cols, ['paid_curr', 'payment_curr', 'commission_currency'])
        : pickCol(cols, ['commission_currency', 'payment_curr', 'paid_curr'])
    const altCurrencyCol = kind === 'tacs' ? pickCol(cols, ['payment_curr']) : null
    if (!amountCol) return []
    const where = isUnix
        ? `\`${dateCol}\` BETWEEN :startUnix AND :endUnix`
        : `\`${dateCol}\` BETWEEN :startSql AND :endSql`
    const select = [
        `\`${dateCol}\` AS at`,
        `\`${amountCol}\` AS amount`,
        altAmountCol && altAmountCol !== amountCol ? `\`${altAmountCol}\` AS alt_amount` : 'NULL AS alt_amount',
        currencyCol ? `\`${currencyCol}\` AS currency` : "'CNY' AS currency",
        altCurrencyCol && altCurrencyCol !== currencyCol ? `\`${altCurrencyCol}\` AS alt_currency` : 'NULL AS alt_currency'
    ].join(', ')
    const [rows] = await sequelize.query(
        `SELECT ${select} FROM \`${table}\` WHERE ${where}`,
        { replacements: range }
    )
    const byMonth = {}
    for (const row of rows) {
        if (EXCLUDED_IMPORT_DAYS.includes(beijingDay(row.at))) continue
        const month = monthKey(row.at)
        if (!month) continue
        const amount = num(row.amount) || num(row.alt_amount)
        const currency = row.currency || row.alt_currency || 'CNY'
        byMonth[month] = (byMonth[month] || 0) + toCny(amount, currency, rates)
    }
    return Object.entries(byMonth).map(([month, commission]) => ({ month, commission }))
}

module.exports = function registerStats(router) {
    const db = require('../models')
    const { sequelize } = db

    router.get('/stats', async (req, res) => {
        try {
            const r = dayRange(req.query.from, req.query.to) || dayRange('1970-01-01', '2099-12-31')
            const [orderRows] = await sequelize.query(
                `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COALESCE(SUM(amount),0) AS rebate, COUNT(*) AS orders
                 FROM site2_user_orders WHERE created_at BETWEEN :startSql AND :endSql
                 GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY month`,
                { replacements: r }
            )
            let userRows = []
            try {
                const [rows] = await sequelize.query(
                    `SELECT DATE_FORMAT(FROM_UNIXTIME(create_time),'%Y-%m') AS month, COUNT(*) AS users
                     FROM site_user WHERE create_time BETWEEN :startUnix AND :endUnix
                     GROUP BY DATE_FORMAT(FROM_UNIXTIME(create_time),'%Y-%m')`,
                    { replacements: r }
                )
                userRows = rows
            } catch {
                const [rows] = await sequelize.query(
                    `SELECT DATE_FORMAT(create_time,'%Y-%m') AS month, COUNT(*) AS users
                     FROM site_user WHERE create_time BETWEEN :startSql AND :endSql
                     GROUP BY DATE_FORMAT(create_time,'%Y-%m')`,
                    { replacements: r }
                )
                userRows = rows
            }

            const months = new Map()
            const ensure = (month) => {
                if (!months.has(month)) months.set(month, { month, commission: 0, rebate: 0, payout: 0, orders: 0, users: 0 })
                return months.get(month)
            }
            for (const row of orderRows) {
                const item = ensure(row.month)
                item.rebate = num(row.rebate)
                item.orders = Number(row.orders || 0)
            }
            for (const row of userRows) {
                if (!row.month) continue
                ensure(row.month).users += Number(row.users || 0)
            }
            try {
                const [rows] = await sequelize.query(
                    `SELECT DATE_FORMAT(FROM_UNIXTIME(create_time),'%Y-%m') AS month, COALESCE(SUM(amount),0) AS payout
                     FROM site_user_withdraw_apply WHERE status=4 AND create_time BETWEEN :startUnix AND :endUnix
                     GROUP BY DATE_FORMAT(FROM_UNIXTIME(create_time),'%Y-%m')`,
                    { replacements: r }
                )
                for (const row of rows) if (months.has(row.month)) months.get(row.month).payout += num(row.payout)
            } catch (error) { console.error(error) }
            try {
                const [rows] = await sequelize.query(
                    `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COALESCE(SUM(amount),0) AS payout
                     FROM site2_user_withdraw_wechat WHERE status=2 AND created_at BETWEEN :startSql AND :endSql
                     GROUP BY DATE_FORMAT(created_at,'%Y-%m')`,
                    { replacements: r }
                )
                for (const row of rows) if (months.has(row.month)) months.get(row.month).payout += num(row.payout)
            } catch (error) { console.error(error) }

            const rates = await loadRates(sequelize)
            const names = await tableNames(sequelize)
            for (const table of names) {
                const lower = String(table).toLowerCase()
                if (lower.includes('onyx') && !lower.includes('pull')) {
                    for (const row of await sumScraper(sequelize, table, 'onyx', r, rates)) ensure(row.month).commission += row.commission
                } else if (lower.includes('tacs')) {
                    for (const row of await sumScraper(sequelize, table, 'tacs', r, rates)) ensure(row.month).commission += row.commission
                }
            }

            const [vipRows] = await sequelize.query('SELECT v.vip_name, v.rebate_rate, COUNT(u.id) AS count FROM site2_app_vip_level v LEFT JOIN site_user u ON u.vip_id=v.id GROUP BY v.id, v.vip_name, v.rebate_rate ORDER BY v.id')
            return res.json({
                success: true,
                data: {
                    months: [...months.values()].sort((a, b) => String(a.month).localeCompare(String(b.month))).map((row) => ({
                        month: row.month,
                        commission: row.commission.toFixed(2),
                        rebate: row.rebate.toFixed(2),
                        payout: row.payout.toFixed(2),
                        profit: (row.commission - row.rebate).toFixed(2),
                        orders: row.orders,
                        users: row.users
                    })),
                    vips: vipRows.map((row) => ({ vip_name: row.vip_name, rebate_rate: num(row.rebate_rate), count: Number(row.count || 0) }))
                }
            })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message || String(error) })
        }
    })
}
