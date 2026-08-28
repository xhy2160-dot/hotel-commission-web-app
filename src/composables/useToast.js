// composables/useToast.js
import { ref } from 'vue';

const toasts = ref([]);

export const useToast = () => {
    const showToast = (message, type = 'info') => {
        const id = Date.now();
        toasts.value.push({ id, message, type });

        setTimeout(() => {
            toasts.value = toasts.value.filter(t => t.id !== id);
        }, 3000);
    };

    return {
        toasts,
        showToast
    };
};