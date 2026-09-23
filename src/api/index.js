import { get, post } from './http.js'
import * as mock from './mock.js'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const pick = (mockFn, liveFn) => (...args) => (useMock ? mockFn(...args) : liveFn(...args))

export const loginPost = pick(mock.loginPost, (formData) => post('/login', formData))
export const authMeGet = pick(mock.authMeGet, () => get('/auth/me'))

export const getAllStaff = pick(mock.getAllStaff, () => get('/get-all-staff'))
export const addStaff = pick(mock.addStaff, (formData) => post('/staff/add', formData))
export const updateStaffPost = pick(mock.updateStaffPost, (formData) => post('/staff/update', formData))

export const addArticlePost = pick(mock.addArticlePost, (formData) => post('/article/add', formData))

export const getRecentManualOrders = pick(mock.getRecentManualOrders, () => get('/orders/get-recent-manual-orders'))
export const postManualOrder = pick(mock.postManualOrder, (formData) => post('/orders/add-manual-order', formData))
export const getUserOrders = pick(mock.getUserOrders, (params) => get('/orders/admin-list', params))
export const getOderByConfirm = pick(mock.getOderByConfirm, (query) => get('/orders/admin-list', query))
export const getScrapperOrders = pick(mock.getScrapperOrders, (query) => get('/orders/get-scraper-orders', query))
export const searchScraperOrders = pick(mock.searchScraperOrders, (query) => get('/orders/search-scraper-orders', query))

export const getWithdrawals = pick(mock.getWithdrawals, (query) => get('/withdrawals/admin-list', query))
export const updateWithdrawalStatus = pick(mock.updateWithdrawalStatus, (data) => post('/withdrawals/update-withdrawal-status', data))
export const getWithdrawalReviewers = pick(mock.getWithdrawalReviewers, () => get('/withdrawals/reviewers'))

export const getAppeals = pick(mock.getAppeals, (query) => get('/appeals/get-appeals', query))

export const getVipLevels = pick(mock.getVipLevels, () => get('/vip-levels'))
export const getAdminUsers = pick(mock.getAdminUsers, (params) => get('/users', params))
export const getAdminUserDetail = pick(mock.getAdminUserDetail, (id) => get('/users/detail', { id }))
export const updateAdminUser = pick(mock.updateAdminUser, (data) => post('/users/update', data))
export const getOrderDetail = pick(mock.getOrderDetail, (id) => get('/orders/detail', { id }))
export const getDashboard = pick(mock.getDashboard, (query) => get('/dashboard', query))
export const getBusinessStats = pick(mock.getBusinessStats, (query) => get('/stats', query))

export const api = () => {}
