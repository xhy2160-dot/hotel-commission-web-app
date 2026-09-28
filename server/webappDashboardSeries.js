/**
 * Daily user/order series for /webapp dashboard charts.
 *   require('./webappDashboardSeries')(router);
 */
function dayRange(from, to) {
    const start = from ? new Date(`${from}T00:00:00+08:00`) : new Date(Date.now() - 29 * 86400000)
    const end = to ? new Date(`${to}T23:59:59.999+08:00`) : new Date()
    return {
        from: from || formatDay(start),
        to: to || formatDay(end),
        startUnix: Math.floor(start.getTime() / 1000),
        endUnix: Math.floor(end.getTime() / 1000),
        startSql: `${from || formatDay(start)} 00:00:00`,
        endSql: `${to || formatDay(end)} 23:59:59`
    }
}

function formatDay(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date)
    const get = (type) => parts.find((part) => part.type === type).value
    return `${get('year')}-${get('month')}-${get('day')}`
}

function nextDay(day) {
    const [year, month, date] = String(day).split('-').map(Number)
    const next = new Date(Date.UTC(year, month - 1, date + 1))
    const pad = (num) => String(num).padStart(2, '0')
    return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

function eachDay(from, to) {
    const days = []
    if (!from || !to || from > to) return days
    let day = from
    while (day <= to) {
        days.push(day)
        day = nextDay(day)
    }
    return days
}

function toMap(rows) {
    const map = new Map()
    for (const row of rows) {
        if (!row.day) continue
        map.set(String(row.day), Number(row.c || 0))
    }
    return map
}

module.exports = function registerDashboardSeries(router) {
    const db = require('../models')
    const { sequelize } = db

    router.get('/dashboard/series', async (req, res) => {
        try {
            const range = dayRange(req.query.from, req.query.to)
            const [userRows] = await sequelize.query(
                `SELECT DATE_FORMAT(FROM_UNIXTIME(create_time),'%Y-%m-%d') AS day, COUNT(*) AS c
                 FROM site_user WHERE create_time BETWEEN :startUnix AND :endUnix
                 GROUP BY DATE_FORMAT(FROM_UNIXTIME(create_time),'%Y-%m-%d')`,
                { replacements: range }
            )
            const [orderRows] = await sequelize.query(
                `SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS day, COUNT(*) AS c
                 FROM site2_user_orders WHERE created_at BETWEEN :startSql AND :endSql
                 GROUP BY DATE_FORMAT(created_at,'%Y-%m-%d')`,
                { replacements: range }
            )
            const [[usersBefore]] = await sequelize.query(
                'SELECT COUNT(*) AS c FROM site_user WHERE create_time < :startUnix',
                { replacements: range }
            )
            const [[ordersBefore]] = await sequelize.query(
                'SELECT COUNT(*) AS c FROM site2_user_orders WHERE created_at < :startSql',
                { replacements: range }
            )
            const [[usersTotal]] = await sequelize.query('SELECT COUNT(*) AS c FROM site_user')
            const [[ordersTotal]] = await sequelize.query('SELECT COUNT(*) AS c FROM site2_user_orders')
            const usersMap = toMap(userRows)
            const ordersMap = toMap(orderRows)
            let usersCum = Number(usersBefore.c || 0)
            let ordersCum = Number(ordersBefore.c || 0)
            const series = eachDay(range.from, range.to).map((day) => {
                const users = usersMap.get(day) || 0
                const orders = ordersMap.get(day) || 0
                usersCum += users
                ordersCum += orders
                return { day, users, orders, users_cum: usersCum, orders_cum: ordersCum }
            })
            return res.json({
                success: true,
                data: {
                    totals: {
                        users: Number(usersTotal.c || 0),
                        orders: Number(ordersTotal.c || 0)
                    },
                    series
                }
            })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message || String(error) })
        }
    })
}
