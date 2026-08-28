<template>
  <div v-if="roomStore.roomSelected.isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-container">

      <div class="modal-header">
        <h2>{{ isEditMode ? 'Modify Appointment Details' : 'Schedule New Appointment' }}</h2>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <div class="modal-content">
        <div class="context-banner">
          <div class="context-item">
            <span class="label">Location Location:</span>
            <span class="value-tag">{{ roomStore.roomSelected.location }}</span>
          </div>
          <div class="context-item">
            <span class="label">Assigned Room:</span>
            <span class="value">{{ roomStore.roomSelected.roomName }}</span>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="booking-form">

          <div class="form-group row-span">
            <label class="form-label">Patient Search <span class="required">*</span></label>

            <div v-if="selectedPatient" class="selected-patient-card">
              <div class="patient-info">
                <strong>{{ selectedPatient.name }}</strong>
                <span>{{ selectedPatient.phone }} · {{ selectedPatient.email }}</span>
              </div>
              <button v-if="!isEditMode" type="button" class="remove-patient-btn" @click="clearPatientSelection">Change</button>
            </div>

            <div v-else class="search-combobox-wrapper">
              <input
                  type="text"
                  v-model="searchQuery"
                  placeholder="Search by patient name, phone, or email..."
                  class="form-input search-input"
                  @input="handlePatientSearch"
              />

              <ul v-if="searchResults.length > 0" class="search-results-dropdown">
                <li
                    v-for="patient in searchResults"
                    :key="patient.id"
                    @click="selectPatient(patient)"
                >
                  <div class="search-row-main">{{ patient.name }}</div>
                  <div class="search-row-sub">{{ patient.phone }} | {{ patient.email }}</div>
                </li>
              </ul>
              <div v-if="searchQuery && searchResults.length === 0 && !searching" class="no-results-hint">
                No matching patients found.
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Assigned Staff Provider <span class="required">*</span></label>
            <select v-model="form.staff" class="form-input" required>
              <option value="" disabled>Select Staff Member</option>
              <option v-for="member in staffOptions" :key="member" :value="member">
                {{ member }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Appointment Date <span class="required">*</span></label>
            <input type="date" v-model="form.date" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label">Start Time <span class="required">*</span></label>
            <input type="time" v-model="form.time" class="form-input" required />
          </div>

          <div class="form-group full-width">
            <label class="form-label">Special Remarks / Notes</label>
            <textarea
                v-model="form.remark"
                placeholder="Add clinical constraints, treatment requirements, or check-in notes..."
                class="form-textarea"
                rows="3"
            ></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="closeModal">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="!selectedPatient || !form.staff">
              {{ isEditMode ? 'Save Changes' : 'Confirm Appointment' }}
            </button>
          </div>

        </form>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue';
import { useRoomStore } from "@/stores/room.js";

const props = defineProps({
  selectedAppointment: { type: Object, default: null }
});

const emit = defineEmits(['close', 'saved']);
const roomStore = useRoomStore();

// Determine Mode Context safely from props context
const isEditMode = computed(() => !!props.selectedAppointment);

// Internal State Control Engines
const searchQuery = ref('');
const searchResults = ref([]);
const searching = ref(false);
const selectedPatient = ref(null);

const staffOptions = ref(['Dr. Alex Mercer', 'Dr. Sarah Jenkins', 'Nurse Practitioner Chen', 'Therapist Vance']);

const form = reactive({
  staff: '',
  date: '',
  time: '',
  remark: ''
});

// 🌟 FIX: Watch the living store proxy path for modal toggles
watch(() => [roomStore.roomSelected.isOpen, props.selectedAppointment], ([open, appointment]) => {
  if (open) {
    if (appointment) {
      selectedPatient.value = {
        id: appointment.patient_id,
        name: appointment.patient_name || 'Selected Patient',
        phone: appointment.patient_phone || '',
        email: appointment.patient_email || ''
      };
      form.staff = appointment.staff || '';
      form.date = appointment.date || '';
      form.time = appointment.time || '';
      form.remark = appointment.remark || '';
    } else {
      // resetForm();
    }
  }
}, { immediate: true });

const handlePatientSearch = async () => {
  if (searchQuery.value.trim().length < 2) {
    searchResults.value = [];
    return;
  }
  searching.value = true;
  // Your API call logic goes here...
};

const selectPatient = (patient) => {
  selectedPatient.value = patient;
  searchQuery.value = '';
  searchResults.value = [];
};

const clearPatientSelection = () => {
  selectedPatient.value = null;
};

const resetForm = () => {
  selectedPatient.value = null;
  searchQuery.value = '';
  searchResults.value = [];
  form.staff = '';
  form.date = '';
  form.time = '';
  form.remark = '';
};

// 🌟 FIX: Close the modal by cleanly shifting the state flag inside your store structure
const closeModal = () => {
  roomStore.roomSelected.isOpen = false;
  emit('close');
};

const handleSubmit = async () => {
  // 🌟 FIX: Read context metadata parameters securely straight from store properties
  const payload = {
    room_id: roomStore.roomSelected.id,
    location: roomStore.roomSelected.location,
    patient_id: selectedPatient.value.id,
    staff: form.staff,
    date: form.date,
    time: form.time,
    remark: form.remark
  };

  try {
    // Axios persistence pipelines go here...
    emit('saved');
    closeModal();
  } catch (error) {
    console.error('Database payload persistence execution failed:', error);
    alert('An execution error prevented saving this reservation context node.');
  }
};
</script>
<style scoped>
/* Modal overlay layout with clean light blur backdrop settings */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background-color: rgba(15, 23, 42, 0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 1100;
  backdrop-filter: blur(2px);
}

/* Modal Window - Clean Light Theme Layout Structure Canvas */
.modal-container {
  background-color: #ffffff;
  border-radius: 8px;
  width: 90%; max-width: 600px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  color: #0f172a; /* Off-black */
  display: flex; flex-direction: column;
  border: 1px solid #e2e8f0;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex; justify-content: space-between; align-items: center;
  background-color: #f8fafc;
  border-radius: 8px 8px 0 0;
}

.modal-header h2 { font-size: 1.15rem; color: #1e3a8a; margin: 0; font-weight: 600; }
.close-btn { background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; }
.close-btn:hover { color: #ef4444; }

.modal-content { padding: 1.5rem; }

/* Location banner context styles matching your light-bluish preferences */
.context-banner {
  background-color: #eff6ff; /* Soft sky-blue tint */
  border: 1px solid #bfdbfe;  /* Crisp light blue border layout */
  border-radius: 6px;
  padding: 0.75rem 1rem;
  display: flex; gap: 2rem;
  margin-bottom: 1.25rem;
}

.context-item { display: flex; flex-direction: row; font-size: 0.85rem; }
.context-item .label { color: #475569; font-weight: 500; margin-left: 3px;}
.context-item .value { color: #0f172a; font-weight: 600; margin-left: 3px; }
.context-item .value-tag { color: #1d4ed8; font-weight: 700; font-size: 0.9rem; }

/* Input field mechanics structural layouts */
.booking-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.full-width { grid-column: span 2; }
.row-span { grid-column: span 2; position: relative; }

.form-group { display: flex; flex-direction: column; gap: 0.35rem; }
.form-label { font-size: 0.85rem; font-weight: 600; color: #334155; }
.required { color: #ef4444; margin-left: 2px; }

.form-input, .form-textarea {
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #0f172a;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  width: 100%; box-sizing: border-box;
}

.form-input:focus, .form-textarea:focus {
  outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

/* Patient Search Box/Card Elements */
.selected-patient-card {
  background-color: #f1f5f9; border: 1px solid #cbd5e1;
  padding: 0.6rem 0.8rem; border-radius: 6px;
  display: flex; justify-content: space-between; align-items: center;
}
.patient-info { display: flex; flex-direction: column; font-size: 0.85rem; }
.patient-info strong { color: #0f172a; }
.patient-info span { color: #64748b; }
.remove-patient-btn { background: none; border: 1px solid #64748b; color: #475569; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer; }
.remove-patient-btn:hover { background-color: #e2e8f0; color: #0f172a; }

/* Dropdown list execution nodes */
.search-combobox-wrapper { position: relative; }
.search-results-dropdown {
  position: absolute; top: 100%; left: 0; right: 0;
  background-color: #ffffff; border: 1px solid #cbd5e1;
  border-radius: 6px; max-height: 200px; overflow-y: auto;
  z-index: 1200; list-style: none; padding: 0; margin: 4px 0 0 0;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
.search-results-dropdown li { padding: 0.6rem 0.8rem; cursor: pointer; border-bottom: 1px solid #f1f5f9; }
.search-results-dropdown li:hover { background-color: #f1f5f9; }
.search-row-main { font-size: 0.85rem; font-weight: 600; color: #0f172a; }
.search-row-sub { font-size: 0.75rem; color: #64748b; }
.no-results-hint { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; font-style: italic; }

/* Button Layout Triggers */
.form-actions {
  grid-column: span 2;
  display: flex; justify-content: flex-end; gap: 0.75rem;
  margin-top: 1rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;
}

.btn-primary {
  background-color: #2563eb; color: white; border: none;
  padding: 0.5rem 1.25rem; border-radius: 6px; font-weight: 600; cursor: pointer;
}
.btn-primary:hover:not(:disabled) { background-color: #1d4ed8; }
.btn-primary:disabled { background-color: #94a3b8; cursor: not-allowed; opacity: 0.6; }

.btn-secondary {
  background: none; border: 1px solid #cbd5e1; color: #475569;
  padding: 0.5rem 1.25rem; border-radius: 6px; font-weight: 500; cursor: pointer;
}
.btn-secondary:hover { background-color: #f8fafc; color: #0f172a; }
</style>