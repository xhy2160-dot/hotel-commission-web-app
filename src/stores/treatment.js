// stores/treatment.js
import { defineStore } from 'pinia';
import { api,addTreatmeantPost, getTreatmentsByCusId } from '@/api/index.js';
import {formatDate} from "@/utils/formatDate.js";

export const useTreatmentStore = defineStore('treatment', {
    state: () => ({
        treatments: [],
        loading: false,
        error: null
    }),

    getters: {
        getTreatmentsByCustomer: (state) => (customerId) => {
            return state.treatments.filter(t => t.customer_id === customerId);
        }
    },

    actions: {
        async fetchTreatmentsByCustomer(customerId) {
            this.loading = true;
            try {
                const response = await getTreatmentsByCusId({customerId});
                console.log(response);
                this.treatments = response.data || [];
                return this.treatments;
            } catch (error) {
                this.error = error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        },
        async fetchTreatmentsByDate(date) {
            this.loading = true;
            try {
                const response = await getTreatmentsByDate({date:formatDate(date)});
                console.log(response);
                this.treatments = response.data || [];
                return this.treatments;
            } catch (error) {
                this.error = error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async createTreatment(data) {
            try {
                const response = await addTreatmeantPost(data);
                this.treatments.push(response.data.data);
                return response.data;
            } catch (error) {
                throw error;
            }
        },

        async updateTreatment(id, data) {
            try {
                const response = await api.put(`/treatments/${id}`, data);
                const index = this.treatments.findIndex(t => t.id === id);
                if (index !== -1) {
                    this.treatments[index] = { ...this.treatments[index], ...response.data.data };
                }
                return response.data;
            } catch (error) {
                throw error;
            }
        },

        async deleteTreatment(id) {
            try {
                await api.delete(`/treatments/${id}`);
                this.treatments = this.treatments.filter(t => t.id !== id);
            } catch (error) {
                throw error;
            }
        }
    }
});