// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

import Home from "@/views/Home.vue";

import {useAuthStore} from "@/stores/auth.js";


const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
        meta: { requiresAuth: true }
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue') // Lazy loading
    },
    {
        path: '/user-orders',
        name: 'user-orders',
        component: () => import('@/views/Orders.vue'),
        meta: { requiresAuth: true } // Protected route
    },
    {
        path: '/user-orders/:id',
        name: 'user-order-detail',
        component: () => import('@/views/OrderDetail.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/users',
        name: 'users',
        component: () => import('@/views/Users.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/users/:id',
        name: 'user-detail',
        component: () => import('@/views/UserDetail.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/scrapper-orders',
        name: 'scrapper-orders',
        component: () => import('@/views/ScrapperOrders.vue'),
        meta: { requiresAuth: true } // Protected route
    },
    {
        path: '/withdrawals',
        name: 'Zelle出款',
        component: () => import('@/views/Withdrawals.vue'),// Lazy loading
        meta: { requiresAuth: true }
    },
    {
        path: '/wechat-article',
        name: 'wechat-article',
        component: () => import('@/views/WechatArticle.vue'),
        meta: { requiresAuth: true } // Protected route
    },
    {
        path: '/manual-orders',
        name: 'manual-orders',
        component: () => import('@/views/ManualOrders.vue'),
        meta: { requiresAuth: true } // Protected route
    },
    {
        path: '/user-appeals',
        name: 'user-appeals',
        component: () => import('@/views/Appeals.vue'),
        meta: { requiresAuth: true } // Protected route
    },
    {
        path: '/staff',
        name: 'Staff',
        component: () => import('@/views/StaffManagement.vue'),
        meta: { requiresAuth: true } // Protected route
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/NotFound.vue')
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    // Optional: scroll behavior
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        } else {
            return { top: 0 }
        }
    }
})

// Navigation Guard - Protect routes
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();

    // 🌟 If the app hasn't checked the cookie yet, wait for it!
    if (!authStore.initialized) {
        await authStore.checkAuth();
    }

    const isAuthenticated = !!authStore.user;

    if (to.meta.requiresAuth && !isAuthenticated) {
        // Not logged in? Sent to login page
        next('/login');
    } else if (to.path === '/login' && isAuthenticated) {
        // Already logged in? Redirect away from login page to dashboard
        next('/');
    } else {
        // Let navigation pass through smoothly
        next();
    }
});

export default router