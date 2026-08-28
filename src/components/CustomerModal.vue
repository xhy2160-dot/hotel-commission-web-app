<template>
  <div v-if="visible" class="modal-overlay" @click="close">
    <div class="modal modal-lg" @click.stop>
      <div class="modal-header">
        <div>
          <h3 class="modal-title">
            {{ mode === 'create' ? 'Add New Customer' : 'Edit Customer' }}
          </h3>
          <p class="modal-subtitle">
            {{ mode === 'create' ? 'Enter customer details to add them to the system' : 'Update customer information' }}
          </p>
        </div>
        <button @click="close" class="modal-close" type="button">×</button>
      </div>

      <form @submit.prevent="submitForm" class="modal-form">
        <div class="form-grid">
          <div class="form-column">
            <div class="form-group">
              <label class="form-label">
                Full Name <span class="required">*</span>
              </label>
              <input
                  v-model="form.name"
                  type="text"
                  required
                  class="form-input"
                  placeholder="e.g., John Doe"
                  :class="{ 'form-input-error': errors.name }"
              />
              <span v-if="errors.name" class="form-error">{{ errors.name }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">
                Email <span class="required">*</span>
              </label>
              <input
                  v-model="form.email"
                  type="email"
                  required
                  class="form-input"
                  placeholder="john@example.com"
                  :class="{ 'form-input-error': errors.email }"
              />
              <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">
                Phone <span class="required">*</span>
              </label>
              <input
                  v-model="form.phone"
                  type="tel"
                  required
                  class="form-input"
                  placeholder="+1 234 567 890"
                  :class="{ 'form-input-error': errors.phone }"
              />
              <span v-if="errors.phone" class="form-error">{{ errors.phone }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Preferred Location<span class="required">*</span></label>
              <select v-model="form.preferred_location" class="form-select" required>
                <option value="5075 Yonge St #600, Richmond Hill">5075 Yonge st #600</option>
                <option value="Richmond Hill: #32, 280 West Beaver Creek Rd, Richmond Hill, ON L4B 3B1">Richmond Hill: #32</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Preferred Doctor</label>
              <input
                  v-model="form.preferred_doctor"
                  type="text"
                  class="form-input"
                  placeholder="e.g., Dr. Sarah Johnson"
              />
            </div>
          </div>

          <div class="form-column">
            <div class="form-group">
              <label class="form-label">Preferred Day</label>
              <select v-model="form.preferred_day" class="form-select">
                <option value="">Select preferred day</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Preferred Time</label>
              <input
                  v-model="form.preferred_time"
                  type="time"
                  class="form-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">
                Preferred Contact <span class="required">*</span>
              </label>
              <div class="radio-group">
                <label class="radio-option">
                  <input
                      v-model="form.preferred_contact"
                      type="radio"
                      value="email"
                  />
                  <span class="radio-label">📧 Email</span>
                </label>
                <label class="radio-option">
                  <input
                      v-model="form.preferred_contact"
                      type="radio"
                      value="phone"
                  />
                  <span class="radio-label">📞 Phone</span>
                </label>
                <label class="radio-option">
                  <input
                      v-model="form.preferred_contact"
                      type="radio"
                      value="text"
                  />
                  <span class="radio-label">💬 Text</span>
                </label>
              </div>
              <span v-if="errors.preferred_contact" class="form-error">{{ errors.preferred_contact }}</span>
            </div>

            <div class="form-group" v-if="mode === 'edit'">
              <label class="form-label">Status</label>
              <select v-model="form.status" class="form-select">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea
                  v-model="form.notes"
                  class="form-textarea"
                  rows="3"
                  placeholder="Any additional notes about this customer..."
              ></textarea>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" @click="close" class="btn-cancel">
            Cancel
          </button>
          <button type="submit" :disabled="loading" class="btn-submit">
            <span v-if="loading" class="spinner-small"></span>
            {{ loading ? 'Saving...' : (mode === 'create' ? 'Add Customer' : 'Save Changes') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onUnmounted } from 'vue';
import { useCustomerStore } from '@/stores/customer';
import { useToast } from '@/composables/useToast';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'create',
    validator: (value) => ['create', 'edit'].includes(value)
  },
  customerData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'success']);

const customerStore = useCustomerStore();
const { showToast } = useToast();

const loading = ref(false);
const errors = reactive({
  name: '',
  email: '',
  phone: '',
  preferred_contact: ''
});

// FIXED: Default state location value matches selectable option value perfectly
const defaultForm = {
  name: '',
  email: '',
  phone: '',
  preferred_location: '5075 Yonge St #600, Richmond Hill',
  preferred_doctor: '',
  preferred_day: '',
  preferred_time: '',
  preferred_contact: 'email',
  status: 'active',
  notes: ''
};

const form = reactive({ ...defaultForm });

watch(
    () => props.customerData,
    (newData) => {
      if (props.mode === 'edit' && newData) {
        Object.assign(form, {
          name: newData.name || '',
          email: newData.email || '',
          phone: newData.phone || '',
          preferred_location: newData.preferred_location || '5075 Yonge St #600, Richmond Hill',
          preferred_doctor: newData.preferred_doctor || '',
          preferred_day: newData.preferred_day || '',
          preferred_time: newData.preferred_time || '',
          preferred_contact: newData.preferred_contact || 'email',
          status: newData.status || 'active',
          notes: newData.notes || ''
        });
      } else {
        Object.assign(form, defaultForm);
      }
    },
    { immediate: true, deep: true }
);

