import {get, post} from './http.js';

export const loginPost = async (formData) => {
    return await post('/login', formData);
}

export const authMeGet = async () => {
    return await get('/auth/me');
}

//staff
export const getAllStaff = async (formData) => {
    return await get('/get-all-staff');
}

export const addStaff = async (formData) => {
    return await post('/staff/add', formData);
}

export const updateStaffPost = async (formData) => {
    return await post('/staff/update', formData);
}
//WeChat article
export const addArticlePost = async (formData) => {
    return await post('/article/add', formData);
}
//orders
export const getRecentManualOrders = async () => {
    return await get('/orders/get-recent-manual-orders');
}

export const postManualOrder=async (formData) => {
    return await post('/orders/add-manual-order', formData);
}

export const getUserOrders  = async (params) => {
    return await get('/orders/get-orders', params);
}
export const getOderByConfirm = async (query) => {
    return await get('/orders/get-order-by-confirm',query);
}
export const getScrapperOrders = async (query) => {
    return await get('/orders/get-scraper-orders',query);
}
export const searchScraperOrders= async (query) => {
    return await get('/orders/search-scraper-orders',query);
}
//withdrawals
export const getWithdrawals = async (query) => {
    return await get('/withdrawals/get-withdrawals',query);
}
export const updateWithdrawalStatus = async (data) => {
    return await post('/withdrawals/update-withdrawal-status',data);
}
//appeals
export const getAppeals  = async (query) => {
    return await get('/appeals/get-appeals',query);
}

export const getVipLevels = async () => {
    return await get('/vip-levels');
}

export const getAdminUsers = async (params) => {
    return await get('/users', params);
}

export const getAdminUserDetail = async (id) => {
    return await get('/users/detail', { id });
}

export const updateAdminUser = async (data) => {
    return await post('/users/update', data);
}

export const getOrderDetail = async (id) => {
    return await get('/orders/detail', { id });
}

export const getWithdrawalReviewers = async () => {
    return await get('/withdrawals/reviewers');
}

export const api =()=>{}