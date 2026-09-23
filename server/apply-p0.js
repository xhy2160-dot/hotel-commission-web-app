/**
 * Idempotent server patch for the admin P0 work.
 * Run on the Windows host from this file:
 *   node apply-p0.js "C:\\Users\\Administrator\\Server\\Hotel_comission"
 */
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || 'C:\\Users\\Administrator\\Server\\Hotel_comission';

function read(file) {
    return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
    fs.writeFileSync(file, text, 'utf8');
    console.log('updated', file);
}

function edit(file, mutator) {
    const original = read(file);
    const crlf = original.includes('\r\n');
    const next = mutator(original.replace(/\r\n/g, '\n'));
    write(file, crlf ? next.replace(/\n/g, '\r\n') : next);
}

async function ensureColumns() {
    require('dotenv').config({ path: path.join(root, '.env') });
    const mysql = require(path.join(root, 'node_modules', 'mysql2', 'promise'));
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });
    const alters = [
        ['site2_user_orders', 'rebate_rate', 'ALTER TABLE site2_user_orders ADD COLUMN rebate_rate DECIMAL(10,4) NULL'],
        ['site2_user_orders', 'commission_cny', 'ALTER TABLE site2_user_orders ADD COLUMN commission_cny DECIMAL(12,2) NULL'],
        ['site2_user_orders', 'calc_detail', 'ALTER TABLE site2_user_orders ADD COLUMN calc_detail TEXT NULL'],
        ['site2_user_orders', 'rebate_calculated_at', 'ALTER TABLE site2_user_orders ADD COLUMN rebate_calculated_at DATETIME NULL'],
        ['site_user_withdraw_apply', 'reviewer_staff_id', 'ALTER TABLE site_user_withdraw_apply ADD COLUMN reviewer_staff_id INT NULL'],
        ['site_user_withdraw_apply', 'paid_at', 'ALTER TABLE site_user_withdraw_apply ADD COLUMN paid_at DATETIME NULL']
    ];
    for (const [table, column, sql] of alters) {
        const [rows] = await conn.query(
            'SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [process.env.DB_NAME, table, column]
        );
        if (Number(rows[0].c) === 0) {
            await conn.query(sql);
            console.log('added', table + '.' + column);
        } else {
            console.log('exists', table + '.' + column);
        }
    }
    await conn.end();
}

function patchModel() {
    const file = path.join(root, 'models', 'site2userorder.js');
    edit(file, (text) => {
        if (!text.includes('rebate_rate')) {
            const anchor = '  }, {\n    sequelize,';
            const fields = [
                '    rebate_rate: DataTypes.DECIMAL(10, 4),',
                '    commission_cny: DataTypes.DECIMAL(12, 2),',
                '    calc_detail: DataTypes.TEXT,',
                '    rebate_calculated_at: DataTypes.DATE'
            ].join('\n');
            if (!text.includes(anchor)) throw new Error('order model anchor not found');
            text = text.replace(anchor, fields + '\n' + anchor);
        }
        if (!text.includes('defaultScope')) {
            text = text.replace(
                'underscored: true,',
                "underscored: true,\n    defaultScope: {\n      attributes: { exclude: ['rebate_rate', 'commission_cny', 'calc_detail', 'rebate_calculated_at'] }\n    },"
            );
        }
        return text;
    });
}

function patchFx() {
    const file = path.join(root, 'utils', 'FXtoCNY.js');
    let text = read(file);
    if (text.includes('FXtoCNYDetail')) {
        console.log('fx detail already present');
        return;
    }
    const replacement = `export const FXtoCNYDetail = async (amount, currency) => {
    if (!amount || isNaN(amount)) {
        return { cny: 0, rate: null, currency: String(currency || '').toUpperCase() };
    }

    const uppercaseCurrency = String(currency || '').toUpperCase();
    if (uppercaseCurrency === 'CNY') {
        return { cny: Number(amount), rate: 1, currency: 'CNY' };
    }

    const data = await fetchRates();
    let rate = null;

    if (Array.isArray(data)) {
        const match = data.find(item => item.quote === uppercaseCurrency);
        rate = match ? match.rate : null;
    } else if (data?.rates) {
        const entry = data.rates[uppercaseCurrency];
        rate = typeof entry === 'object' ? entry?.rate : entry;
    }

    if (!rate || rate <= 0) {
        throw new Error(\`Unsupported or missing exchange rate for currency: \${uppercaseCurrency}\`);
    }

    const cny = Math.round((Number(amount) / rate) * 100) / 100;
    return { cny, rate: Number(rate), currency: uppercaseCurrency };
};

export const FXtoCNY = async (amount, currency) => {
    const detail = await FXtoCNYDetail(amount, currency);
    return detail.cny;
};
`;
    const start = text.indexOf('export const FXtoCNY');
    if (start < 0) throw new Error('FXtoCNY export not found');
    text = text.slice(0, start) + replacement;
    write(file, text);
}

