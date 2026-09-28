import { ref } from 'vue';
import { defineStore } from 'pinia';
import {searchScraperOrders} from '@/api/index.js';

export const useOrderStore = defineStore('order', () => {
    // State
    const order = ref({});
    const orders = ref([]);
    const loading = ref(false);
    const error = ref(null);

    // Actions
    const fetchScraperOrdersByConfirmNo = async (query) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await searchScraperOrders(query);
            orders.value = response.data || [];
            return orders.value;
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    };


    return {
        // State
        order,
        orders,
        loading,
        error,
        // Actions
        fetchScraperOrdersByConfirmNo,
    };
});