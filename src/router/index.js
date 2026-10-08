import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
  },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Home', component: Home },
      { path: 'stats', name: 'stats', component: () => import('@/views/Stats.vue') },
      { path: 'promotions', name: 'promotions', component: () => import('@/views/Promotions.vue') },
      { path: 'promotions/:id', name: 'promotion-detail', component: () => import('@/views/PromotionDetail.vue') },
      { path: 'user-orders', name: 'user-orders', component: () => import('@/views/Orders.vue') },
      { path: 'user-orders/:id', name: 'user-order-detail', component: () => import('@/views/OrderDetail.vue') },
      { path: 'hotel-groups', name: 'hotel-groups', component: () => import('@/views/HotelGroups.vue') },
      { path: 'users', name: 'users', component: () => import('@/views/Users.vue') },
      { path: 'users/:id', name: 'user-detail', component: () => import('@/views/UserDetail.vue') },
      { path: 'scrapper-orders', name: 'scrapper-orders', component: () => import('@/views/ScrapperOrders.vue') },
      { path: 'withdrawals', name: 'withdrawals', component: () => import('@/views/Withdrawals.vue') },
      { path: 'wechat-article', name: 'wechat-article', component: () => import('@/views/WechatArticle.vue') },
      { path: 'manual-orders', name: 'manual-orders', component: () => import('@/views/ManualOrders.vue') },
      { path: 'user-appeals', name: 'user-appeals', component: () => import('@/views/Appeals.vue') },
      { path: 'staff', name: 'Staff', component: () => import('@/views/StaffManagement.vue') },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  if (!authStore.initialized) await authStore.checkAuth()
  const isAuthenticated = !!authStore.user
  if (to.matched.some((record) => record.meta.requiresAuth) && !isAuthenticated) next('/login')
  else if (to.path === '/login' && isAuthenticated) next('/')
  else next()
})

export default router
