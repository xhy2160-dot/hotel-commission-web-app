/**
 * Extra admin routes. Mount after webappAdminExtras.
 * Does not change mini-program /users or /admin responses.
 */
const { Op } = require('sequelize');

function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
function dayRange(from, to) {
    if (!from && !to) return null;
    const start = from ? new Date(from + 'T00:00:00+08:00') : new Date('1970-01-01T00:00:00+08:00');
    const end = to ? new Date(to + 'T23:59:59.999+08:00') : new Date();
    return {
        start, end,
        startSql: (from || '1970-01-01') + ' 00:00:00',
        endSql: (to || '2099-12-31') + ' 23:59:59',
        startDay: from || '1970-01-01',
        endDay: to || '2099-12-31',
        startUnix: Math.floor(start.getTime() / 1000),
        endUnix: Math.floor(end.getTime() / 1000)
    };
}
function applyRange(where, field, from, to, unix) {
    const r = dayRange(from, to);
    if (!r) return;
    where[field] = unix ? { [Op.between]: [r.startUnix, r.endUnix] } : { [Op.between]: [r.start, r.end] };
}
function pageLimit(req) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(5000, Math.max(1, parseInt(req.query.limit, 10) || 10));
    return { page, limit, offset: (page - 1) * limit };
}
function parseCalc(raw) {
    if (!raw) return [];
    try { const d = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(d) ? d : []; } catch { return []; }
}

