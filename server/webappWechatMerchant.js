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
const EXTRA_DAYS_AFTER_HIT = 7
const CACHE_MS = 15 * 60 * 1000
const REQUEST_TIMEOUT_MS = 12000

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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function wechatRequest(cfg, urlPath, accept, hostname) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: hostname || 'api.mch.weixin.qq.com',
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
        req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('timeout')))
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
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
    const [year, month, day] = today.split('-').map(Number)
    const dates = []
    for (let i = 1; i <= days; i++) {
        dates.push(new Date(Date.UTC(year, month - 1, day - i)).toISOString().slice(0, 10))
    }
    return dates
}

function splitBillColumns(line) {
    const trimmed = line.replace(/^\uFEFF/, '').trim()
    if (!trimmed) return []
    if (trimmed.includes('`')) return trimmed.replace(/^`/, '').split(/,`/)
    return trimmed.split(',')
}

function parseFundflowBalance(buf) {
    let bytes = buf
    if (buf[0] === 0x1f && buf[1] === 0x8b) bytes = zlib.gunzipSync(buf)
    const lines = bytes.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    if (!lines.length) return null
    const header = splitBillColumns(lines[0])
    const balanceIndex = header.findIndex((col) => String(col).includes('账户结余'))
    if (balanceIndex < 0) return null
    let last = null
    for (const line of lines.slice(1)) {
        const cols = splitBillColumns(line)
        if (String(cols[0] || '').startsWith('资金流水总笔数')) break
        if (cols[balanceIndex] === undefined || cols[balanceIndex] === '') continue
        const amount = Number(cols[balanceIndex])
        if (!Number.isFinite(amount)) continue
        last = amount
    }
    return last
}

function isLimited(result) {
    const code = result && result.body && result.body.code
    return result.status === 429 || code === 'FREQUENCY_LIMITED'
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

async function downloadBillBalance(cfg, apply) {
    const parsed = new URL(apply.body.download_url)
    const file = await wechatRequest(cfg, `${parsed.pathname}${parsed.search}`, '*/*', parsed.hostname)
    if (file.status !== 200) return null
    return parseFundflowBalance(file.raw)
}

async function queryBillOnDate(cfg, date, accountType) {
    const urlPath = `/v3/bill/fundflowbill?bill_date=${date}&account_type=${accountType}`
    let apply = await wechatRequest(cfg, urlPath)
    if (isLimited(apply)) {
        await sleep(500)
        apply = await wechatRequest(cfg, urlPath)
    }
    if (isLimited(apply)) return { limited: true, found: null }
    if (apply.status !== 200 || !apply.body || !apply.body.download_url) return { limited: false, found: null }
    const balance = await downloadBillBalance(cfg, apply)
    if (balance === null) return { limited: false, found: null }
    return { limited: false, found: { date, balance } }
}

async function queryFromBills(cfg) {
    const dates = beijingDates(BILL_LOOKBACK_DAYS)
    const found = new Map()
    let limited = false
    let firstHit = -1
    for (let index = 0; index < dates.length; index++) {
        if (firstHit >= 0 && index > firstHit + EXTRA_DAYS_AFTER_HIT) break
        for (const type of ACCOUNT_TYPES) {
            if (found.has(type.id)) continue
            const result = await queryBillOnDate(cfg, dates[index], type.id)
            if (result.limited) limited = true
            if (result.found) {
                found.set(type.id, result.found)
                if (firstHit < 0) firstHit = index
            }
        }
        if (ACCOUNT_TYPES.every((type) => found.has(type.id))) break
    }
    const accounts = ACCOUNT_TYPES.map((type) => {
        const item = found.get(type.id)
        return {
            type: type.id,
            label: type.label,
            available: item ? item.balance : null,
            pending: null,
            as_of: item ? item.date : null,
            source: item ? 'fundflowbill' : undefined
        }
    })
    return { accounts, limited }
}

function noAuth(accounts) {
    return accounts.length && accounts.every((item) => item.error === 'NO_AUTH' || String(item.error || '').includes('没有使用该接口的权限'))
}

function packRealtime(cfg, realtime) {
    const usable = realtime.find((item) => item.available !== null)
    return {
        mchid: maskMchid(cfg.mchid),
        queried_at: new Date().toISOString(),
        available: usable.available,
        pending: usable.pending,
        source: 'realtime',
        accounts: realtime
    }
}

function packBills(cfg, bills, realtime) {
    const usable = bills.find((item) => item.available !== null)
    return {
        mchid: maskMchid(cfg.mchid),
        queried_at: new Date().toISOString(),
        available: usable ? usable.available : null,
        pending: usable ? usable.pending : null,
        as_of: usable ? usable.as_of : undefined,
        source: usable ? 'fundflowbill' : undefined,
        accounts: bills,
        message: usable
            ? undefined
            : (noAuth(realtime)
                ? '普通商户没有实时余额查询接口，最近也没有资金账单'
                : (realtime[0] && realtime[0].error))
    }
}

async function loadBalance(cfg) {
    if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data
    const realtime = await queryRealtime(cfg)
    if (realtime.find((item) => item.available !== null)) {
        const data = packRealtime(cfg, realtime)
        cache = { at: Date.now(), data }
        return data
    }
    if (!noAuth(realtime)) {
        const data = packBills(cfg, realtime, realtime)
        cache = { at: Date.now(), data }
        return data
    }
    const { accounts, limited } = await queryFromBills(cfg)
    const data = packBills(cfg, accounts, realtime)
    if (data.available !== null || !limited) cache = { at: Date.now(), data }
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
