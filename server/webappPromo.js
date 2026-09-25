/**
 * Promotion tracking for /webapp only.
 * Does not change mini-program /users or /admin responses.
 *
 * Mount after other admin routes:
 *   require('./webappPromo')(router);
 */
const BASELINE_DAYS = 7

function num(value) {
    const n = parseFloat(value)
    return Number.isFinite(n) ? n : 0
}

function money(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return null
    return Math.round(value * 100) / 100
}

function round1(value) {
    return Math.round(value * 10) / 10
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
}

function parseBeijing(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value
    if (!value) return null
    const raw = String(value).trim()
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) {
        const date = new Date(raw)
        return Number.isNaN(date.getTime()) ? null : date
    }
    const text = raw.replace('T', ' ')
    const match = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/)
    if (!match) return null
    return new Date(`${match[1]}T${match[2]}:${match[3] || '00'}+08:00`)
}

function formatSql(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(date)
    const get = (type) => parts.find((part) => part.type === type).value
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

function campaignWindow(startAt, durationDays) {
    const start = parseBeijing(startAt)
    const days = num(durationDays)
    if (!start || days <= 0) return null
    const end = new Date(start.getTime() + days * 86400000)
    const baselineStart = new Date(start.getTime() - BASELINE_DAYS * 86400000)
    return {
        start,
        end,
        startSql: formatSql(start),
        endSql: formatSql(end),
        startUnix: Math.floor(start.getTime() / 1000),
        endUnix: Math.floor(end.getTime() / 1000),
        baselineStartUnix: Math.floor(baselineStart.getTime() / 1000)
    }
}

function scorePromo({ extraLeads, expectedLeads, actualLeads, actualAcq, actualCpa }) {
    const lift = expectedLeads > 0 ? extraLeads / expectedLeads : (extraLeads > 0 ? 1 : 0)
    const liftPts = clamp(15 + lift * 15, 0, 45)
    const orderRate = actualLeads > 0 ? actualAcq / actualLeads : 0
    const cashRate = actualLeads > 0 ? actualCpa / actualLeads : 0
    const qualityPts = clamp(orderRate * 30, 0, 30) + clamp(cashRate * 25, 0, 25)
    let score = Math.round(liftPts + qualityPts)
    if (extraLeads <= 0) score = Math.min(score, 35)
    score = clamp(score, 0, 100)
    let label = '较差'
    if (score >= 80) label = '优秀'
    else if (score >= 60) label = '良好'
    else if (score >= 40) label = '一般'
    if (extraLeads <= 0) label = '未跑赢基线'
    return { score, label }
}

function buildPromoMetrics({
    durationDays,
    amount,
    baselineDailyOverride,
    preLeads = 0,
    preAcq = 0,
    preCpa = 0,
    preOrders = 0,
    actualLeads = 0,
    actualAcq = 0,
    actualCpa = 0,
    actualOrders = 0
}) {
    const days = num(durationDays)
    const spend = num(amount)
    const hasOverride = baselineDailyOverride !== null && baselineDailyOverride !== undefined && baselineDailyOverride !== ''
    const baselineDaily = hasOverride ? num(baselineDailyOverride) : preLeads / BASELINE_DAYS
    const expectedLeads = baselineDaily * days
    const expectedAcq = (preAcq / BASELINE_DAYS) * days
    const expectedCpa = (preCpa / BASELINE_DAYS) * days
    const expectedOrders = (preOrders / BASELINE_DAYS) * days
    const extraLeads = actualLeads - expectedLeads
    const extraAcq = actualAcq - expectedAcq
    const extraCpa = actualCpa - expectedCpa
    const extraOrders = actualOrders - expectedOrders
    const rating = scorePromo({ extraLeads, expectedLeads, actualLeads, actualAcq, actualCpa })
    return {
        baseline_days: BASELINE_DAYS,
        baseline_source: hasOverride ? 'manual' : 'auto',
        baseline_daily: round1(baselineDaily),
        expected_leads: round1(expectedLeads),
        actual_leads: actualLeads,
        extra_leads: round1(extraLeads),
        actual_acq: actualAcq,
        extra_acq: round1(extraAcq),
        actual_cpa: actualCpa,
        extra_cpa: round1(extraCpa),
        actual_orders: actualOrders,
        extra_orders: round1(extraOrders),
        cpl: extraLeads > 0 ? money(spend / extraLeads) : null,
        cac: extraAcq > 0 ? money(spend / extraAcq) : null,
        cpa: extraCpa > 0 ? money(spend / extraCpa) : null,
        cpo: actualOrders > 0 ? money(spend / actualOrders) : null,
        score: rating.score,
        score_label: rating.label
    }
}

function ok(res, data, extra = {}) {
    return res.json(Object.assign({ success: true, data }, extra))
}

function fail(res, error, status = 400) {
    return res.status(status).json({ success: false, message: error.message || String(error) })
}

function staffId(req) {
    return req.staff?.id || req.user?.id || req.auth?.id || null
}

function readBody(req) {
    const platform = String(req.body.platform || '').trim()
    const startAt = String(req.body.start_at || '').trim()
    const durationDays = num(req.body.duration_days)
    const amount = num(req.body.amount)
    const note = String(req.body.note || '').trim()
    const rawBaseline = req.body.baseline_daily
    const baselineDaily = rawBaseline === null || rawBaseline === undefined || rawBaseline === '' ? null : num(rawBaseline)
    if (!platform) throw new Error('请填写推广平台')
    if (!parseBeijing(startAt)) throw new Error('请填写推广开始时间')
    if (durationDays <= 0) throw new Error('推广持续时间必须大于 0 天')
    if (amount < 0) throw new Error('推广金额不能为负数')
    if (baselineDaily !== null && (Number.isNaN(baselineDaily) || baselineDaily < 0)) throw new Error('基线日均不能为负数')
    return {
        platform: platform.slice(0, 64),
        start_at: formatSql(parseBeijing(startAt)),
        duration_days: durationDays,
        amount,
        baseline_daily: baselineDaily,
        note: note.slice(0, 500)
    }
}

module.exports = function registerPromo(router) {
    const db = require('../models')
    const { sequelize } = db
    let ready = null

    const ensureTable = async () => {
        if (ready) return ready
        ready = sequelize.query(`
            CREATE TABLE IF NOT EXISTS site2_promo_campaigns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                platform VARCHAR(64) NOT NULL,
                start_at DATETIME NOT NULL,
                duration_days DECIMAL(8,2) NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                baseline_daily DECIMAL(12,4) NULL,
                note VARCHAR(500) NULL,
                created_by INT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)
        return ready
    }

    const countUsers = async (startUnix, endUnix, kind) => {
        const join = kind === 'leads'
            ? ''
            : kind === 'cpa'
                ? 'INNER JOIN site2_user_orders o ON o.user_id = u.id AND o.status IN (1,2)'
                : 'INNER JOIN site2_user_orders o ON o.user_id = u.id'
        const distinct = kind === 'leads' ? 'COUNT(*)' : 'COUNT(DISTINCT u.id)'
        const [rows] = await sequelize.query(
            `SELECT ${distinct} AS c FROM site_user u ${join} WHERE u.create_time >= :startUnix AND u.create_time < :endUnix`,
            { replacements: { startUnix, endUnix } }
        )
        return Number(rows[0].c || 0)
    }

    const countOrders = async (startUnix, endUnix) => {
        const [rows] = await sequelize.query(
            `SELECT COUNT(o.id) AS c FROM site_user u INNER JOIN site2_user_orders o ON o.user_id = u.id WHERE u.create_time >= :startUnix AND u.create_time < :endUnix`,
            { replacements: { startUnix, endUnix } }
        )
        return Number(rows[0].c || 0)
    }

    const windowCounts = async (row) => {
        const win = campaignWindow(row.start_at, row.duration_days)
        if (!win) throw new Error('推广时间无效')
        const [preLeads, preAcq, preCpa, preOrders, actualLeads, actualAcq, actualCpa, actualOrders] = await Promise.all([
            countUsers(win.baselineStartUnix, win.startUnix, 'leads'),
            countUsers(win.baselineStartUnix, win.startUnix, 'acq'),
            countUsers(win.baselineStartUnix, win.startUnix, 'cpa'),
            countOrders(win.baselineStartUnix, win.startUnix),
            countUsers(win.startUnix, win.endUnix, 'leads'),
            countUsers(win.startUnix, win.endUnix, 'acq'),
            countUsers(win.startUnix, win.endUnix, 'cpa'),
            countOrders(win.startUnix, win.endUnix)
        ])
        const metrics = buildPromoMetrics({
            durationDays: row.duration_days,
            amount: row.amount,
            baselineDailyOverride: row.baseline_daily,
            preLeads,
            preAcq,
            preCpa,
            preOrders,
            actualLeads,
            actualAcq,
            actualCpa,
            actualOrders
        })
        return {
            start_at: win.startSql,
            end_at: win.endSql,
            users_from: win.startSql.slice(0, 10),
            users_to: formatSql(new Date(win.end.getTime() - 1000)).slice(0, 10),
            pre_leads: preLeads,
            pre_acq: preAcq,
            pre_cpa: preCpa,
            pre_orders: preOrders,
            ...metrics
        }
    }

    const decorate = async (row) => {
        const metrics = await windowCounts(row)
        return Object.assign({}, row, {
            duration_days: num(row.duration_days),
            amount: num(row.amount),
            baseline_daily: row.baseline_daily === null || row.baseline_daily === undefined ? null : num(row.baseline_daily),
            ...metrics
        })
    }

    router.get('/promotions/preview', async (req, res) => {
        try {
            await ensureTable()
            const draft = {
                start_at: req.query.start_at,
                duration_days: req.query.duration_days,
                amount: req.query.amount,
                baseline_daily: req.query.baseline_daily === '' ? null : req.query.baseline_daily
            }
            if (!campaignWindow(draft.start_at, draft.duration_days)) throw new Error('请先填写开始时间和持续天数')
            return ok(res, await decorate(draft))
        } catch (error) {
            return fail(res, error)
        }
    })

    router.get('/promotions', async (req, res) => {
        try {
            await ensureTable()
            const [rows] = await sequelize.query(`SELECT id, platform, DATE_FORMAT(start_at, '%Y-%m-%d %H:%i:%s') AS start_at, duration_days, amount, baseline_daily, note, created_by, created_at, updated_at FROM site2_promo_campaigns ORDER BY start_at DESC, id DESC`)
            const data = []
            for (const row of rows) data.push(await decorate(row))
            return ok(res, data)
        } catch (error) {
            return fail(res, error, 500)
        }
    })

    router.get('/promotions/detail', async (req, res) => {
        try {
            await ensureTable()
            const id = Number(req.query.id)
            const [rows] = await sequelize.query(`SELECT id, platform, DATE_FORMAT(start_at, '%Y-%m-%d %H:%i:%s') AS start_at, duration_days, amount, baseline_daily, note, created_by FROM site2_promo_campaigns WHERE id = :id`, { replacements: { id } })
            if (!rows[0]) return fail(res, new Error('推广记录不存在'), 404)
            return ok(res, await decorate(rows[0]))
        } catch (error) {
            return fail(res, error, 500)
        }
    })

    router.post('/promotions', async (req, res) => {
        try {
            await ensureTable()
            const body = readBody(req)
            await sequelize.query(
                `INSERT INTO site2_promo_campaigns (platform, start_at, duration_days, amount, baseline_daily, note, created_by)
                 VALUES (:platform, :start_at, :duration_days, :amount, :baseline_daily, :note, :created_by)`,
                { replacements: Object.assign({ created_by: staffId(req) }, body) }
            )
            const [idRows] = await sequelize.query('SELECT LAST_INSERT_ID() AS id')
            const id = idRows[0].id
            const [rows] = await sequelize.query(`SELECT id, platform, DATE_FORMAT(start_at, '%Y-%m-%d %H:%i:%s') AS start_at, duration_days, amount, baseline_daily, note, created_by FROM site2_promo_campaigns WHERE id = :id`, { replacements: { id } })
            return ok(res, await decorate(rows[0]))
        } catch (error) {
            return fail(res, error)
        }
    })

    router.post('/promotions/update', async (req, res) => {
        try {
            await ensureTable()
            const id = Number(req.body.id)
            const body = readBody(req)
            const [rows] = await sequelize.query('SELECT id FROM site2_promo_campaigns WHERE id = :id', { replacements: { id } })
            if (!rows[0]) return fail(res, new Error('推广记录不存在'), 404)
            await sequelize.query(
                `UPDATE site2_promo_campaigns
                 SET platform=:platform, start_at=:start_at, duration_days=:duration_days, amount=:amount,
                     baseline_daily=:baseline_daily, note=:note
                 WHERE id=:id`,
                { replacements: Object.assign({ id }, body) }
            )
            const [next] = await sequelize.query(`SELECT id, platform, DATE_FORMAT(start_at, '%Y-%m-%d %H:%i:%s') AS start_at, duration_days, amount, baseline_daily, note, created_by FROM site2_promo_campaigns WHERE id = :id`, { replacements: { id } })
            return ok(res, await decorate(next[0]))
        } catch (error) {
            return fail(res, error)
        }
    })

    router.post('/promotions/delete', async (req, res) => {
        try {
            await ensureTable()
            const id = Number(req.body.id)
            await sequelize.query('DELETE FROM site2_promo_campaigns WHERE id = :id', { replacements: { id } })
            return ok(res, { id })
        } catch (error) {
            return fail(res, error, 500)
        }
    })
}
