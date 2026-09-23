<script setup>
import Toast from "@/components/Toast.vue";
const mockMode = import.meta.env.VITE_USE_MOCK === 'true'
</script>

<template>
  <Toast />
  <p v-if="mockMode" class="mock-banner">前端预览：数据是模拟的，没有连接服务器，也没有改动小程序。</p>
  <router-view />
</template>

<style scoped>
.mock-banner {
  margin: 0;
  padding: 8px 16px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 13px;
  text-align: center;
}
</style>
