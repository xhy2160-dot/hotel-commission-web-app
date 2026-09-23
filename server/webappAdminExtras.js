/**
 * Admin-only routes mounted under /webapp.
 * Does not change mini-program /users or /admin responses.
 */
const { Op } = require('sequelize');

function beijing(value) {
    if (value === null || value === undefined || value === '') return null;
    const date = typeof value === 'number'
        ? new Date(value < 1e12 ? value * 1000 : value)
        : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const text = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        second: '2-digit',
        minute: '2-digit'
    }).format(date);
    return text.replace(/\//g, '-');
}

function num(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
}

function parseCalc(raw) {
    if (!raw) return [];
    try {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function dayRange(from, to) {
    if (!from && !to) return null;
    const start = from
        ? new Date(`${from}T00:00:00+08:00`)
        : new Date('1970-01-01T00:00:00+08:00');
    const end = to
        ? new Date(`${to}T23:59:59.999+08:00`)
        : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return {
        start,
        end,
        startSql: `${from || '1970-01-01'} 00:00:00`,
        endSql: `${to || '2099-12-31'} 23:59:59`,
        startDay: from || '1970-01-01',
        endDay: to || '2099-12-31',
        startUnix: Math.floor(start.getTime() / 1000),
        endUnix: Math.floor(end.getTime() / 1000)
    };
}

function applyDayRange(where, field, from, to, unix = false) {
    const range = dayRange(from, to);
    if (!range) return;
    where[field] = unix
        ? { [Op.between]: [range.startUnix, range.endUnix] }
        : { [Op.between]: [range.start, range.end] };
}

function publicUser(row) {
    if (!row) return null;
    const user = row.get ? row.get({ plain: true }) : row;
    return {
        id: user.id,
        legal_name: user.legal_name,
        nickname: user.nickname,
        avatar: user.avatar,
        invite_code: user.invite_code,
        inviter_id: user.inviter_id,
        status: user.status,
        vip_id: user.vip_id,
        create_time: user.create_time,
        registered_at: beijing(user.create_time)
    };
}

function publicOrder(row) {
    const order = row.get ? row.get({ plain: true }) : row;
    const calc_lines = parseCalc(order.calc_detail);
    const created = order.created_at || order.createdAt || order.create_time;
    return {
        ...order,
        calc_lines,
        has_snapshot: calc_lines.length > 0,
        submitted_at: beijing(created),
        calculated_at: beijing(order.rebate_calculated_at),
        createdAt: created,
        cashback_date: order.cashback_date || order.check_out_date || null,
        source: order.source || '小程序'
    };
}

function pageLimit(req, fallback = 10, max = 5000) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(max, Math.max(1, parseInt(req.query.limit, 10) || fallback));
    return { page, limit, offset: (page - 1) * limit };
}

function ok(res, data, extra = {}) {
    return res.json({ success: true, data, ...extra });
}

function fail(res, error, status = 500) {
    return res.status(status).json({ success: false, message: error.message || String(error) });
}

module.exports = function registerAdminExtras(router) {
    const db = require('../models');
    const {
        sequelize,
        site_user: User,
        Site2VipLevel,
        Site2UserOrder,
        site_hotel_order_appeal: Appeal,
        Site2UserWithdrawWechat,
        site_user_withdraw_apply: ZelleWithdraw,
        site2_staff: Staff
    } = db;

    const columnCache = new Map();
    async function hasColumn(table, column) {
        const key = `${table}.${column}`;
        if (columnCache.has(key)) return columnCache.get(key);
        const [rows] = await sequelize.query(
            `SELECT COUNT(*) AS c
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND COLUMN_NAME = ?`,
            { replacements: [table, column] }
        );
        const exists = Number(rows[0].c) > 0;
        columnCache.set(key, exists);
        return exists;
    }

    async function vipMap(ids) {
        const where = ids && ids.length ? { id: { [Op.in]: ids } } : { is_active: 1 };
        const rows = await Site2VipLevel.findAll({
            where,
            attributes: ['id', 'vip_name', 'rebate_rate', 'is_active'],
            raw: true
        });
        return new Map(rows.map(row => [row.id, row]));
    }

    async function orderStats(userIds) {
        if (!userIds.length) return new Map();
        const [rows] = await sequelize.query(
            `SELECT user_id,
                    COUNT(*) AS order_count,
                    COALESCE(SUM(amount), 0) AS rebate_sum
             FROM site2_user_orders
             WHERE user_id IN (:ids)
             GROUP BY user_id`,
            { replacements: { ids: userIds } }
        );
        return new Map(rows.map(row => [Number(row.user_id), row]));
    }

    router.get('/vip-levels', async (req, res) => {
        try {
            const rows = await Site2VipLevel.findAll({
                attributes: ['id', 'vip_name', 'rebate_rate', 'is_active', 'orders_required'],
                order: [['sort_order', 'ASC'], ['id', 'ASC']]
            });
            return ok(res, rows);
        } catch (error) {
            return fail(res, error);
        }
    });

    router.get('/users', async (req, res) => {
        try {
            const { page, limit, offset } = pageLimit(req);
            const q = String(req.query.q || '').trim();
            const where = {};
            if (q) {
                const or = [
                    { nickname: { [Op.like]: `%${q}%` } },
                    { legal_name: { [Op.like]: `%${q}%` } }
                ];
                if (/^\d+$/.test(q)) or.push({ id: Number(q) });
                where[Op.or] = or;
            }
            applyDayRange(where, 'create_time', req.query.from, req.query.to, true);

            const { count, rows } = await User.findAndCountAll({
                where,
                attributes: ['id', 'legal_name', 'nickname', 'invite_code', 'inviter_id', 'status', 'vip_id', 'create_time'],
                order: [['id', 'DESC']],
                limit,
                offset
            });

            const ids = rows.map(row => row.id);
            const vips = await vipMap([...new Set(rows.map(row => row.vip_id).filter(Boolean))]);
            const stats = await orderStats(ids);

            const data = rows.map(row => {
                const plain = publicUser(row);
                const vip = vips.get(plain.vip_id);
                const stat = stats.get(plain.id) || {};
                return {
                    ...plain,
                    vip_name: vip ? vip.vip_name : null,
                    rebate_rate: vip ? num(vip.rebate_rate) : null,
                    order_count: Number(stat.order_count || 0),
                    rebate_sum: num(stat.rebate_sum)
                };
            });

            return ok(res, data, {
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit) || 1,
                    currentPage: page,
                    pageSize: limit
                }
            });
        } catch (error) {
            console.error('admin users', error);
            return fail(res, error);
        }
    });

    router.get('/users/detail', async (req, res) => {
        try {
            const id = parseInt(req.query.id, 10);
            if (!id) return fail(res, new Error('缺少用户ID'), 400);

            const user = await User.findByPk(id, {
                attributes: ['id', 'legal_name', 'nickname', 'avatar', 'invite_code', 'inviter_id', 'status', 'vip_id', 'create_time']
            });
            if (!user) return fail(res, new Error('用户不存在'), 404);

            const vips = await vipMap();
            const vip = vips.get(user.vip_id);
            const inviter = user.inviter_id
                ? await User.findByPk(user.inviter_id, { attributes: ['id', 'nickname', 'legal_name'] })
                : null;
            const stats = await orderStats([id]);
            const stat = stats.get(id) || {};

            const orders = await Site2UserOrder.unscoped().findAll({
                where: { user_id: id },
                order: [['id', 'DESC']],
                limit: 100
            });
            const appeals = await Appeal.findAll({
                where: { user_id: id },
                order: [['id', 'DESC']],
                limit: 100
            });
            const zelle = await ZelleWithdraw.findAll({
                where: { user_id: id },
                order: [['id', 'DESC']],
                limit: 100
            });
            const wechat = await Site2UserWithdrawWechat.findAll({
                where: { user_id: id },
                order: [['id', 'DESC']],
                limit: 100
            });

            const mappedOrders = orders.map(publicOrder);
            return ok(res, {
                user: {
                    ...publicUser(user),
                    vip_name: vip ? vip.vip_name : null,
                    rebate_rate: vip ? num(vip.rebate_rate) : null,
                    inviter: inviter ? publicUser(inviter) : null,
                    order_count: Number(stat.order_count || 0),
                    rebate_sum: num(stat.rebate_sum)
                },
                vip_levels: [...vips.values()],
                orders: mappedOrders,
                rebates: mappedOrders.filter(order => num(order.amount) > 0),
                withdrawals: [
                    ...zelle.map(row => ({ ...row.get({ plain: true }), channel: 'zelle' })),
                    ...wechat.map(row => ({ ...row.get({ plain: true }), channel: 'wechat' }))
                ],
                appeals: appeals.map(row => row.get({ plain: true }))
            });
        } catch (error) {
            console.error('admin user detail', error);
            return fail(res, error);
        }
    });

    router.post('/users/update', async (req, res) => {
        try {
            const id = parseInt(req.body.id, 10);
            if (!id) return fail(res, new Error('缺少用户ID'), 400);
            const patch = {};
            if (req.body.vip_id !== undefined && req.body.vip_id !== null && req.body.vip_id !== '') {
                const vip = await Site2VipLevel.findByPk(req.body.vip_id);
                if (!vip) return fail(res, new Error('会员等级不存在'), 400);
                patch.vip_id = vip.id;
            }
            if (req.body.status !== undefined) {
                const status = String(req.body.status);
                if (!['active', 'inactive'].includes(status)) {
                    return fail(res, new Error('状态只能是 active 或 inactive'), 400);
                }
                patch.status = status;
            }
            if (!Object.keys(patch).length) {
                return fail(res, new Error('没有可更新的字段'), 400);
            }
            const [count] = await User.update(patch, { where: { id } });
            if (!count) return fail(res, new Error('用户不存在'), 404);
            return res.json({ success: true, message: '已保存' });
        } catch (error) {
            console.error('admin user update', error);
            return fail(res, error);
        }
    });

    router.get('/orders/detail', async (req, res) => {
        try {
            const id = parseInt(req.query.id, 10);
            if (!id) return fail(res, new Error('缺少订单ID'), 400);
            const order = await Site2UserOrder.unscoped().findByPk(id);
            if (!order) return fail(res, new Error('订单不存在'), 404);
            const plain = publicOrder(order);
            const user = plain.user_id
                ? await User.findByPk(plain.user_id, {
                    attributes: ['id', 'legal_name', 'nickname', 'vip_id', 'status', 'invite_code', 'inviter_id', 'create_time']
                })
                : null;
            const vip = user && user.vip_id ? await Site2VipLevel.findByPk(user.vip_id) : null;
            const appeal = plain.appeal_id
                ? await Appeal.findByPk(plain.appeal_id)
                : null;
            return ok(res, {
                order: plain,
                user: user ? {
                    ...publicUser(user),
                    vip_name: vip ? vip.vip_name : null,
                    rebate_rate: vip ? num(vip.rebate_rate) : null,
                    current_rebate_rate: vip ? num(vip.rebate_rate) : null
                } : null,
                appeal: appeal ? appeal.get({ plain: true }) : null,
                reviewer: null
            });
        } catch (error) {
            console.error('admin order detail', error);
            return fail(res, error);
        }
    });

    router.get('/orders/admin-list', async (req, res) => {
        try {
            const { page, limit, offset } = pageLimit(req);
            const where = {};
            const confirmation = String(req.query.confirmation || req.query.q || '').trim();
            if (confirmation) {
                where.confirmation_num = { [Op.like]: `%${confirmation}%` };
            }
            if (req.query.cashback === '1') where.status = 1;
            applyDayRange(where, 'created_at', req.query.from, req.query.to);

            const { count, rows } = await Site2UserOrder.unscoped().findAndCountAll({
                where,
                order: [['id', 'DESC']],
                limit,
                offset
            });
            return ok(res, rows.map(publicOrder), {
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit) || 1,
                    currentPage: page,
                    pageSize: limit
                }
            });
        } catch (error) {
            console.error('admin order list', error);
            return fail(res, error);
        }
    });

    router.get('/withdrawals/admin-list', async (req, res) => {
        try {
            const { page, limit, offset } = pageLimit(req);
            const type = req.query.type === 'wechat' ? 'wechat' : 'zelle';
            const Model = type === 'wechat' ? Site2UserWithdrawWechat : ZelleWithdraw;
            const where = {};
            const timeField = type === 'wechat' ? 'created_at' : 'create_time';
            applyDayRange(where, timeField, req.query.from, req.query.to, type === 'zelle');
            if (req.query.pending === '1') {
                where.status = 0;
            } else if (req.query.status !== undefined && req.query.status !== '' && req.query.status !== 'All') {
                where.status = Number(req.query.status);
            }
            const search = String(req.query.search || '').trim();
            if (search) {
                const or = type === 'wechat'
                    ? [
                        { out_bill_no: { [Op.like]: `%${search}%` } },
                        { real_name: { [Op.like]: `%${search}%` } }
                    ]
                    : [
                        { withdraw_no: { [Op.like]: `%${search}%` } },
                        { zelle_name: { [Op.like]: `%${search}%` } },
                        { zelle_phone: { [Op.like]: `%${search}%` } }
                    ];
                if (/^\d+$/.test(search)) or.push({ user_id: Number(search) }, { id: Number(search) });
                where[Op.or] = or;
            }

            const { count, rows } = await Model.findAndCountAll({
                where,
                order: [['id', 'DESC']],
                limit,
                offset
            });
            return ok(res, rows.map(row => row.get({ plain: true })), {
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit) || 1,
                    currentPage: page,
                    pageSize: limit
                }
            });
        } catch (error) {
            console.error('admin withdrawals', error);
            return fail(res, error);
        }
    });

    router.get('/withdrawals/reviewers', async (req, res) => {
        try {
            const rows = await Staff.findAll({ attributes: ['id', 'nickname', 'email'], raw: true });
            return ok(res, rows);
        } catch (error) {
            return fail(res, error);
        }
    });

    router.get('/dashboard', async (req, res) => {
        try {
            const from = req.query.from;
            const to = req.query.to;
            const range = dayRange(from, to) || dayRange(
                new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date()),
                new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
            );

            const countSql = async (sql, extra = {}) => {
                const [rows] = await sequelize.query(sql, {
                    replacements: {
                        start: range.startSql,
                        end: range.endSql,
                        startDay: range.startDay,
                        endDay: range.endDay,
                        startUnix: range.startUnix,
                        endUnix: range.endUnix,
                        ...extra
                    }
                });
                return Number(rows[0].c || 0);
            };

            const userTime = await hasColumn('site_user', 'create_time');
            const orderCreated = await hasColumn('site2_user_orders', 'created_at');
            const checkout = await hasColumn('site2_user_orders', 'check_out_date');
            const zellePaid = await hasColumn('site_user_withdraw_apply', 'create_time');
            const wechatCreated = await hasColumn('site2_user_withdraw_wechat', 'created_at');

            const newUsers = userTime
                ? await countSql('SELECT COUNT(*) AS c FROM site_user WHERE create_time BETWEEN :startUnix AND :endUnix')
                    .catch(() => countSql('SELECT COUNT(*) AS c FROM site_user WHERE create_time BETWEEN :start AND :end'))
                : 0;
            const newOrders = orderCreated
                ? await countSql('SELECT COUNT(*) AS c FROM site2_user_orders WHERE created_at BETWEEN :start AND :end')
                : 0;
            const cashbackOrders = orderCreated
                ? await countSql('SELECT COUNT(*) AS c FROM site2_user_orders WHERE status = 1 AND created_at BETWEEN :start AND :end')
                : 0;
            const zelleApplies = zellePaid
                ? await countSql('SELECT COUNT(*) AS c FROM site_user_withdraw_apply WHERE create_time BETWEEN :startUnix AND :endUnix')
                    .catch(() => countSql('SELECT COUNT(*) AS c FROM site_user_withdraw_apply WHERE create_time BETWEEN :start AND :end'))
                : 0;
            const wechatApplies = wechatCreated
                ? await countSql('SELECT COUNT(*) AS c FROM site2_user_withdraw_wechat WHERE created_at BETWEEN :start AND :end')
                : 0;
            const zellePending = zellePaid
                ? await countSql('SELECT COUNT(*) AS c FROM site_user_withdraw_apply WHERE status = 0 AND create_time BETWEEN :startUnix AND :endUnix')
                    .catch(() => countSql('SELECT COUNT(*) AS c FROM site_user_withdraw_apply WHERE status = 0 AND create_time BETWEEN :start AND :end'))
                : 0;
            const wechatPending = wechatCreated
                ? await countSql('SELECT COUNT(*) AS c FROM site2_user_withdraw_wechat WHERE status = 0 AND created_at BETWEEN :start AND :end')
                : 0;
            const pendingAppeals = await countSql(
                'SELECT COUNT(*) AS c FROM site_hotel_order_appeal WHERE status = 0 AND create_time BETWEEN :start AND :end'
            ).catch(() => countSql(
                'SELECT COUNT(*) AS c FROM site_hotel_order_appeal WHERE status = 0 AND create_time BETWEEN :startUnix AND :endUnix'
            ));

            return ok(res, {
                newUsers,
                newOrders,
                cashbackOrders,
                withdrawalApplies: zelleApplies + wechatApplies,
                pendingWithdrawals: zellePending + wechatPending,
                pendingAppeals
            });
        } catch (error) {
            console.error('admin dashboard', error);
            return fail(res, error);
        }
    });

    router.get('/stats', async (req, res) => {
        try {
            const from = req.query.from;
            const to = req.query.to;
            const range = dayRange(from, to) || dayRange('1970-01-01', '2099-12-31');
            const hasCommission = await hasColumn('site2_user_orders', 'commission_cny');
            const commissionExpr = hasCommission ? 'COALESCE(SUM(commission_cny), 0)' : '0';

            const [orderRows] = await sequelize.query(
                `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
                        ${commissionExpr} AS commission,
                        COALESCE(SUM(amount), 0) AS rebate,
                        COUNT(*) AS orders
                 FROM site2_user_orders
                 WHERE created_at BETWEEN :start AND :end
                 GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                 ORDER BY month ASC`,
                { replacements: { start: range.startSql, end: range.endSql } }
            );

            let userRows = [];
            try {
                const [rows] = await sequelize.query(
                    `SELECT DATE_FORMAT(FROM_UNIXTIME(create_time), '%Y-%m') AS month, COUNT(*) AS users
                     FROM site_user
                     WHERE create_time BETWEEN :startUnix AND :endUnix
                     GROUP BY DATE_FORMAT(FROM_UNIXTIME(create_time), '%Y-%m')`,
                    { replacements: { startUnix: range.startUnix, endUnix: range.endUnix } }
                );
                userRows = rows;
            } catch {
                const [rows] = await sequelize.query(
                    `SELECT DATE_FORMAT(create_time, '%Y-%m') AS month, COUNT(*) AS users
                     FROM site_user
                     WHERE create_time BETWEEN :start AND :end
                     GROUP BY DATE_FORMAT(create_time, '%Y-%m')`,
                    { replacements: { start: range.startSql, end: range.endSql } }
                );
                userRows = rows;
            }

            const months = new Map();
            for (const row of orderRows) {
                months.set(row.month, {
                    month: row.month,
                    commission: num(row.commission),
                    rebate: num(row.rebate),
                    payout: 0,
                    orders: Number(row.orders || 0),
                    users: 0
                });
            }
            for (const row of userRows) {
                if (!row.month) continue;
                if (!months.has(row.month)) {
                    months.set(row.month, { month: row.month, commission: 0, rebate: 0, payout: 0, orders: 0, users: 0 });
                }
                months.get(row.month).users += Number(row.users || 0);
            }

            const zellePaidCol = await hasColumn('site_user_withdraw_apply', 'paid_at') ? 'paid_at' : 'create_time';
            try {
                const [zelleRows] = await sequelize.query(
                    `SELECT DATE_FORMAT(COALESCE(${zellePaidCol}, create_time), '%Y-%m') AS month,
                            COALESCE(SUM(amount), 0) AS payout
                     FROM site_user_withdraw_apply
                     WHERE status = 4
                       AND COALESCE(${zellePaidCol}, create_time) BETWEEN :start AND :end
                     GROUP BY DATE_FORMAT(COALESCE(${zellePaidCol}, create_time), '%Y-%m')`,
                    { replacements: { start: range.startSql, end: range.endSql } }
                );
                for (const row of zelleRows) {
                    if (!months.has(row.month)) continue;
                    months.get(row.month).payout += num(row.payout);
                }
            } catch {
                const [zelleRows] = await sequelize.query(
                    `SELECT DATE_FORMAT(FROM_UNIXTIME(create_time), '%Y-%m') AS month,
                            COALESCE(SUM(amount), 0) AS payout
                     FROM site_user_withdraw_apply
                     WHERE status = 4
                       AND create_time BETWEEN :startUnix AND :endUnix
                     GROUP BY DATE_FORMAT(FROM_UNIXTIME(create_time), '%Y-%m')`,
                    { replacements: { startUnix: range.startUnix, endUnix: range.endUnix } }
                );
                for (const row of zelleRows) {
                    if (!months.has(row.month)) continue;
                    months.get(row.month).payout += num(row.payout);
                }
            }

            try {
                const [wechatRows] = await sequelize.query(
                    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
                            COALESCE(SUM(amount), 0) AS payout
                     FROM site2_user_withdraw_wechat
                     WHERE status = 2
                       AND created_at BETWEEN :start AND :end
                     GROUP BY DATE_FORMAT(created_at, '%Y-%m')`,
                    { replacements: { start: range.startSql, end: range.endSql } }
                );
                for (const row of wechatRows) {
                    if (!months.has(row.month)) continue;
                    months.get(row.month).payout += num(row.payout);
                }
            } catch (error) {
                console.error('admin stats wechat', error);
            }

            const monthRows = [...months.values()]
                .sort((a, b) => String(a.month).localeCompare(String(b.month)))
                .map(row => ({
                    month: row.month,
                    commission: row.commission.toFixed(2),
                    rebate: row.rebate.toFixed(2),
                    payout: row.payout.toFixed(2),
                    profit: (row.commission - row.rebate).toFixed(2),
                    orders: row.orders,
                    users: row.users
                }));

            const [vipRows] = await sequelize.query(
                `SELECT v.id, v.vip_name, v.rebate_rate, COUNT(u.id) AS count
                 FROM site2_app_vip_level v
                 LEFT JOIN site_user u ON u.vip_id = v.id
                 GROUP BY v.id, v.vip_name, v.rebate_rate
                 ORDER BY v.id ASC`
            );

            return ok(res, {
                months: monthRows,
                vips: vipRows.map(row => ({
                    vip_name: row.vip_name,
                    rebate_rate: num(row.rebate_rate),
                    count: Number(row.count || 0)
                }))
            });
        } catch (error) {
            console.error('admin stats', error);
            return fail(res, error);
        }
    });
};
