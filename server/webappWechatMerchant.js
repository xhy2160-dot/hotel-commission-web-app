/**
 * Read-only WeChat Pay merchant balance for staff /webapp.
 *   require('./webappWechatMerchant')(router);
 *
 * Ordinary merchants get NO_AUTH on /v3/merchant/fund/balance.
 * Fall back to the last fund-flow bill 账户结余 (T+1).
 */
const crypto = require('crypto')
const fs = require('fs')
const https = require('https')
const path = require('path')
const zlib = require('zlib')
const { URL } = require('url')

const ACCOUNT_TYPES = [
    { id: 'OPERATION', label: '运营账户' },
    { id: 'BASIC', label: '基本户' },
    { id: 'FEES', label: '手续费账户' }
]
const BILL_LOOKBACK_DAYS = 21
const CACHE_MS = 15 * 60 * 1000

let cache = { at: 0, data: null }

function loadConfig() {
    const secretsDir = path.join(__dirname, '..', 'secrets')
    let fromFile = {}
    const jsonPath = path.join(secretsDir, 'wechat.json')
    try {
        if (fs.existsSync(jsonPath)) fromFile = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    } catch (_) {}
    const mchid = process.env.WECHAT_MCHID || fromFile.mchid
    const serial = process.env.WECHAT_MCH_SERIAL || fromFile.serial
    const keyPath = process.env.WECHAT_MCH_KEY_PATH || fromFile.keyPath || path.join(secretsDir, 'apiclient_key.pem')
    let key = process.env.WECHAT_MCH_PRIVATE_KEY || fromFile.privateKey
    if (!key && keyPath && fs.existsSync(keyPath)) key = fs.readFileSync(keyPath, 'utf8')
    return { mchid, serial, key }
}

