export const PROMO_PLATFORMS = [
  '微信朋友圈',
  '微信视频号',
  '抖音',
  '小红书',
  '微博',
  'Google',
  'Facebook',
  'Instagram',
  '其他',
]

export const BASELINE_DAYS = 7

export function parseBeijing(value) {
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

export function formatBeijing(value) {
  const date = parseBeijing(value) || new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace(/\//g, '-')
}

export function campaignWindow(startAt, durationDays) {
  const start = parseBeijing(startAt)
  const days = Number(durationDays)
  if (!start || !Number.isFinite(days) || days <= 0) return null
  const end = new Date(start.getTime() + days * 86400000)
  const baselineStart = new Date(start.getTime() - BASELINE_DAYS * 86400000)
  return {
    start,
    end,
    baselineStart,
    startUnix: Math.floor(start.getTime() / 1000),
    endUnix: Math.floor(end.getTime() / 1000),
    baselineStartUnix: Math.floor(baselineStart.getTime() / 1000),
  }
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

export function scorePromo({ extraLeads, expectedLeads, actualLeads, actualAcq, actualCpa }) {
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

export function buildPromoMetrics({
  durationDays,
  amount,
  baselineDailyOverride,
  preLeads = 0,
  preAcq = 0,
  preCpa = 0,
  actualLeads = 0,
  actualAcq = 0,
  actualCpa = 0,
}) {
  const days = Number(durationDays) || 0
  const spend = Number(amount) || 0
  const hasOverride = baselineDailyOverride !== null && baselineDailyOverride !== undefined && baselineDailyOverride !== ''
  const baselineDaily = hasOverride ? Number(baselineDailyOverride) : (BASELINE_DAYS > 0 ? preLeads / BASELINE_DAYS : 0)
  const baselineAcqDaily = BASELINE_DAYS > 0 ? preAcq / BASELINE_DAYS : 0
  const baselineCpaDaily = BASELINE_DAYS > 0 ? preCpa / BASELINE_DAYS : 0
  const expectedLeads = baselineDaily * days
  const expectedAcq = baselineAcqDaily * days
  const expectedCpa = baselineCpaDaily * days
  const extraLeads = actualLeads - expectedLeads
  const extraAcq = actualAcq - expectedAcq
  const extraCpa = actualCpa - expectedCpa
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
    cpl: extraLeads > 0 ? money(spend / extraLeads) : null,
    cac: extraAcq > 0 ? money(spend / extraAcq) : null,
    cpa: extraCpa > 0 ? money(spend / extraCpa) : null,
    score: rating.score,
    score_label: rating.label,
  }
}

export function formatCost(value) {
  if (value === null || value === undefined) return '—'
  return `¥${Number(value).toFixed(2)}`
}