watch(
    () => props.visible,
    (newVal) => {
      if (newVal && props.mode === 'create') {
        Object.assign(form, defaultForm);
      }
      if (!newVal) {
        clearErrors();
      }
    }
);

const validateForm = () => {
  let isValid = true;
  clearErrors();

  if (!form.name || form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
    isValid = false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email || !emailRegex.test(form.email)) {
    errors.email = 'Please enter a valid email address';
    isValid = false;
  }

  const phoneCleaned = form.phone.replace(/\D/g, '');
  if (!form.phone || phoneCleaned.length < 10 || phoneCleaned.length > 15) {
    errors.phone = 'Phone number must be between 10 and 15 digits';
    isValid = false;
  }

  if (!form.preferred_contact) {
    errors.preferred_contact = 'Please select a preferred contact method';
    isValid = false;
  }

  return isValid;
};

const clearErrors = () => {
  Object.keys(errors).forEach(key => {
    errors[key] = '';
  });
};

const submitForm = async () => {
  if (!validateForm()) {
    showToast('Please fix the errors in the form', 'warning');
    return;
  }

  loading.value = true;
  try {
    const submitData = {
      name: form.name.trim(),
      email: form.email.toLowerCase().trim(),
      phone: form.phone.trim(),
      preferred_location: form.preferred_location,
      preferred_doctor: form.preferred_doctor || null,
      preferred_day: form.preferred_day || null,
      preferred_time: form.preferred_time || null,
      preferred_contact: form.preferred_contact,
      status: form.status,
      notes: form.notes || null
    };

    let response;

    if (props.mode === 'create') {
      response = await customerStore.addNewCustomer(submitData);
      showToast('Customer added successfully!', 'success');
    } else {
      response = await customerStore.updateCustomer(props.customerData.id, submitData);
      showToast('Customer updated successfully!', 'success');
    }
    emit('success', response);
    close();
  } catch (error) {
    console.error('Error saving customer:', error);

    if (error.response?.status === 409) {
      const message = error.response.data.message || '';
      if (message.toLowerCase().includes('email')) {
        errors.email = 'Email already registered';
      } else if (message.toLowerCase().includes('phone')) {
        errors.phone = 'Phone number already registered';
      } else {
        showToast(message || 'Customer already exists', 'error');
      }
    } else {
      showToast(error.message || 'Failed to save customer', 'error');
    }
  } finally {
    loading.value = false;
  }
};

const close = () => {
  clearErrors();
  emit('close');
};

// FIX 2: Check input types to prevent the escape key from firing during active input
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.visible) {
    const targetTag = e.target?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
      return; // Do nothing if user is editing a field
    }
    close();
  }
};

watch(
    () => props.visible,
    (newVal) => {
      if (newVal) {
        document.addEventListener('keydown', handleKeydown);
      } else {
        document.removeEventListener('keydown', handleKeydown);
      }
    },
    { immediate: true }
);

// Clean up listeners on component teardown
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* Keeping your intact styles intact below here... */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 24px 28px 20px;
  border-bottom: 1px solid #e8eaed;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  background: #fafbfc;
  border-radius: 20px 20px 0 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-title {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.modal-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0 0;
}

.modal-close {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  font-size: 30px;
  cursor: pointer;
  color: #6b7280;
  border-radius: 10px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #1a1a2e;
}

.modal-form {
  padding: 28px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  align-items: start;
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.required {
  color: #ef4444;
}

.form-input,
.form-select,
.form-textarea {
  padding: 10px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s ease;
  background: #fafbfc;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  background: #ffffff;
}

.form-input-error {
  border-color: #ef4444 !important;
}

.form-input-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
}

.form-error {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  cursor: pointer;
}

.radio-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 4px 0;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.radio-option:hover {
  background: #f3f4f6;
}

.radio-option input[type="radio"] {
  width: 18px;
  height: 18px;
  accent-color: #4f46e5;
  cursor: pointer;
  flex-shrink: 0;
}

.radio-label {
  font-size: 14px;
  color: #374151;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #e8eaed;
  margin-top: 24px;
}

.btn-cancel {
  padding: 10px 24px;
  background: transparent;
  color: #6b7280;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: #f3f4f6;
}

.btn-submit {
  padding: 10px 28px;
  background: #4f46e5;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-submit:hover:not(:disabled) {
  background: #4338ca;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-small {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 820px) {
  .modal {
    max-width: 100%;
    margin: 10px;
    max-height: 95vh;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .modal-header {
    padding: 20px;
    flex-direction: column;
    align-items: flex-start;
  }

  .modal-title {
    font-size: 20px;
  }

  .modal-form {
    padding: 20px;
  }

  .form-column {
    gap: 16px;
  }

  .radio-group {
    gap: 8px;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions button {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal {
    border-radius: 16px;
    max-height: 98vh;
  }

  .modal-header {
    padding: 16px;
  }

  .modal-title {
    font-size: 18px;
  }

  .modal-subtitle {
    font-size: 13px;
  }

  .modal-form {
    padding: 16px;
  }

  .form-column {
    gap: 14px;
  }

  .form-input,
  .form-select,
  .form-textarea {
    padding: 8px 12px;
    font-size: 13px;
  }

  .radio-option {
    padding: 4px 8px;
    font-size: 13px;
  }
}

.modal::-webkit-scrollbar {
  width: 6px;
}

.modal::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.modal::-webkit-scrollbar-thumb {
  background: #c4c4c4;
  border-radius: 10px;
}

.modal::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>