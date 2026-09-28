<template>
  <div class="shell" :class="{ 'shell--open': open }">
    <aside class="sidebar">
      <div class="brand">
        <strong>飞筝</strong>
        <span>运营后台</span>
      </div>
      <nav>
        <div v-for="group in navGroups" :key="group.label" class="group">
          <p>{{ group.label }}</p>
          <router-link
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              :class="{ active: isNavActive(route.path, item.to) }"
              @click="open = false"
          >{{ item.title }}</router-link>
        </div>
      </nav>
    </aside>
    <div class="main">
      <header class="topbar">
        <button type="button" class="menu" @click="open = !open">菜单</button>
        <h1>{{ title }}</h1>
        <div class="user">
          <span>{{ userName }}</span>
          <button type="button" @click="logout">退出</button>
        </div>
      </header>
      <div class="content">
        <router-view />
      </div>
    </div>
    <button v-if="open" type="button" class="backdrop" @click="open = false" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { isNavActive, navGroups, pageTitle } from '@/nav.js'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const open = ref(false)
const title = computed(() => pageTitle(route.path))
const userName = computed(() => authStore.user?.nickname || authStore.user?.email || '员工')

const logout = async () => {
  await authStore.logout()
  await router.push('/login')
}
</script>

<style scoped>
.shell { display: flex; min-height: 100vh; background: #f4f6f8; color: #111827; }
.sidebar {
  width: 232px;
  background: #111827;
  color: #d1d5db;
  padding: 20px 14px;
  flex-shrink: 0;
  min-height: 100vh;
  overflow-y: auto;
}
.brand { padding: 4px 10px 20px; }
.brand strong { display: block; color: #fff; font-size: 18px; }
.brand span { color: #9ca3af; font-size: 12px; }
.group { margin-bottom: 18px; }
.group p {
  margin: 0 10px 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b7280;
}
.group a {
  display: block;
  padding: 8px 10px;
  border-radius: 8px;
  color: #d1d5db;
  text-decoration: none;
  font-size: 14px;
}
.group a:hover { background: #1f2937; color: #fff; }
.group a.active { background: #2563eb; color: #fff; }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.topbar {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  gap: 12px;
}
.topbar h1 { margin: 0; font-size: 16px; font-weight: 600; }
.menu { display: none; }
.user { display: flex; align-items: center; gap: 10px; color: #6b7280; font-size: 13px; }
.user button {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
.content { flex: 1; }
.backdrop { display: none; }
@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 20;
    transform: translateX(-100%);
    transition: transform 0.2s;
  }
  .shell--open .sidebar { transform: none; }
  .menu { display: inline-flex; }
  .backdrop {
    display: block;
    position: fixed;
    inset: 0;
    border: 0;
    background: rgba(17, 24, 39, 0.35);
    z-index: 15;
  }
}
</style>
