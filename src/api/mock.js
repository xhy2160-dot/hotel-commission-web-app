import { inDayRange } from '@/utils/range.js'

// Preview stand-ins only. Live admin reads site2_app_vip_level.

const vipLevels = [
  { id: 1, vip_name: '普通会员', rebate_rate: 0.05 },
  { id: 2, vip_name: '银卡', rebate_rate: 0.08 },
  { id: 3, vip_name: '金卡', rebate_rate: 0.1 },
]

const users = [
  { id: 8, legal_name: '林可', nickname: 'kiki', registered_at: '2026-03-11 14:02:00', vip_id: 3, status: 'active', inviter_id: null },
  { id: 12, legal_name: '陈晓', nickname: '晓晓', registered_at: '2026-04-02 09:12:00', vip_id: 2, status: 'active', inviter_id: 8 },
  { id: 19, legal_name: '王磊', nickname: '磊磊', registered_at: '2026-06-18 16:40:00', vip_id: 1, status: 'active', inviter_id: 12 },
  { id: 27, legal_name: '赵敏', nickname: '敏敏', registered_at: '2026-08-09 11:05:00', vip_id: 1, status: 'inactive', inviter_id: null },
]

function commissionSnapshot(lines, rebateRate) {
  const calc_lines = lines.map((line) => {
    const cny = Math.round((Number(line.amount) / Number(line.fx_rate)) * 100) / 100
    return { ...line, cny: cny.toFixed(2) }
  })
  const commission = calc_lines.reduce((sum, line) => sum + Number(line.cny), 0)
  const amount = Math.round(commission * rebateRate * 100) / 100
  return {
    calc_lines,
    commission_cny: commission.toFixed(2),
    amount: amount.toFixed(2),
    rebate_rate: rebateRate,
    has_snapshot: true,
  }
}

const orders = [
  {
    id: 101,
    order_no: 'FZ20260906001',
    user_id: 12,
    confirmation_num: '3374032874',
    hotel_name_cn: '上海静安香格里拉',
    check_in_date: '2026-09-02',
    check_out_date: '2026-09-05',
    status: 2,
    remark: '',
    appeal_id: null,
    createdAt: '2026-09-06T02:18:00.000Z',
    submitted_at: '2026-09-06 10:18:00',
    source: '小程序',
    cashback_date: '2026-09-12',
    calculated_at: '2026-09-06 10:20:11',
    ...commissionSnapshot([
      { source: 'ONYX', amount: '14.00', currency: 'USD', fx_rate: '0.14' },
      { source: 'TACS', amount: '7.00', currency: 'USD', fx_rate: '0.14' },
    ], 0.08),
  },
  {
    id: 102,
    order_no: 'FZ20260912008',
    user_id: 12,
    confirmation_num: '8841209931',
    hotel_name_cn: '东京帝国酒店',
    check_in_date: '2026-09-10',
    check_out_date: '2026-09-12',
    status: 1,
    remark: '已匹配 ONYX',
    appeal_id: null,
    createdAt: '2026-09-12T06:02:00.000Z',
    submitted_at: '2026-09-12 14:02:00',
    source: '小程序',
    cashback_date: '2026-09-19',
    calculated_at: '2026-09-12 14:06:40',
    ...commissionSnapshot([
      { source: 'ONYX', amount: '2000', currency: 'JPY', fx_rate: '20' },
    ], 0.08),
  },
  {
    id: 88,
    order_no: 'FZ20260502014',
    user_id: 8,
    confirmation_num: '220198334',
    hotel_name_cn: '香港丽思卡尔顿',
    check_in_date: '2026-05-01',
    check_out_date: '2026-05-03',
    status: 2,
    remark: '快照上线前入账',
    appeal_id: 3,
    createdAt: '2026-05-04T01:11:00.000Z',
    submitted_at: '2026-05-04 09:11:00',
    source: '小程序',
    amount: '120.00',
    commission_cny: null,
    rebate_rate: null,
    calc_lines: [],
    cashback_date: null,
    calculated_at: null,
    has_snapshot: false,
  },
  {
    id: 130,
    order_no: 'FZ20260918003',
    user_id: 19,
    confirmation_num: '5519027760',
    hotel_name_cn: '新加坡滨海湾金沙',
    check_in_date: '2026-09-16',
    check_out_date: '2026-09-18',
    status: 0,
    remark: '',
    appeal_id: null,
    createdAt: '2026-09-18T08:40:00.000Z',
    submitted_at: '2026-09-18 16:40:00',
    source: '小程序',
    cashback_date: '2026-09-25',
    calculated_at: '2026-09-18 16:41:02',
    ...commissionSnapshot([
      { source: 'TACS', amount: '9.00', currency: 'SGD', fx_rate: '0.18' },
    ], 0.05),
  },
]

