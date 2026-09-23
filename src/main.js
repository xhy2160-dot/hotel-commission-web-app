// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from '@/stores/auth';

const app = createApp(App);

app.use(createPinia());
// ⚠️ Don't let the router take control until we verify the session
app.use(router);

const authStore = useAuthStore();
app.config.globalProperties.$imgBaseUrl = 'https://miniapp2.flyingkite.site/static/images/'
// 🚀 Boot Checklist: Wait for the API check before attaching the app to the DOM
authStore.checkAuth().then(() => {
    app.mount('#app');
});