module.exports = function registerAdminP1(router) {
    const db = require('../models');
    const { sequelize, Site2UserOrder, Site2UserWithdrawWechat, site_user_withdraw_apply: Zelle } = db;

    router.get('/orders/admin-list', async (req, res) => {
        try {
            const { page, limit, offset } = pageLimit(req);
            const where = {};
            const q = String(req.query.confirmation || req.query.q || '').trim();
            if (q) where.confirmation_num = { [Op.like]: '%' + q + '%' };
            if (req.query.cashback === '1') where.status = 1;
            applyRange(where, 'created_at', req.query.from, req.query.to);
            const { count, rows } = await Site2UserOrder.unscoped().findAndCountAll({ where, order: [['id', 'DESC']], limit, offset });
            return res.json({
                success: true,
                data: rows.map(row => {
                    const o = row.get({ plain: true });
                    const calc_lines = parseCalc(o.calc_detail);
                    const created = o.created_at || o.createdAt;
                    return Object.assign({}, o, {
                        calc_lines,
                        has_snapshot: calc_lines.length > 0,
                        createdAt: created,
                        cashback_date: o.check_out_date || null
                    });
                }),
                pagination: { totalItems: count, totalPages: Math.ceil(count / limit) || 1, currentPage: page, pageSize: limit }
            });
        } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
    });

    router.get('/withdrawals/admin-list', async (req, res) => {
        try {
            const { page, limit, offset } = pageLimit(req);
            const type = req.query.type === 'wechat' ? 'wechat' : 'zelle';
            const Model = type === 'wechat' ? Site2UserWithdrawWechat : Zelle;
            const where = {};
            applyRange(where, type === 'wechat' ? 'created_at' : 'create_time', req.query.from, req.query.to, type === 'zelle');
            if (req.query.pending === '1') where.status = 0;
            else if (req.query.status && req.query.status !== 'All') where.status = Number(req.query.status);
            const { count, rows } = await Model.findAndCountAll({ where, order: [['id', 'DESC']], limit, offset });
            return res.json({
                success: true,
                data: rows.map(r => r.get({ plain: true })),
                pagination: { totalItems: count, totalPages: Math.ceil(count / limit) || 1, currentPage: page, pageSize: limit }
            });
        } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
    });

    router.get('/dashboard', async (req, res) => {
        try {
            const r = dayRange(req.query.from, req.query.to) || dayRange(
                new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date()),
                new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
            );
            const q = async (sql) => {
                const [rows] = await sequelize.query(sql, { replacements: r });
                return Number(rows[0].c || 0);
            };
            const newUsers = await q('SELECT COUNT(*) AS c FROM site_user WHERE create_time BETWEEN :startUnix AND :endUnix').catch(() => q('SELECT COUNT(*) AS c FROM site_user WHERE create_time BETWEEN :startSql AND :endSql'));
            const newOrders = await q('SELECT COUNT(*) AS c FROM site2_user_orders WHERE created_at BETWEEN :startSql AND :endSql');
            const cashbackOrders = await q('SELECT COUNT(*) AS c FROM site2_user_orders WHERE status=1 AND created_at BETWEEN :startSql AND :endSql');
            const zelleApplies = await q('SELECT COUNT(*) AS c FROM site_user_withdraw_apply WHERE create_time BETWEEN :startUnix AND :endUnix').catch(() => q('SELECT COUNT(*) AS c FROM site_user_withdraw_apply WHERE create_time BETWEEN :startSql AND :endSql'));
            const wechatApplies = await q('SELECT COUNT(*) AS c FROM site2_user_withdraw_wechat WHERE created_at BETWEEN :startSql AND :endSql');
            const zellePending = await q('SELECT COUNT(*) AS c FROM site_user_withdraw_apply WHERE status=0 AND create_time BETWEEN :startUnix AND :endUnix').catch(() => q('SELECT COUNT(*) AS c FROM site_user_withdraw_apply WHERE status=0 AND create_time BETWEEN :startSql AND :endSql'));
            const wechatPending = await q('SELECT COUNT(*) AS c FROM site2_user_withdraw_wechat WHERE status=0 AND created_at BETWEEN :startSql AND :endSql');
            const pendingAppeals = await q('SELECT COUNT(*) AS c FROM site_hotel_order_appeal WHERE status=0 AND create_time BETWEEN :startSql AND :endSql').catch(() => q('SELECT COUNT(*) AS c FROM site_hotel_order_appeal WHERE status=0 AND create_time BETWEEN :startUnix AND :endUnix'));
            return res.json({ success: true, data: { newUsers, newOrders, cashbackOrders, withdrawalApplies: zelleApplies + wechatApplies, pendingWithdrawals: zellePending + wechatPending, pendingAppeals } });
        } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
    });

    router.get('/stats', async (req, res) => {
        try {
            const r = dayRange(req.query.from, req.query.to) || dayRange('1970-01-01', '2099-12-31');
            const [cols] = await sequelize.query("SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='site2_user_orders' AND COLUMN_NAME='commission_cny'");
            const commissionExpr = Number(cols[0].c) ? 'COALESCE(SUM(commission_cny),0)' : '0';
            const [orderRows] = await sequelize.query(
                `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, ${commissionExpr} AS commission, COALESCE(SUM(amount),0) AS rebate, COUNT(*) AS orders FROM site2_user_orders WHERE created_at BETWEEN :startSql AND :endSql GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY month`,
                { replacements: r }
            );
            let userRows = [];
            try {
                const [rows] = await sequelize.query("SELECT DATE_FORMAT(FROM_UNIXTIME(create_time),'%Y-%m') AS month, COUNT(*) AS users FROM site_user WHERE create_time BETWEEN :startUnix AND :endUnix GROUP BY DATE_FORMAT(FROM_UNIXTIME(create_time),'%Y-%m')", { replacements: r });
                userRows = rows;
            } catch {
                const [rows] = await sequelize.query("SELECT DATE_FORMAT(create_time,'%Y-%m') AS month, COUNT(*) AS users FROM site_user WHERE create_time BETWEEN :startSql AND :endSql GROUP BY DATE_FORMAT(create_time,'%Y-%m')", { replacements: r });
                userRows = rows;
            }
            const months = new Map();
            for (const row of orderRows) months.set(row.month, { month: row.month, commission: num(row.commission), rebate: num(row.rebate), payout: 0, orders: Number(row.orders || 0), users: 0 });
            for (const row of userRows) {
                if (!row.month) continue;
                if (!months.has(row.month)) months.set(row.month, { month: row.month, commission: 0, rebate: 0, payout: 0, orders: 0, users: 0 });
                months.get(row.month).users += Number(row.users || 0);
            }
            try {
                const [rows] = await sequelize.query("SELECT DATE_FORMAT(FROM_UNIXTIME(create_time),'%Y-%m') AS month, COALESCE(SUM(amount),0) AS payout FROM site_user_withdraw_apply WHERE status=4 AND create_time BETWEEN :startUnix AND :endUnix GROUP BY DATE_FORMAT(FROM_UNIXTIME(create_time),'%Y-%m')", { replacements: r });
                for (const row of rows) if (months.has(row.month)) months.get(row.month).payout += num(row.payout);
            } catch (e) { console.error(e); }
            try {
                const [rows] = await sequelize.query("SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COALESCE(SUM(amount),0) AS payout FROM site2_user_withdraw_wechat WHERE status=2 AND created_at BETWEEN :startSql AND :endSql GROUP BY DATE_FORMAT(created_at,'%Y-%m')", { replacements: r });
                for (const row of rows) if (months.has(row.month)) months.get(row.month).payout += num(row.payout);
            } catch (e) { console.error(e); }
            const [vipRows] = await sequelize.query('SELECT v.vip_name, v.rebate_rate, COUNT(u.id) AS count FROM site2_app_vip_level v LEFT JOIN site_user u ON u.vip_id=v.id GROUP BY v.id, v.vip_name, v.rebate_rate ORDER BY v.id');
            return res.json({
                success: true,
                data: {
                    months: [...months.values()].sort((a, b) => String(a.month).localeCompare(String(b.month))).map(row => ({
                        month: row.month,
                        commission: row.commission.toFixed(2),
                        rebate: row.rebate.toFixed(2),
                        payout: row.payout.toFixed(2),
                        profit: (row.commission - row.rebate).toFixed(2),
                        orders: row.orders,
                        users: row.users
                    })),
                    vips: vipRows.map(row => ({ vip_name: row.vip_name, rebate_rate: num(row.rebate_rate), count: Number(row.count || 0) }))
                }
            });
        } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
    });
};
