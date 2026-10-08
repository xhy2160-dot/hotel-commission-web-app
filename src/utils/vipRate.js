export function hasVipRate(rate) {
  return rate !== null && rate !== undefined && rate !== ''
}

export function readVipLevels(res) {
  const data = res?.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return []
}

export function attachCurrentVip(user, vipLevels = []) {
  if (!user) return user
  const vip = vipLevels.find((row) => Number(row.id) === Number(user.vip_id))
    || vipLevels.find((row) => row.vip_name && row.vip_name === user.vip_name)
  if (!vip) return user
  return {
    ...user,
    vip_name: user.vip_name || vip.vip_name,
    rebate_rate: hasVipRate(user.rebate_rate) ? user.rebate_rate : vip.rebate_rate,
  }
}