function signRequest(cfg, method, urlPath) {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const nonce = crypto.randomBytes(16).toString('hex')
    const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n\n`
    const signature = crypto.createSign('RSA-SHA256').update(message).sign(cfg.key, 'base64')
    return `WECHATPAY2-SHA256-RSA2048 mchid="${cfg.mchid}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${cfg.serial}",signature="${signature}"`
}

function wechatRequest(cfg, urlPath, accept) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.mch.weixin.qq.com',
            path: urlPath,
            method: 'GET',
            headers: {
                Authorization: signRequest(cfg, 'GET', urlPath),
                Accept: accept || 'application/json',
                'User-Agent': 'flyingkite-webapp'
            }
        }, (res) => {
            const chunks = []
            res.on('data', (chunk) => chunks.push(chunk))
            res.on('end', () => {
                const raw = Buffer.concat(chunks)
                let body = null
                try { body = JSON.parse(raw.toString('utf8')) } catch (_) { body = null }
                resolve({ status: res.statusCode, body, raw })
            })
        })
        req.on('error', reject)
        req.end()
    })
}

function fenToYuan(fen) {
    if (fen === null || fen === undefined || fen === '') return null
    return Math.round(Number(fen)) / 100
}

function maskMchid(mchid) {
    const text = String(mchid || '')
    if (text.length <= 4) return text
    return `${text.slice(0, 2)}****${text.slice(-4)}`
}

function beijingDates(days) {
    const dates = []
    for (let i = 1; i <= days; i++) {
        const date = new Date(Date.now() - i * 86400000)
        dates.push(new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date))
    }
    return dates
}

function parseFundflowBalance(buf) {
    let text = buf
    if (buf[0] === 0x1f && buf[1] === 0x8b) text = zlib.gunzipSync(buf)
    const lines = text.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    if (!lines.length) return null
    const header = lines[0].replace(/`/g, '').split(',')
    const balanceIndex = header.findIndex((col) => col.includes('账户结余'))
    if (balanceIndex < 0) return null
    let last = null
    for (const line of lines.slice(1)) {
        const plain = line.replace(/`/g, '')
        if (plain.startsWith('资金流水总笔数')) break
        const cols = plain.split(',')
        if (cols[balanceIndex] === undefined || cols[balanceIndex] === '') continue
        const amount = Number(cols[balanceIndex])
        if (!Number.isFinite(amount)) continue
        last = amount
    }
    return last
}

async function queryRealtime(cfg) {
    const accounts = []
    for (const type of ACCOUNT_TYPES) {
        const result = await wechatRequest(cfg, `/v3/merchant/fund/balance/${type.id}`)
        if (result.status === 200 && result.body) {
            accounts.push({
                type: type.id,
                label: type.label,
                available: fenToYuan(result.body.available_amount),
                pending: fenToYuan(result.body.pending_amount || 0)
            })
            continue
        }
        const code = result.body && result.body.code
        accounts.push({
            type: type.id,
            label: type.label,
            available: null,
            pending: null,
            closed: code === 'INVALID_REQUEST',
            error: (result.body && (result.body.message || result.body.code)) || `HTTP ${result.status}`
        })
    }
    return accounts
}

async function queryLatestBill(cfg, accountType, dates) {
    for (const date of dates) {
        const apply = await wechatRequest(cfg, `/v3/bill/fundflowbill?bill_date=${date}&account_type=${accountType}`)
        if (apply.status !== 200 || !apply.body || !apply.body.download_url) continue
        let urlPath = apply.body.download_url
        try {
            const parsed = new URL(apply.body.download_url)
            urlPath = `${parsed.pathname}${parsed.search}`
        } catch (_) {}
        const file = await wechatRequest(cfg, urlPath, '*/*')
        if (file.status !== 200) continue
        const balance = parseFundflowBalance(file.raw)
        if (balance === null) continue
        return { date, balance }
    }
    return null
}

async function queryFromBills(cfg) {
    const dates = beijingDates(BILL_LOOKBACK_DAYS)
    const accounts = []
    for (const type of ACCOUNT_TYPES) {
        const found = await queryLatestBill(cfg, type.id, dates)
        accounts.push({
            type: type.id,
            label: type.label,
            available: found ? found.balance : null,
            pending: null,
            as_of: found ? found.date : null,
            source: found ? 'fundflowbill' : undefined
        })
    }
    return accounts
}

function noAuth(accounts) {
    return accounts.length && accounts.every((item) => item.error === 'NO_AUTH' || String(item.error || '').includes('没有使用该接口的权限'))
}

async function loadBalance(cfg) {
    if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data
    const realtime = await queryRealtime(cfg)
    const usableRealtime = realtime.find((item) => item.available !== null)
    if (usableRealtime) {
        const data = {
            mchid: maskMchid(cfg.mchid),
            queried_at: new Date().toISOString(),
            available: usableRealtime.available,
            pending: usableRealtime.pending,
            source: 'realtime',
            accounts: realtime
        }
        cache = { at: Date.now(), data }
        return data
    }
    const bills = noAuth(realtime) ? await queryFromBills(cfg) : realtime
    const usableBill = bills.find((item) => item.available !== null)
    const data = {
        mchid: maskMchid(cfg.mchid),
        queried_at: new Date().toISOString(),
        available: usableBill ? usableBill.available : null,
        pending: usableBill ? usableBill.pending : null,
        as_of: usableBill ? usableBill.as_of : undefined,
        source: usableBill ? 'fundflowbill' : undefined,
        accounts: bills,
        message: usableBill
            ? undefined
            : (noAuth(realtime)
                ? '普通商户没有实时余额查询接口，最近也没有资金账单'
                : (realtime[0] && realtime[0].error))
    }
    cache = { at: Date.now(), data }
    return data
}

module.exports = function registerWechatMerchant(router) {
    router.get('/wechat-merchant/balance', async (req, res) => {
        try {
            const cfg = loadConfig()
            if (!cfg.mchid || !cfg.serial || !cfg.key) {
                return res.status(503).json({ success: false, message: '微信商户凭证未配置' })
            }
            const data = await loadBalance(cfg)
            return res.json({ success: true, data })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message || String(error) })
        }
    })
}
