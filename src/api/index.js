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
    return await get('/orders/get_order_by_confirm',query);
}
//withdrawals
export const getWithdrawals = async (query) => {
    return await get('/withdrawals/get-withdrawals',query);
}
//appeals
export const getAppeals  = async (query) => {
    return await get('/appeals/get-appeals',query);
}
export const api =()=>{}