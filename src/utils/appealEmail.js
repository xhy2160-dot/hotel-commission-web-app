import { classifyHotel, hotelNameOf } from '@/utils/hotelGroups.js'

const EXCEPTION_ALIASES = {
  nc: 'no-comm',
  non_commission: 'no-comm',
  'non-commission': 'no-comm',
  noncommission: 'no-comm',
  'non-commissionable': 'no-comm',
  noncommissionable: 'no-comm',
  '非返现订单': 'no-comm',
  '非返现': 'no-comm',
  na: 'cancelled',
  cancel: 'cancelled',
  cancelled: 'cancelled',
  canceled: 'cancelled',
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function markManual(placeholder) {
  return `<strong><em><u>${escapeHtml(placeholder)}</u></em></strong>`
}

function slot(value, placeholder) {
  const filled = text(value)
  return filled ? escapeHtml(filled) : markManual(placeholder)
}

function mapException(value) {
  const raw = text(value)
  if (!raw) return ''
  const key = raw.toLowerCase().replace(/[\s_]+/g, '_')
  if (EXCEPTION_ALIASES[raw] || EXCEPTION_ALIASES[key] || EXCEPTION_ALIASES[raw.toLowerCase()]) {
    return EXCEPTION_ALIASES[raw] || EXCEPTION_ALIASES[key] || EXCEPTION_ALIASES[raw.toLowerCase()]
  }
  if (/no[-_ ]?comm/i.test(raw)) return 'no-comm'
  return ''
}

export function exceptionStatusOf(order = {}, appeal = {}, scraper = {}) {
  const candidates = [
    order.commission_status,
    order.txn,
    order.exception_status,
    order.exception,
    scraper.txn,
    scraper.commission_status,
    scraper.exception_status,
    appeal.exception_status,
  ]
  for (const candidate of candidates) {
    const mapped = mapException(candidate)
    if (mapped) return mapped
  }
  return ''
}

export function pickScraperHit(rows, confirmation) {
  const list = Array.isArray(rows) ? rows : []
  const needle = text(confirmation).toLowerCase()
  const confirmOf = (row) => text(row.confirmation || row.confirmation_number || row.confirmation_num).toLowerCase()
  return list.find((row) => needle && confirmOf(row) === needle)
    || list.find((row) => mapException(row.txn || row.commission_status || row.exception_status))
    || null
}

export function appealOrderOf(appeal = {}) {
  return appeal.order && typeof appeal.order === 'object' ? appeal.order : {}
}

export function appealUserOf(appeal = {}) {
  return appeal.user && typeof appeal.user === 'object' ? appeal.user : {}
}

function composeLines({ group, hotel, guest, checkIn, checkOut, confirmation, exception }) {
  return [
    'Greetings,',
    '',
    'I trust this message finds you well.',
    '',
    `We are Shenzhen Feizheng Ticketing Co., Ltd. (IATA: 08368345), one of ${group}’s agency partners. We are writing regarding a recent stay at the ${hotel} booked under our agency details.`,
    '',
    `Our client, ${guest}, stayed from ${checkIn}, to ${checkOut}, with Confirmation Number ${confirmation}. Please note that at the time of booking, we provided our IATA number in the reservation details, which should have been reflected in the reservation record.`,
    '',
    `For your reference, we have attached the guest folio, which clearly confirms the stay. In light of this, please review the reservation, which currently appears in our system as “${exception}”.`,
    '',
    'We sincerely appreciate your kind assistance and look forward to your confirmation.',
    '',
    'Kind regards,',
  ]
}

export function buildAppealEmail(appeal = {}, extras = {}) {
  const order = { ...appealOrderOf(appeal), ...extras.order }
  const hotelName = hotelNameOf(order) || text(appeal.hotel_name_cn) || text(appeal.hotel_name)
  const classified = classifyHotel(hotelName)
  const group = classified.groupId === 'unmatched' ? '' : (classified.groupNameEn || classified.groupName)
  const checkIn = day(order.check_in_date || appeal.check_in_date)
  const checkOut = day(order.check_out_date || appeal.check_out_date)
  const confirmation = text(order.confirmation_num || appeal.confirmation_num || appeal.confirm_num || appeal.order_no)
  const exception = exceptionStatusOf(order, appeal, extras.scraper)

  const html = {
    group: slot(group, '[Hotel Group]'),
    hotel: slot(hotelName, '[Hotel Name]'),
    guest: markManual('[Guest Name]'),
    checkIn: slot(checkIn, '[Check-in]'),
    checkOut: slot(checkOut, '[Check-out]'),
    confirmation: slot(confirmation, '[Confirmation Number]'),
    exception: slot(exception, '[exception status]'),
  }
  const plain = {
    group: group || '[Hotel Group]',
    hotel: hotelName || '[Hotel Name]',
    guest: '[Guest Name]',
    checkIn: checkIn || '[Check-in]',
    checkOut: checkOut || '[Check-out]',
    confirmation: confirmation || '[Confirmation Number]',
    exception: exception || '[exception status]',
  }

  const subject = [group, 'Commission review', hotelName, confirmation].filter(Boolean).join(' – ')
  return {
    subject: subject || 'Commission review',
    body: composeLines(plain).join('\n'),
    bodyHtml: composeLines(html).join('<br>'),
    group,
    hotelName,
    guest: '',
    checkIn,
    checkOut,
    confirmation,
    exception,
  }
}
