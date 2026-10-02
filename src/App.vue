<script setup>
import Toast from "@/components/Toast.vue";
const mockMode = import.meta.env.VITE_USE_MOCK === 'true'
</script>

<template>
  <Toast />
  <p v-if="mockMode" class="mock-banner">前端预览：数据是模拟的，没有连接服务器，也没有改动小程序。</p>
  <router-view />
</template>

<style>
html, body, #app { margin: 0; min-height: 100%; }
body {
  font-family: "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
  font-weight: 400;
  background: #f4f6f8;
}
button, input, select, textarea { font-family: inherit; }
h1, h2, h3, h4 { font-family: inherit; font-weight: 600; }
</style>
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
