import axios from 'axios'

const baseURL = '/webapp'

// 1. Create Axios Instance (Removed fixed Content-Type)
const http = axios.create({
    baseURL,
    withCredentials: true // Automatically send cookies across requests
})

// Request Interceptor
http.interceptors.request.use(
    config => {
        // Axios will automatically set:
        // - 'application/json' for JS Objects
        // - 'multipart/form-data; boundary=...' for FormData
        return config
    },
    error => {
        console.error('请求错误:', error)
        return Promise.reject(error)
    }
)

// Response Interceptor
http.interceptors.response.use(
    response => {
        const res = response.data

        // Handle business logic errors
        if (res.code && res.code !== 0) {
            if (res.code === 401) {
                console.warn('未登录或登录已过期')
            }
            return Promise.reject(new Error(res.message || '请求失败'))
        }

        return res
    },
    error => {
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    console.warn('未授权，请重新登录')
                    break
                case 403:
                    console.warn('没有权限访问')
                    break
                case 404:
                    console.warn('请求资源不存在')
                    break
                case 500:
                    console.warn('服务器内部错误')
                    break
                default:
                    console.warn(`HTTP ${error.response.status}: ${error.message}`)
            }
        } else if (error.request) {
            console.warn('网络异常，请检查网络连接')
        } else {
            console.warn('请求配置错误:', error.message)
        }

        return Promise.reject(error)
    }
)

// Wrapper Methods (withCredentials is already inherited from instance)
export const get = (url, params = {}, config = {}) => {
    return http.get(url, { params, ...config })
}

export const post = (url, data = {}, config = {}) => {
    return http.post(url, data, config)
}

export const put = (url, data = {}, config = {}) => {
    return http.put(url, data, config)
}

export const del = (url, params = {}, config = {}) => {
    return http.delete(url, { params, ...config })
}

export const patch = (url, data = {}, config = {}) => {
    return http.patch(url, data, config)
}

export default http