<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-container">
      <div class="modal-header">
        <h2>Sub-Treatments Workspace (ID: #{{ treatmentId }})</h2>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <div v-if="loading" class="loading-state">
        Loading sub-treatments...
      </div>

      <div v-else class="modal-content">
        <table class="sub-treatments-table">
          <thead>
          <tr>
            <th>Name (Editable)</th>
            <th>Date / Time</th>
            <th>Location & Room</th>
            <th>Staff</th>
            <th>Remarks</th>
            <th>Actions</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="item in subTreatments" :key="item.id">
            <td>
              <input
                  type="text"
                  v-model="item.name"
                  class="inline-input"
                  @change="trackEdit(item)"
              />
            </td>
            <td>
              <div class="datetime-display">
                <span>{{ item.date || 'No Date' }}</span>
                <span class="time-badge">{{ item.time || '--:--' }}</span>
              </div>
            </td>
            <td>
                <span class="location-text">
                  {{ item.location || 'N/A' }}
                  <small v-if="item.room">({{ item.room }})</small>
                </span>
            </td>
            <td>
              <span class="staff-tag">{{ item.staff || 'Unassigned' }}</span>
            </td>
            <td class="remark-cell" :title="item.remark">
              {{ item.remark || '-' }}
            </td>
            <td>
              <button
                  class="save-row-btn"
                  :disabled="!isEdited(item.id)"
                  @click="saveChanges(item)"
              >
                Save
              </button>
            </td>
          </tr>
          <tr v-if="subTreatments.length === 0">
            <td colspan="6" class="empty-state">No sub-treatments found for this record.</td>
          </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-footer">
        <button class="action-btn-secondary" @click="closeModal">Close Workspace</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
// import api from '@/api/axios'; // Adjust this path to your Axios setup package

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  treatmentId: { type: [Number, String], required: true }
});

const emit = defineEmits(['close', 'refresh']);

const subTreatments = ref([]);
const loading = ref(false);
const editedRowIds = ref(new Set());

// Fetch sub-treatments matching the treatment ID
const fetchSubTreatments = async () => {
  // if (!props.treatmentId) return;
  // loading.value = true;
  // try {
  //   const response = await api.get(`/api/sub-treatments?treatment_id=${props.treatmentId}`);
  //   subTreatments.value = response.data;
  //   editedRowIds.value.clear();
  // } catch (error) {
  //   console.error('Failed to load sub-treatments:', error);
  // } finally {
  //   loading.value = false;
  // }
};

// Monitor when modal opens or target context ID switches
watch(() => [props.isOpen, props.treatmentId], ([open, id]) => {
  if (open && id) {
    fetchSubTreatments();
  }
}, { immediate: true });

// Change monitoring tracking functions
const trackEdit = (item) => {
  editedRowIds.value.add(item.id);
};

const isEdited = (id) => {
  return editedRowIds.value.has(id);
};

// Persist the specific updated name back to Express database layer
const saveChanges = async (item) => {
  // try {
  //   await api.put(`/api/sub-treatments/${item.id}`, {
  //     name: item.name
  //   });
  //   editedRowIds.value.delete(item.id);
  //   alert('Name updated successfully!');
  // } catch (error) {
  //   console.error('Failed to update sub-treatment name:', error);
  //   alert('Error saving modifications.');
  // }
};

const closeModal = () => {
  emit('close');
};
</script>

<style scoped>
/* Dark Layout Design Variables */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 23, 42, 0.8); /* Slate tint block overlay */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background-color: #1e293b; /* Deep grey-blue window block */
  border: 1px solid #475569;
  border-radius: 8px;
  width: 85%;
  max-width: 1000px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  color: #f8fafc; /* Crisp white body prose */
}

.modal-header {
  padding: 1.25rem;
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  color: #e2e8f0;
  font-size: 1.25rem;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.75rem;
  cursor: pointer;
}

.close-btn:hover {
  color: #ef4444;
}

.modal-content {
  padding: 1.5rem;
  overflow-y: auto;
}

/* Elegant Custom Table Styling */
.sub-treatments-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.sub-treatments-table th {
  background-color: #0f172a;
  color: #94a3b8;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sub-treatments-table td {
  padding: 1rem;
  border-bottom: 1px solid #334155;
  vertical-align: middle;
}

/* Form Control Inline Integration */
.inline-input {
  background-color: #0f172a;
  border: 1px solid #475569;
  border-radius: 4px;
  color: #fff;
  padding: 0.5rem;
  width: 100%;
  box-sizing: border-box;
}

.inline-input:focus {
  outline: none;
  border-color: #d97706; /* Classic deep gold border engagement */
}

/* Context Element Accents */
.datetime-display {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.time-badge {
  color: #fbbf24; /* Soft Gold structural tracking accent */
  font-size: 0.8rem;
}

.staff-tag {
  background-color: #334155;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

.remark-cell {
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #cbd5e1;
}

/* Buttons and Interaction Framework */
.save-row-btn {
  background-color: #d97706; /* Vibrant Gold Active state */
  color: #0f172a;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.save-row-btn:disabled {
  background-color: #475569;
  color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.6;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #334155;
  display: flex;
  justify-content: flex-end;
  background-color: #0f172a;
}

.action-btn-secondary {
  background: none;
  border: 1px solid #475569;
  color: #cbd5e1;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.action-btn-secondary:hover {
  background-color: #1e293b;
  color: #fff;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
}
</style>