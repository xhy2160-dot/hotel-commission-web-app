/**
 * Registration-to-first-order rates for /webapp only.
 * Mount after other admin routes:
 *   require('./webappFirstOrder')(router);
 */
function dayRange(from, to) {
    const start = from ? new Date(`${from}T00:00:00+08:00`) : new Date('1970-01-01T00:00:00+08:00')
    const end = to ? new Date(`${to}T23:59:59.999+08:00`) : new Date()
    return {
        startUnix: Math.floor(start.getTime() / 1000),
        endUnix: Math.floor(end.getTime() / 1000)
    }
}

function pack(converted, cohort) {
    const count = Number(converted || 0)
    const den = Number(cohort || 0)
    return {
        converted: count,
        cohort: den,
        rate: den > 0 ? Math.round((count / den) * 1000) / 1000 : null
    }
}

async function queryFirstOrderRates(sequelize, range) {
    const nowUnix = Math.floor(Date.now() / 1000)
    const replacements = {
        startUnix: range.startUnix,
        endUnix: range.endUnix,
        nowUnix
    }
    const sql = `
        SELECT DATE_FORMAT(FROM_UNIXTIME(u.create_time),'%Y-%m') AS month,
               COUNT(*) AS users,
               SUM(CASE WHEN u.create_time <= :nowUnix - 604800 THEN 1 ELSE 0 END) AS cohort7,
               SUM(CASE WHEN u.create_time <= :nowUnix - 604800
                         AND o.first_unix >= u.create_time
                         AND o.first_unix < u.create_time + 604800 THEN 1 ELSE 0 END) AS first7,
               SUM(CASE WHEN u.create_time <= :nowUnix - 2592000 THEN 1 ELSE 0 END) AS cohort30,
               SUM(CASE WHEN u.create_time <= :nowUnix - 2592000
                         AND o.first_unix >= u.create_time
                         AND o.first_unix < u.create_time + 2592000 THEN 1 ELSE 0 END) AS first30
        FROM site_user u
        LEFT JOIN (
            SELECT user_id, UNIX_TIMESTAMP(MIN(created_at)) AS first_unix
            FROM site2_user_orders
            GROUP BY user_id
        ) o ON o.user_id = u.id
        WHERE u.create_time BETWEEN :startUnix AND :endUnix
        GROUP BY DATE_FORMAT(FROM_UNIXTIME(u.create_time),'%Y-%m')
        ORDER BY month
    `
    const [rows] = await sequelize.query(sql, { replacements })
    const months = rows.map((row) => ({
        month: row.month,
        users: Number(row.users || 0),
        days7: pack(row.first7, row.cohort7),
        days30: pack(row.first30, row.cohort30)
    }))
    const summary = months.reduce((acc, row) => {
        acc.cohort7 += row.days7.cohort
        acc.first7 += row.days7.converted
        acc.cohort30 += row.days30.cohort
        acc.first30 += row.days30.converted
        return acc
    }, { cohort7: 0, first7: 0, cohort30: 0, first30: 0 })
    return {
        days7: pack(summary.first7, summary.cohort7),
        days30: pack(summary.first30, summary.cohort30),
        months
    }
}

module.exports = function registerFirstOrder(router) {
    const db = require('../models')
    const { sequelize } = db

    router.get('/first-order-rates', async (req, res) => {
        try {
            const range = dayRange(req.query.from, req.query.to)
            const data = await queryFirstOrderRates(sequelize, range)
            return res.json({ success: true, data })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message || String(error) })
        }
    })
}

module.exports.queryFirstOrderRates = queryFirstOrderRates
module.exports.dayRange = dayRange
