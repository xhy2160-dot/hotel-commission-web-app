import { defineStore } from 'pinia';
import {loginPost,authMeGet} from "@/api/index.js";

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        loading: false,
        error: null,
        initialized: false
    }),

    getters: {
        isAuthenticated: (state) => !!state.user
    },

    actions: {
        async login(formdata) {
            this.loading = true;
            this.error = null;
            try {
                const response = await loginPost(formdata);
                console.log(response);
                this.user = response.user; // Store user details (name, email, role)
                return true;
            } catch (err) {
                console.log(err);
                this.error = err.response?.data?.message || 'Login failed';
                return false;
            } finally {
                this.loading = false;
            }
        },
        async checkAuth() {
            try {
                const response = await authMeGet();
                console.log(response);
                this.user = response.user; // Session restored!
            } catch (error) {
                this.user = null; // Token was missing/expired
            } finally {
                this.initialized = true; // App routing is now safe to resolve
            }
        },
        async logout() {
            try {
                await api.post('/auth/logout');
            } catch (err) {
                console.error('Logout error', err);
            } finally {
                this.user = null; // Clear state regardless of backend success
            }
        }
    }
});

