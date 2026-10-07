export const navGroups = [
  {
    label: '概览',
    items: [
      { to: '/', title: '运营看板' },
    ],
  },
  {
    label: '业务',
    items: [
      { to: '/users', title: '用户' },
      { to: '/user-orders', title: '酒店订单' },
      { to: '/hotel-groups', title: '集团订单' },
      { to: '/scrapper-orders', title: '爬虫订单' },
    ],
  },
  {
    label: '资金',
    items: [
      { to: '/withdrawals', title: '提现' },
      { to: '/stats', title: '经营统计' },
      { to: '/manual-orders', title: '手动返现' },
    ],
  },
  {
    label: '增长',
    items: [
      { to: '/promotions', title: '推广追踪' },
    ],
  },
  {
    label: '客服',
    items: [
      { to: '/user-appeals', title: '申诉' },
      { to: '/wechat-article', title: '公众号' },
    ],
  },
  {
    label: '系统',
    items: [
      { to: '/staff', title: '员工账号' },
    ],
  },
]

export function pageTitle(path) {
  if (path.startsWith('/promotions/')) return '推广详情'
  if (path.startsWith('/users/')) return '用户详情'
  if (path.startsWith('/user-orders/')) return '订单详情'
  if (path.startsWith('/hotel-groups')) return '集团订单'
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.to === path) return item.title
    }
  }
  return '飞筝'
}

export function isNavActive(path, to) {
  if (to === '/') return path === '/'
  return path === to || path.startsWith(`${to}/`)
}
