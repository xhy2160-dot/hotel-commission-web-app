// stores/customer.js
import { defineStore } from 'pinia';
import { api, AddCustomerPost , getCustomersByQuery} from '@/api/index.js';

export const useCustomerStore = defineStore('customer', {
    state: () => ({
        customers: [],
        customer: {},
        loading: false,
        error: null
    }),

    actions: {
        async searchCustomers(query) {
            this.loading = true;
            this.error = null; // Clear previous errors
            try {
                const response = await getCustomersByQuery( {query});
                // FIX: Update your store's state so components can watch it reactively
                this.customers = response.data || [];
                return this.customers;
            } catch (error) {
                this.error = error.response?.data?.message || error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async addNewCustomer(data) {
            this.loading = true;
            this.error = null;
            try {
                const response = await AddCustomerPost(data);
                this.customer = response.data;

                // Push new customer to the local array list if it's already fetched
                this.customers.push(response.data);

                return response;
            } catch (error) {
                this.error = error.response?.data?.message || error.message;
                throw error;
            } finally {
                this.loading = false; // FIX: Ensures loading turns false even if API fails
            }
        },

        async fetchCustomerById(id) {
            this.loading = true;
            this.error = null;
            try {
                const response = await api.get(`/customers/${id}`);
                // FIX: Store the active single customer in state
                this.customer = response.data.data;
                return this.customer;
            } catch (error) {
                this.error = error.response?.data?.message || error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        }
    }
});