const withdrawals = {
  zelle: [
    {
      id: 1,
      withdraw_no: 'Z20260918001',
      user_id: 12,
      zelle_name: 'Chen Xiao',
      zelle_phone: '13800001111',
      amount: '200.00',
      status: 0,
      pay_remark: '',
      reviewer_staff_id: '',
      paid_at: '',
      create_time: 1789696800,
    },
    {
      id: 2,
      withdraw_no: 'Z20260902007',
      user_id: 8,
      zelle_name: 'Lin Ke',
      zelle_phone: '13900008888',
      amount: '120.00',
      status: 4,
      pay_remark: '已打款',
      reviewer_staff_id: '管理员',
      paid_at: '2026-09-03T03:20:00.000Z',
      create_time: 1788396000,
    },
  ],
  wechat: [
    {
      id: 9,
      out_bill_no: 'WX20260915002',
      user_id: 19,
      real_name: '王磊',
      amount: '80.00',
      status: 0,
      reviewer_staff_id: '',
      paid_at: '',
      created_at: '2026-09-15T04:00:00.000Z',
    },
    {
      id: 10,
      out_bill_no: 'WX20260828011',
      user_id: 12,
      real_name: '陈晓',
      amount: '330.24',
      status: 2,
      reviewer_staff_id: '管理员',
      paid_at: '2026-08-29T02:10:00.000Z',
      created_at: '2026-08-28T09:12:00.000Z',
    },
  ],
}

const appeals = [
  {
    id: 3,
    user_id: 8,
    hotel_order_id: 88,
    confirmation_num: '220198334',
    amount: '120.00',
    status: 1,
    content: '离店后佣金未到账，申请复核',
    reply_content: '已核对，维持原返现',
    create_time: '2026-05-20 11:00:00',
    update_time: '2026-05-21 09:00:00',
    staff: '管理员',
  },
]

