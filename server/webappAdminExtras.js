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
        minute: '2-digit',
        second: '2-digit'
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

function publicUser(row) {
    if (!row) return null;
    const user = row.get ? row.get({ plain: true }) : row;
    return {
        id: user.id,
        legal_name: user.legal_name,
        nickname: user.nickname,
        phone: user.phone,
        avatar: user.avatar,
        invite_code: user.invite_code,
        inviter_id: user.inviter_id,
        status: user.status,
        vip_id: user.vip_id,
        create_time: user.create_time,
        registered_at: beijing(user.create_time)
    };
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
            return res.json({ success: true, data: rows });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    });

    router.get('/users', async (req, res) => {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
            const offset = (page - 1) * limit;
            const q = String(req.query.q || '').trim();
            const where = {};
            if (q) {
                const or = [
                    { nickname: { [Op.like]: `%${q}%` } },
                    { phone: { [Op.like]: `%${q}%` } },
                    { legal_name: { [Op.like]: `%${q}%` } }
                ];
                if (/^\d+$/.test(q)) or.push({ id: Number(q) });
                where[Op.or] = or;
            }

            const { count, rows } = await User.findAndCountAll({
                where,
                attributes: ['id', 'legal_name', 'nickname', 'phone', 'invite_code', 'inviter_id', 'status', 'vip_id', 'create_time'],
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

            return res.json({
                success: true,
                data,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit) || 1,
                    currentPage: page,
                    pageSize: limit
                }
            });
        } catch (error) {
            console.error('admin users', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    });

    router.get('/users/detail', async (req, res) => {
        try {
            const id = parseInt(req.query.id, 10);
            if (!id) return res.status(400).json({ success: false, message: '缺少用户ID' });

            const user = await User.findByPk(id, {
                attributes: ['id', 'legal_name', 'nickname', 'phone', 'avatar', 'invite_code', 'inviter_id', 'status', 'vip_id', 'create_time']
            });
            if (!user) return res.status(404).json({ success: false, message: '用户不存在' });

            const vips = await vipMap();
            const vip = vips.get(user.vip_id);
            const inviter = user.inviter_id
                ? await User.findByPk(user.inviter_id, { attributes: ['id', 'nickname', 'legal_name', 'phone'] })
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

            return res.json({
                success: true,
                data: {
                    user: {
                        ...publicUser(user),
                        vip_name: vip ? vip.vip_name : null,
                        rebate_rate: vip ? num(vip.rebate_rate) : null,
                        inviter: inviter ? publicUser(inviter) : null,
                        order_count: Number(stat.order_count || 0),
                        rebate_sum: num(stat.rebate_sum)
                    },
                    vip_levels: [...vips.values()],
                    orders: orders.map(order => order.get({ plain: true })),
                    rebates: orders
                        .map(order => order.get({ plain: true }))
                        .filter(order => num(order.amount) > 0),
                    withdrawals: [
                        ...zelle.map(row => ({ ...row.get({ plain: true }), channel: 'zelle' })),
                        ...wechat.map(row => ({ ...row.get({ plain: true }), channel: 'wechat' }))
                    ],
                    appeals: appeals.map(row => row.get({ plain: true }))
                }
            });
        } catch (error) {
            console.error('admin user detail', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    });

    router.post('/users/update', async (req, res) => {
        try {
            const id = parseInt(req.body.id, 10);
            if (!id) return res.status(400).json({ success: false, message: '缺少用户ID' });
            const patch = {};
            if (req.body.vip_id !== undefined && req.body.vip_id !== null && req.body.vip_id !== '') {
                const vip = await Site2VipLevel.findByPk(req.body.vip_id);
                if (!vip) return res.status(400).json({ success: false, message: '会员等级不存在' });
                patch.vip_id = vip.id;
            }
            if (req.body.status !== undefined) {
                const status = String(req.body.status);
                if (!['active', 'inactive'].includes(status)) {
                    return res.status(400).json({ success: false, message: '状态只能是 active 或 inactive' });
                }
                patch.status = status;
            }
            if (!Object.keys(patch).length) {
                return res.status(400).json({ success: false, message: '没有可更新的字段' });
            }
            const [count] = await User.update(patch, { where: { id } });
            if (!count) return res.status(404).json({ success: false, message: '用户不存在' });
            return res.json({ success: true, message: '已保存' });
        } catch (error) {
            console.error('admin user update', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    });

    router.get('/orders/detail', async (req, res) => {
        try {
            const id = parseInt(req.query.id, 10);
            if (!id) return res.status(400).json({ success: false, message: '缺少订单ID' });
            const order = await Site2UserOrder.unscoped().findByPk(id);
            if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
            const plain = order.get({ plain: true });
            const user = plain.user_id
                ? await User.findByPk(plain.user_id, {
                    attributes: ['id', 'legal_name', 'nickname', 'phone', 'vip_id', 'status', 'invite_code', 'inviter_id', 'create_time']
                })
                : null;
            const vip = user && user.vip_id ? await Site2VipLevel.findByPk(user.vip_id) : null;
            const appeal = plain.appeal_id
                ? await Appeal.findByPk(plain.appeal_id)
                : null;
            let reviewer = null;
            return res.json({
                success: true,
                data: {
                    order: {
                        ...plain,
                        calc_lines: parseCalc(plain.calc_detail),
                        submitted_at: beijing(plain.created_at || plain.create_time),
                        calculated_at: beijing(plain.rebate_calculated_at)
                    },
                    user: user ? {
                        ...publicUser(user),
                        vip_name: vip ? vip.vip_name : null,
                        current_rebate_rate: vip ? num(vip.rebate_rate) : null
                    } : null,
                    appeal: appeal ? appeal.get({ plain: true }) : null,
                    reviewer
                }
            });
        } catch (error) {
            console.error('admin order detail', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    });

    router.get('/withdrawals/reviewers', async (req, res) => {
        try {
            const rows = await Staff.findAll({ attributes: ['id', 'nickname', 'email'], raw: true });
            return res.json({ success: true, data: rows });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    });
};
