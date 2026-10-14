import { classifyHotel, hotelNameOf } from '@/utils/hotelGroups.js'

const EXCEPTION_ALIASES = {
  nc: 'no-comm',
  non_commission: 'no-comm',
  'non-commission': 'no-comm',
  noncommission: 'no-comm',
  '非返现订单': 'no-comm',
  '非返现': 'no-comm',
  na: 'cancelled',
  cancel: 'cancelled',
  cancelled: 'cancelled',
  '已取消': 'cancelled',
  ns: 'no-show',
  no_show: 'no-show',
  'no-show': 'no-show',
  noshow: 'no-show',
  '未入住': 'no-show',
}

function text(value) {
  return String(value ?? '').trim()
}

function day(value) {
  const raw = text(value)
  return raw ? raw.slice(0, 10) : ''
}

function guestNameOf(user = {}) {
  return text(user.legal_name) || text(user.name) || text(user.nickname) || ''
}

function exceptionStatusOf(order = {}, appeal = {}) {
  const candidates = [
    order.commission_status,
    order.txn,
    order.exception_status,
    order.exception,
    order.status_label,
    order.scraper_status,
    order.remark,
    appeal.exception_status,
  ]
  for (const candidate of candidates) {
    const raw = text(candidate)
    if (!raw) continue
    const key = raw.toLowerCase().replace(/[\s_]+/g, '_')
    if (EXCEPTION_ALIASES[raw] || EXCEPTION_ALIASES[key] || EXCEPTION_ALIASES[raw.toLowerCase()]) {
      return EXCEPTION_ALIASES[raw] || EXCEPTION_ALIASES[key] || EXCEPTION_ALIASES[raw.toLowerCase()]
    }
    if (/no[-_ ]?comm/i.test(raw)) return 'no-comm'
    if (/^[A-Za-z][A-Za-z0-9 _/-]{1,32}$/.test(raw)) return raw
  }
  return ''
}

export function appealOrderOf(appeal = {}) {
  return appeal.order && typeof appeal.order === 'object' ? appeal.order : {}
}

export function appealUserOf(appeal = {}) {
  return appeal.user && typeof appeal.user === 'object' ? appeal.user : {}
}

export function buildAppealEmail(appeal = {}, extras = {}) {
  const order = { ...appealOrderOf(appeal), ...extras.order }
  const user = { ...appealUserOf(appeal), ...extras.user }
  const hotelName = hotelNameOf(order) || text(appeal.hotel_name_cn) || text(appeal.hotel_name)
  const classified = classifyHotel(hotelName)
  const group = classified.groupId === 'unmatched' ? '' : (classified.groupNameEn || classified.groupName)
  const guest = guestNameOf(user)
  const checkIn = day(order.check_in_date || appeal.check_in_date)
  const checkOut = day(order.check_out_date || appeal.check_out_date)
  const confirmation = text(order.confirmation_num || appeal.confirmation_num || appeal.confirm_num || appeal.order_no)
  const exception = exceptionStatusOf(order, appeal)

  const groupLabel = group || '[Hotel Group]'
  const hotelLabel = hotelName || '[Hotel Name]'
  const guestLabel = guest || '[Guest Name]'
  const checkInLabel = checkIn || '[Check-in]'
  const checkOutLabel = checkOut || '[Check-out]'
  const confirmationLabel = confirmation || '[Confirmation Number]'
  const exceptionLabel = exception || '[exception status]'

  const body = [
    'Greetings,',
    '',
    'I trust this message finds you well.',
    '',
    `We are Shenzhen Feizheng Ticketing Co., Ltd. (IATA: 08368345), one of ${groupLabel}’s agency partners. We are writing regarding a recent stay at the ${hotelLabel} booked under our agency details.`,
    '',
    `Our client, ${guestLabel}, stayed from ${checkInLabel}, to ${checkOutLabel}, with Confirmation Number ${confirmationLabel}. Please note that at the time of booking, we provided our IATA number in the reservation details, which should have been reflected in the reservation record.`,
    '',
    `For your reference, we have attached the guest folio, which clearly confirms the stay. In light of this, please review the reservation, which currently appears in our system as “${exceptionLabel}”.`,
    '',
    'We sincerely appreciate your kind assistance and look forward to your confirmation.',
    '',
    'Kind regards,',
  ].join('\n')

  const subject = [group, 'Commission review', hotelName, confirmation].filter(Boolean).join(' – ')
  return {
    subject: subject || 'Commission review',
    body,
    group,
    hotelName,
    guest,
    checkIn,
    checkOut,
    confirmation,
    exception,
  }
}