function shiftDay(offset, hour = 10) {
  const date = new Date()
  date.setHours(hour, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  const pad = (num) => String(num).padStart(2, '0')
  const text = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(hour)}:00:00`
  return { text, ymd: text.slice(0, 10), unix: Math.floor(date.getTime() / 1000) }
}

const todayStamp = shiftDay(0, 9)
const yesterdayStamp = shiftDay(-1, 15)

users.push({
  id: 41,
  legal_name: '周宁',
  nickname: '宁宁',
  registered_at: todayStamp.text,
  vip_id: 1,
  status: 'active',
  inviter_id: 12,
})

orders.push(
  {
    id: 201,
    order_no: 'FZ-TODAY-01',
    user_id: 41,
    confirmation_num: '9900112233',
    hotel_name_cn: '北京国贸大酒店',
    check_in_date: todayStamp.ymd,
    check_out_date: todayStamp.ymd,
    status: 1,
    remark: '',
    appeal_id: 9,
    createdAt: new Date(todayStamp.unix * 1000).toISOString(),
    submitted_at: todayStamp.text,
    source: '小程序',
    cashback_date: todayStamp.ymd,
    calculated_at: todayStamp.text,
    ...commissionSnapshot([
      { source: 'ONYX', amount: '10.00', currency: 'CNY', fx_rate: '1' },
    ], 0.05),
  },
  {
    id: 200,
    order_no: 'FZ-YDAY-01',
    user_id: 12,
    confirmation_num: '9900112200',
    hotel_name_cn: '广州四季酒店',
    check_in_date: yesterdayStamp.ymd,
    check_out_date: yesterdayStamp.ymd,
    status: 0,
    remark: '',
    appeal_id: null,
    createdAt: new Date(yesterdayStamp.unix * 1000).toISOString(),
    submitted_at: yesterdayStamp.text,
    source: '小程序',
    cashback_date: yesterdayStamp.ymd,
    calculated_at: yesterdayStamp.text,
    ...commissionSnapshot([
      { source: 'ONYX', amount: '14.00', currency: 'USD', fx_rate: '0.14' },
    ], 0.08),
  },
)

withdrawals.zelle.push({
  id: 3,
  withdraw_no: 'Z-TODAY-01',
  user_id: 41,
  zelle_name: 'Zhou Ning',
  zelle_phone: 'zelle-zhouning',
  amount: '0.50',
  status: 0,
  pay_remark: '',
  reviewer_staff_id: '',
  paid_at: '',
  create_time: todayStamp.unix,
})

appeals.push({
  id: 9,
  user_id: 41,
  hotel_order_id: 201,
  confirmation_num: '9900112233',
  amount: '0.50',
  status: 0,
  content: '希望尽快审核返现',
  reply_content: '',
  create_time: todayStamp.text,
  update_time: todayStamp.text,
  staff: '',
})

const staffList = [
  { id: 1, nickname: '管理员', email: 'admin@flyingkite.site', phone: '16800000000', role: 'Manager', status: 1 },
  { id: 2, nickname: '客服小周', email: 'zhou@flyingkite.site', phone: '16800000002', role: 'Staff', status: 1 },
]

const mockUser = { id: 1, nickname: '管理员', email: 'admin@flyingkite.site', role: 'Manager' }

function vipOf(id) {
  return vipLevels.find((item) => item.id === Number(id)) || null
}

function userOf(id) {
  return users.find((item) => item.id === Number(id)) || null
}

function decorateUser(user) {
  const vip = vipOf(user.vip_id)
  const ownOrders = orders.filter((order) => order.user_id === user.id)
  const rebateSum = ownOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0)
  const inviter = user.inviter_id ? userOf(user.inviter_id) : null
  return {
    ...user,
    vip_name: vip?.vip_name || '-',
    rebate_rate: vip?.rebate_rate ?? null,
    order_count: ownOrders.length,
    rebate_sum: rebateSum.toFixed(2),
    status_label: user.status === 'active' ? '正常' : '停用',
    inviter,
  }
}

function readParams(params) {
  if (!params) return {}
  if (typeof params.get === 'function') return Object.fromEntries(params.entries())
  return params
}

export const loginPost = async () => ({ user: mockUser })
export const authMeGet = async () => ({ user: mockUser })

export const getVipLevels = async () => ({ data: vipLevels })

export const getAdminUsers = async (params = {}) => {
  const query = readParams(params)
  const keyword = String(query.q || '').trim().toLowerCase()
  const page = Number(query.page || 1)
  const limit = Number(query.limit || 10)
  let list = users.map(decorateUser)
  if (keyword) {
    list = list.filter((user) => [user.id, user.nickname, user.legal_name].join(' ').toLowerCase().includes(keyword))
  }
  if (query.from || query.to) {
    list = list.filter((user) => inDayRange(user.registered_at, query.from, query.to))
  }
  const start = (page - 1) * limit
  return {
    data: list.slice(start, start + limit).map((user) => ({ ...user, status: user.status_label })),
    pagination: { currentPage: page, totalItems: list.length },
  }
}

export const getAdminUserDetail = async (id) => {
  const user = userOf(id)
  if (!user) throw new Error('用户不存在')
  const ownOrders = orders.filter((order) => order.user_id === user.id)
  const ownAppeals = appeals.filter((item) => item.user_id === user.id)
  const ownWithdrawals = [
    ...withdrawals.zelle.filter((item) => item.user_id === user.id).map((item) => ({ ...item, channel: 'zelle' })),
    ...withdrawals.wechat.filter((item) => item.user_id === user.id).map((item) => ({ ...item, channel: 'wechat' })),
  ]
  return {
    data: {
      user: decorateUser(user),
      vip_levels: vipLevels,
      orders: ownOrders,
      rebates: ownOrders.filter((order) => order.has_snapshot),
      withdrawals: ownWithdrawals,
      appeals: ownAppeals,
    },
  }
}

export const updateAdminUser = async (data) => {
  const user = userOf(data.id)
  if (!user) throw new Error('用户不存在')
  user.vip_id = Number(data.vip_id)
  user.status = data.status
  return { data: decorateUser(user) }
}

export const getUserOrders = async (params) => {
  const query = readParams(params)
  const page = Number(query.page || 1)
  const limit = Number(query.limit || 10)
  let list = orders
  if (query.cashback === '1') {
    list = list.filter((order) => Number(order.status) === 1)
    if (query.from || query.to) {
      list = list.filter((order) => inDayRange(order.submitted_at, query.from, query.to))
    }
  } else if (query.from || query.to) {
    list = list.filter((order) => inDayRange(order.submitted_at, query.from, query.to))
  }
  const start = (page - 1) * limit
  return {
    data: list.slice(start, start + limit),
    pagination: { currentPage: page, totalItems: list.length },
  }
}

export const getOderByConfirm = async (query) => {
  const keyword = String(query?.confirmation || '').trim()
  return { data: orders.filter((order) => order.confirmation_num.includes(keyword)) }
}

export const getOrderDetail = async (id) => {
  const order = orders.find((item) => item.id === Number(id))
  if (!order) throw new Error('订单不存在')
  const user = decorateUser(userOf(order.user_id))
  const appeal = appeals.find((item) => item.hotel_order_id === order.id) || null
  return { data: { order, user, appeal } }
}

export const getWithdrawals = async (params) => {
  const query = readParams(params)
  const type = query.type === 'wechat' ? 'wechat' : 'zelle'
  let list = withdrawals[type]
  if (query.pending === '1') {
    list = list.filter((item) => Number(item.status) === 0)
  }
  if (query.from || query.to) {
    list = list.filter((item) => inDayRange(item.create_time || item.created_at, query.from, query.to))
  }
  return { data: list, pagination: { totalItems: list.length } }
}

function allWithdrawals() {
  return [
    ...withdrawals.zelle.map((item) => ({ ...item, channel: 'zelle', at: item.create_time })),
    ...withdrawals.wechat.map((item) => ({ ...item, channel: 'wechat', at: item.created_at })),
  ]
}

export const getDashboard = async (rangeQuery = {}) => {
  const from = rangeQuery.from
  const to = rangeQuery.to
  const newUsers = users.filter((user) => inDayRange(user.registered_at, from, to))
  const newOrders = orders.filter((order) => inDayRange(order.submitted_at, from, to))
  const cashbackOrders = orders.filter((order) => Number(order.status) === 1 && inDayRange(order.submitted_at, from, to))
  const periodWithdrawals = allWithdrawals().filter((item) => inDayRange(item.at, from, to))
  const pendingWithdrawals = periodWithdrawals.filter((item) => Number(item.status) === 0)
  const periodAppeals = appeals.filter((item) => inDayRange(item.create_time, from, to))
  const pendingAppeals = periodAppeals.filter((item) => Number(item.status) === 0)
  return {
    data: {
      newUsers: newUsers.length,
      newOrders: newOrders.length,
      cashbackOrders: cashbackOrders.length,
      withdrawalApplies: periodWithdrawals.length,
      pendingWithdrawals: pendingWithdrawals.length,
      pendingAppeals: pendingAppeals.length,
    },
  }
}

export const getBusinessStats = async (query = {}) => {
  const from = query.from
  const to = query.to
  const periodOrders = orders.filter((order) => inDayRange(order.submitted_at, from, to))
  const months = new Map()
  for (const order of periodOrders) {
    const month = String(order.submitted_at).slice(0, 7)
    if (!months.has(month)) {
      months.set(month, { month, commission: 0, rebate: 0, payout: 0, orders: 0, users: 0 })
    }
    const row = months.get(month)
    row.commission += Number(order.commission_cny || 0)
    row.rebate += Number(order.amount || 0)
    row.orders += 1
  }
  for (const user of users.filter((item) => inDayRange(item.registered_at, from, to))) {
    const month = String(user.registered_at).slice(0, 7)
    if (!months.has(month)) months.set(month, { month, commission: 0, rebate: 0, payout: 0, orders: 0, users: 0 })
    months.get(month).users += 1
  }
  for (const item of allWithdrawals().filter((row) => inDayRange(row.at, from, to))) {
    const paid = (item.channel === 'zelle' && Number(item.status) === 4) || (item.channel === 'wechat' && Number(item.status) === 2)
    if (!paid) continue
    const stamp = item.paid_at || item.at
    const month = String(stamp).slice(0, 7)
    if (!months.has(month)) continue
    months.get(month).payout += Number(item.amount || 0)
  }
  const monthRows = [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).map((row) => ({
    ...row,
    commission: row.commission.toFixed(2),
    rebate: row.rebate.toFixed(2),
    payout: row.payout.toFixed(2),
    profit: (row.commission - row.rebate).toFixed(2),
  }))
  const vipRows = vipLevels.map((vip) => ({
    vip_name: vip.vip_name,
    rebate_rate: vip.rebate_rate,
    count: users.filter((user) => user.vip_id === vip.id).length,
  }))
  return { data: { months: monthRows, vips: vipRows } }
}

export const updateWithdrawalStatus = async () => ({ data: true })

export const getAppeals = async () => ({ data: appeals })

export const getAllStaff = async () => ({ staffList })

export const getScrapperOrders = async () => ({ data: [], pagination: { totalItems: 0 } })

export const searchScraperOrders = async () => ({ success: true, data: [] })

export const getRecentManualOrders = async () => ({ data: [] })

export const postManualOrder = async () => ({ data: true })

export const addArticlePost = async () => ({ data: true })

export const addStaff = async () => ({ data: true })

export const updateStaffPost = async () => ({ user: staffList[0] })

export const getWithdrawalReviewers = async () => ({ data: staffList })
