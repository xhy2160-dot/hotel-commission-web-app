/**
 * Read-only WeChat Pay merchant balance for staff /webapp.
 *   require('./webappWechatMerchant')(router);
 *
 * Secrets stay on the server: env vars or ../secrets/wechat.json + apiclient_key.pem
 */
const crypto = require('crypto')
const fs = require('fs')
const https = require('https')
const path = require('path')

const ACCOUNT_TYPES = [
    { id: 'BASIC', label: '基本户' },
    { id: 'OPERATION', label: '运营账户' },
    { id: 'FEES', label: '手续费账户' }
]

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

function wechatGet(cfg, urlPath) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.mch.weixin.qq.com',
            path: urlPath,
            method: 'GET',
            headers: {
                Authorization: signRequest(cfg, 'GET', urlPath),
                Accept: 'application/json',
                'User-Agent': 'flyingkite-webapp'
            }
        }, (res) => {
            let raw = ''
            res.on('data', (chunk) => { raw += chunk })
            res.on('end', () => {
                let body = null
                try { body = raw ? JSON.parse(raw) : null } catch { body = { message: raw } }
                resolve({ status: res.statusCode, body })
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

async function queryAccounts(cfg) {
    const accounts = []
    for (const type of ACCOUNT_TYPES) {
        const result = await wechatGet(cfg, `/v3/merchant/fund/balance/${type.id}`)
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

module.exports = function registerWechatMerchant(router) {
    router.get('/wechat-merchant/balance', async (req, res) => {
        try {
            const cfg = loadConfig()
            if (!cfg.mchid || !cfg.serial || !cfg.key) {
                return res.status(503).json({ success: false, message: '微信商户凭证未配置' })
            }
            const accounts = await queryAccounts(cfg)
            const usable = accounts.find((item) => item.available !== null)
            const denied = accounts.length && accounts.every((item) => item.error === 'NO_AUTH' || String(item.error || '').includes('没有使用该接口的权限'))
            return res.json({
                success: true,
                data: {
                    mchid: maskMchid(cfg.mchid),
                    queried_at: new Date().toISOString(),
                    available: usable ? usable.available : null,
                    pending: usable ? usable.pending : null,
                    accounts,
                    message: denied
                        ? '当前商户号没有使用该接口的权限'
                        : undefined
                }
            })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message || String(error) })
        }
    })
}