function patchStatusUpdate() {
    const file = path.join(root, 'utils', 'statusUpdate.js');
    edit(file, (text) => {
    text = text.replace(
        "const { FXtoCNY } = require('./FXtoCNY')",
        "const { FXtoCNYDetail } = require('./FXtoCNY')"
    );
    if (text.includes('ADMIN_P0_SNAPSHOT')) {
        return text;
    }
    const start = text.indexOf('let orderCommissionCNY = 0;');
    const amountAt = text.indexOf('amount: orderCommissionCNY,', start);
    const endRel = text.indexOf('}, { transaction: t });', amountAt);
    if (start < 0 || amountAt < 0 || endRel < 0) {
        throw new Error('approveOrders block not found');
    }
    const end = endRel + '}, { transaction: t });'.length;
    const block = `const calcLines = []; // ADMIN_P0_SNAPSHOT
            let commissionCnyBeforeRebate = 0;

            for (const onyx of onyxMatches) {
                const rawAmount = parseFloat(onyx.commission_amount) || 0;
                const detail = await FXtoCNYDetail(rawAmount, onyx.commission_currency);
                commissionCnyBeforeRebate += detail.cny;
                calcLines.push({
                    source: 'ONYX',
                    amount: rawAmount,
                    currency: detail.currency,
                    fx_rate: detail.rate,
                    cny: detail.cny
                });
            }

            for (const tacs of tacsMatches) {
                const rawAmount = parseFloat(tacs.paid_amt) || parseFloat(tacs.amount) || 0;
                const detail = await FXtoCNYDetail(rawAmount, tacs.paid_curr || tacs.payment_curr);
                commissionCnyBeforeRebate += detail.cny;
                calcLines.push({
                    source: 'TACS',
                    amount: rawAmount,
                    currency: detail.currency,
                    fx_rate: detail.rate,
                    cny: detail.cny
                });
            }

            const orderCommissionCNY = Number((commissionCnyBeforeRebate * rebateRate).toFixed(2));

            if (orderCommissionCNY > 0) {
                await order.update({
                    amount: orderCommissionCNY,
                    status: 2,
                    rebate_rate: rebateRate,
                    commission_cny: Number(commissionCnyBeforeRebate.toFixed(2)),
                    calc_detail: JSON.stringify(calcLines),
                    rebate_calculated_at: new Date()
                }, { transaction: t });`;
    text = text.slice(0, start) + block + text.slice(end);
    return text;
    });
}

function patchWebApp() {
    const file = path.join(root, 'routes', 'webApp.js');
    edit(file, (text) => {
        if (!text.includes('webappAdminExtras')) {
            text = text.replace(
                'module.exports = router;',
                "require('./webappAdminExtras')(router);\n\nmodule.exports = router;"
            );
        }
        if (!text.includes('reviewer_staff_id')) {
            text = text.replace(
                'const { id, status, remark } = req.body;',
                'const { id, status, remark } = req.body;\n        const reviewerStaffId = req.user && req.user.id ? req.user.id : null;'
            );
            text = text.replace(
                'withdrawal.status = 4;\n            withdrawal.pay_remark = remark;',
                'withdrawal.status = 4;\n            withdrawal.pay_remark = remark;\n            withdrawal.reviewer_staff_id = reviewerStaffId;\n            withdrawal.paid_at = new Date();'
            );
            text = text.replace(
                'withdrawal.status = 5;\n            withdrawal.pay_remark = remark;',
                'withdrawal.status = 5;\n            withdrawal.pay_remark = remark;\n            withdrawal.reviewer_staff_id = reviewerStaffId;'
            );
        }
        return text;
    });
}

function copyExtras() {
    const source = path.join(__dirname, 'webappAdminExtras.js');
    const target = path.join(root, 'routes', 'webappAdminExtras.js');
    fs.copyFileSync(source, target);
    console.log('copied', target);
}

async function main() {
    console.log('root', root);
    await ensureColumns();
    patchModel();
    patchFx();
    patchStatusUpdate();
    copyExtras();
    patchWebApp();
    console.log('apply-p0 done');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
