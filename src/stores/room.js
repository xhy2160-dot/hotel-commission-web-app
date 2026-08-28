import { defineStore } from 'pinia';
import {getAllRooms} from "@/api/index.js";


export const useRoomStore = defineStore('rooms', {
    state: () => ({
        rooms: [],
        roomSelected:{},
        loading: false,
        error: null
    }),

    getters: {
        getRoomsByLocation: (state) => (location) => {
            return state.rooms.find(room => room.location === location);
        }
    },

    actions: {
        async fetchRooms() {
            this.loading = true;
            try {
                const response = await getAllRooms();
                console.log(response);
                this.rooms = response || [];
            } catch (error) {
                this.error = error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        },
        setRoomSelected(room) {
            this.roomSelected = room;
        }

        // async createStaff(data) {
        //     try {
        //         const response = addStaff( data);
        //         this.staff.push(response.data);
        //         return response.data;
        //     } catch (error) {
        //         throw error;
        //     }
        // },
        //
        // async updateStaff(id,data) {
        //     console.log(data)
        //     try {
        //         const response = await updateStaffPost(data);
        //         const index = this.staff.findIndex(staff => staff.id === id);
        //         if (index !== -1) {
        //             this.staff[index] = { ...this.staff[index], ...response.data.data };
        //         }
        //         return response.data;
        //     } catch (error) {
        //         throw error;
        //     }
        // },
        //
        // async deleteStaff(id) {
        //     try {
        //         await api.delete(`/staff/${id}`);
        //         this.staff = this.staff.filter(staff => staff.id !== id);
        //     } catch (error) {
        //         throw error;
        //     }
        // }
    }
});