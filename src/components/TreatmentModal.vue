<template>
  <div v-if="visible" class="modal-overlay" >
    <div class="modal modal-lg" @click.stop>
      <div class="modal-header">
        <div>
          <h3 class="modal-title">
            {{ mode === 'create' ? 'Add New Treatment' : 'Edit Treatment' }}
          </h3>
          <p class="modal-subtitle">
            {{ mode === 'create' ? 'Enter treatment details for the customer' : 'Update treatment information' }}
          </p>
        </div>
        <button @click="close" class="modal-close" type="button" aria-label="Close modal">
          ×
        </button>
      </div>

      <form @submit.prevent="submitForm" class="modal-form">
        <div class="form-grid">
          <div class="form-column">
            <div class="form-group">
              <label class="form-label">
                Customer <span class="required">*</span>
              </label>
              <div class="customer-search-wrapper">
                <input
                    v-model="customerSearchQuery"
                    type="text"
                    class="form-input"
                    placeholder="Search by name, email, or phone..."
                    @input="handleCustomerSearch"
                    @focus="showCustomerResults = true"
                    :class="{ 'form-input-error': errors.customer }"
                />
                <span v-if="selectedCustomer" class="customer-selected-badge">
                  ✓ {{ selectedCustomer.name }}
                  <button type="button" @click="clearSelectedCustomer" class="clear-customer-btn">×</button>
                </span>
              </div>

              <div v-if="showCustomerResults && customerSearchResults.length > 0" class="customer-search-results">
                <div
                    v-for="customer in customerSearchResults"
                    :key="customer.id"
                    class="customer-search-item"
                    @click="selectCustomer(customer)"
                >
                  <div class="customer-search-avatar">{{ getInitials(customer.name) }}</div>
                  <div class="customer-search-info">
                    <div class="customer-search-name">{{ customer.name }}</div>
                    <div class="customer-search-details">
                      <span>{{ customer.email }}</span>
                      <span class="search-divider">•</span>
                      <span>{{ customer.phone || 'No phone' }}</span>
                    </div>
                  </div>
                  <span v-if="customer.id === form.customer_id" class="customer-selected-indicator">✓ Selected</span>
                </div>
              </div>

              <div v-if="showCustomerResults && customerSearchQuery && customerSearchResults.length === 0 && !customerSearching" class="customer-search-empty">
                No customers found. <button type="button" @click="openAddCustomer" class="add-customer-link">Add new customer?</button>
              </div>

              <span v-if="errors.customer" class="form-error">{{ errors.customer }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">
                Treatment Name <span class="required">*</span>
              </label>
              <input
                  v-model="form.name"
                  type="text"
                  required
                  class="form-input"
                  placeholder="e.g., Deep Tissue Massage"
                  :class="{ 'form-input-error': errors.name }"
              />
              <span v-if="errors.name" class="form-error">{{ errors.name }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Date</label>
              <input
                  v-model="form.date"
                  type="date"
                  class="form-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Time</label>
              <select v-model="form.time" class="form-input">
                <option value="" disabled>Select a time</option>
                <option v-for="slot in timeSlots" :key="slot" :value="slot">
                  {{ slot }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">
                Assigned Staff Member <span class="required">*</span>
              </label>
              <select
                  v-model="form.staff_id"
                  required
                  class="form-select"
                  :class="{ 'form-input-error': errors.staff_id }"
              >
                <option value="">Select a staff member</option>
                <option
                    v-for="staff in staffList"
                    :key="staff.id"
                    :value="staff.id"
                >
                  {{ staff.name }}
                </option>
              </select>
              <span v-if="errors.staff_id" class="form-error">{{ errors.staff_id }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Location</label>
              <select v-model="form.location" class="form-select">
                <option value="5075 Yonge St #600">5075 Yonge St #600 </option>
                <option value="Richmond Hill">Richmond Hill</option>
              </select>
            </div>
          </div>

          <div class="form-column">
            <div class="form-group">
              <label class="form-label">Payment Method</label>
              <select v-model="form.payment" class="form-select">
                <option value="">Select payment method</option>
                <option value="E-Transfer">E-Transfer</option>
                <option value="Wechat">Wechat</option>
                <option value="AliPay">AliPay</option>
                <option value="Store Credit">Store Credit</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Payment Date</label>
              <input
                  v-model="form.payment_date"
                  type="date"
                  class="form-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Amount ($)</label>
              <input
                  v-model.number="form.amount"
                  type="number"
                  step="0.01"
                  min="0"
                  class="form-input"
                  placeholder="0.00"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Balance ($)</label>
              <input
                  v-model.number="form.balance"
                  type="number"
                  step="0.01"
                  min="0"
                  class="form-input"
                  placeholder="0.00"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Status</label>
              <select v-model="form.status" class="form-select">
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Remark</label>
              <textarea
                  v-model="form.remark"
                  class="form-textarea"
                  rows="2"
                  placeholder="Any additional notes..."
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
            {{ loading ? 'Saving...' : (mode === 'create' ? 'Add Treatment' : 'Save Changes') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, nextTick, onMounted } from 'vue';
import { useTreatmentStore } from '@/stores/treatment';
import { useCustomerStore } from '@/stores/customer';
import { useStaffStore } from '@/stores/staff'; // ✅ Imported staff store
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
  treatmentData: {
    type: Object,
    default: null
  },
  customer: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'success', 'add-customer']);

const treatmentStore = useTreatmentStore();
const customerStore = useCustomerStore();
const staffStore = useStaffStore(); // ✅ Instantiated staff store
const { showToast } = useToast();

// ============ Customer Search State ============
const customerSearchQuery = ref('');
const customerSearchResults = ref([]);
const customerSearching = ref(false);
const showCustomerResults = ref(false);
const selectedCustomer = ref(null);

// ============ Form State ============
const loading = ref(false);
const errors = reactive({
  name: '',
  staff_id: '', // ✅ Changed tracking from staff_name to staff_id
  customer: '',
  date: '',
  time: '',
  amount: '',
  balance: '',
  payment: '',
  status: ''
});

// Default form values
const defaultForm = {
  name: '',
  date: '',
  time: '',
  customer_id: null,
  staff_id: '', // ✅ Swapped field definition
  location: '5075 Yonge St #600, Richmond Hill',
  payment: '',
  payment_date: '',
  amount: 0,
  balance: 0,
  remark: '',
  status: 'in-progress'
};

const form = reactive({ ...defaultForm });
const initialFormState = ref({ ...defaultForm });

// ============ Staff Population Logic ============
// Dynamically maps list from your state store
const staffList = computed(() => staffStore.staff || []);
const timeSlots = computed(() => {
  const slots = [];
  for (let hour = 6; hour < 20; hour++) {
    const paddedHour = String(hour).padStart(2, '0');
    // Step through the specific index intervals explicitly
    ['00', '15', '30', '45'].forEach((minute) => {
      slots.push(`${paddedHour}:${minute}`);
    });
  }
  return slots;
});

onMounted(async () => {
  // Gracefully load staff records on initialization if array is unpopulated
  if (staffList.value.length === 0) {
    try {
      await staffStore.fetchStaff();
    } catch (err) {
      console.error('Failed to resolve staff dataset:', err);
    }
  }
});

// ============ Computed ============
const getInitials = (name) => {
  if (!name) return '?';
  return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
};

// ============ Customer Search Methods ============
const handleCustomerSearch = async () => {
  const query = customerSearchQuery.value.trim();

  if (!query) {
    customerSearchResults.value = [];
    showCustomerResults.value = false;
    return;
  }

  customerSearching.value = true;
  showCustomerResults.value = true;

  try {
    const results = await customerStore.searchCustomers(query);
    customerSearchResults.value = results || [];
  } catch (error) {
    console.error('Customer search error:', error);
    customerSearchResults.value = [];
  } finally {
    customerSearching.value = false;
  }
};

const selectCustomer = (customer) => {
  selectedCustomer.value = customer;
  form.customer_id = customer.id;
  customerSearchQuery.value = customer.name;
  customerSearchResults.value = [];
  showCustomerResults.value = false;
  errors.customer = '';
};

const clearSelectedCustomer = () => {
  selectedCustomer.value = null;
  form.customer_id = null;
  customerSearchQuery.value = '';
  customerSearchResults.value = [];
};

const openAddCustomer = () => {
  emit('add-customer');
};

// ============ Watch for customer prop changes ============
watch(
    () => props.customer,
    (newCustomer) => {
      if (newCustomer) {
        selectedCustomer.value = newCustomer;
        form.customer_id = newCustomer.id;
        customerSearchQuery.value = newCustomer.name;
      }
    },
    { immediate: true }
);

// ============ Watch for treatment data changes ============
watch(
    () => props.treatmentData,
    (newData) => {
      if (props.mode === 'edit' && newData) {
        const data = {
          name: newData.name || '',
          date: newData.date || '',
          time: newData.time || '',
          customer_id: newData.customer_id || props.customer?.id || null,
          staff_id: newData.staff_id || '', // ✅ Hydrates staff option selector cleanly
          location: newData.location || '5075 Yonge St #600, Richmond Hill',
          payment: newData.payment || '',
          payment_date: newData.payment_date || '',
          amount: parseFloat(newData.amount) || 0,
          balance: parseFloat(newData.balance) || 0,
          remark: newData.remark || '',
          status: newData.status || 'in-progress'
        };
        Object.assign(form, data);
        initialFormState.value = { ...data };

        // Set customer if available
        if (newData.customer_id && !selectedCustomer.value) {
          fetchCustomerDetails(newData.customer_id);
        }
      } else if (props.mode === 'create') {
        Object.assign(form, {
          ...defaultForm,
          customer_id: props.customer?.id || null
        });
        initialFormState.value = { ...form };

        if (props.customer) {
          selectedCustomer.value = props.customer;
          customerSearchQuery.value = props.customer.name;
        }
      }
    },
    { immediate: true, deep: true }
);

// ============ Fetch customer details ============
const fetchCustomerDetails = async (customerId) => {
  try {
    const customer = await customerStore.fetchCustomerById(customerId);
    if (customer) {
      selectedCustomer.value = customer;
      customerSearchQuery.value = customer.name;
    }
  } catch (error) {
    console.error('Error fetching customer:', error);
  }
};

// ============ Watch for visibility changes ============
watch(
    () => props.visible,
    (newVal) => {
      if (newVal && props.mode === 'create') {
        Object.assign(form, {
          ...defaultForm,
          customer_id: props.customer?.id || null
        });
        initialFormState.value = { ...form };

        if (props.customer) {
          selectedCustomer.value = props.customer;
          customerSearchQuery.value = props.customer.name;
        }
      }
      if (!newVal) {
        clearErrors();
        customerSearchResults.value = [];
        showCustomerResults.value = false;
      }
    }
);

// ============ Validation ============
const validateForm = () => {
  let isValid = true;
  clearErrors();

  if (!form.name || form.name.trim().length < 2) {
    errors.name = 'Treatment name must be at least 2 characters';
    isValid = false;
  }

  if (!form.staff_id) { // ✅ Updated field validation structure
    errors.staff_id = 'Please select a staff member';
    isValid = false;
  }

  if (!form.customer_id) {
    errors.customer = 'Please select a customer';
    isValid = false;
  }

  return isValid;
};

const clearErrors = () => {
  Object.keys(errors).forEach(key => {
    errors[key] = '';
  });
};

// ============ Check if form has been modified ============
const isFormDirty = () => {
  return Object.keys(form).some(key => {
    if (key === 'id' || key === 'customer_id') return false;
    return form[key] !== initialFormState.value[key];
  });
};

// ============ Submit form ============
const submitForm = async () => {
  if (!validateForm()) {
    showToast('Please fix the errors in the form', 'warning');
    return;
  }

  loading.value = true;
  try {
    const submitData = {
      name: form.name.trim(),
      date: form.date || null,
      time: form.time || null,
      customer_id: form.customer_id,
      staff_id: parseInt(form.staff_id), // ✅ Submits structural foreign key ID safely
      location: form.location || '5075 Yonge St #600, Richmond Hill',
      payment: form.payment || null,
      payment_date: form.payment_date || null,
      amount: parseFloat(form.amount) || 0,
      balance: parseFloat(form.balance) || 0,
      remark: form.remark || null,
      status: form.status || 'in-progress'
    };

    let response;
    if (props.mode === 'create') {
      response = await treatmentStore.createTreatment(submitData);
      showToast('Treatment added successfully!', 'success');
    } else {
      response = await treatmentStore.updateTreatment(props.treatmentData.id, submitData);
      showToast('Treatment updated successfully!', 'success');
    }

    emit('success', response);
    close();
  } catch (error) {
    console.error('Error saving treatment:', error);

    if (error.response?.status === 409) {
      showToast('Treatment already exists', 'error');
    } else {
      showToast(error.message || 'Failed to save treatment', 'error');
    }
  } finally {
    loading.value = false;
  }
};

// ============ Close modal ============
const close = () => {
  if (loading.value) {
    showToast('Please wait while saving...', 'warning');
    return;
  }

  // Check for unsaved changes
  if (isFormDirty() && props.mode === 'create') {
    if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
  }

  Object.assign(form, defaultForm);
  initialFormState.value = { ...defaultForm };
  clearErrors();
  selectedCustomer.value = null;
  customerSearchQuery.value = '';
  customerSearchResults.value = [];
  showCustomerResults.value = false;
  emit('close');
};

// ============ Handle outside click ============
const handleOutsideClick = (e) => {
  if (e.target === e.currentTarget) {
    close();
  }
};

// ============ Handle Escape key ============
const handleEscapeKey = (e) => {
  if (e.key === 'Escape' && props.visible) {
    close();
  }
};

// ============ Click outside results to close ============
const handleClickOutside = (e) => {
  const wrapper = document.querySelector('.customer-search-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    showCustomerResults.value = false;
  }
};

// ============ Add keyboard listener ============
watch(
    () => props.visible,
    (newVal) => {
      if (newVal) {
        document.addEventListener('keydown', handleEscapeKey);
        document.addEventListener('click', handleClickOutside);

        // Focus the customer search input
        nextTick(() => {
          const input = document.querySelector('.customer-search-wrapper input');
          if (input) input.focus();
        });
      } else {
        document.removeEventListener('keydown', handleEscapeKey);
        document.removeEventListener('click', handleClickOutside);
      }
    }
);
</script>

<style scoped>
/* Keeping your existing styles perfectly intact */
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
  position: relative;
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
  min-height: 60px;
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  cursor: pointer;
}

.customer-search-wrapper {
  position: relative;
}

.customer-selected-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #ecfdf5;
  color: #065f46;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  margin-top: 6px;
}

.clear-customer-btn {
  background: none;
  border: none;
  color: #065f46;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  line-height: 1;
}

.clear-customer-btn:hover {
  color: #dc2626;
}

.customer-search-results {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  max-height: 200px;
  overflow-y: auto;
  z-index: 20;
}

.customer-search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.customer-search-item:hover {
  background: #f3f4f6;
}

.customer-search-item.selected {
  background: #eef2ff;
}

.customer-search-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #eef2ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.customer-search-info {
  flex: 1;
  min-width: 0;
}

.customer-search-name {
  font-weight: 500;
  color: #1a1a2e;
  font-size: 14px;
}

.customer-search-details {
  font-size: 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.search-divider {
  color: #d1d5db;
}

.customer-selected-indicator {
  font-size: 12px;
  color: #4f46e5;
  font-weight: 500;
}

.customer-search-empty {
  padding: 12px 14px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

.add-customer-link {
  background: none;
  border: none;
  color: #4f46e5;
  cursor: pointer;
  font-weight: 500;
  text-decoration: underline;
}

.add-customer-link:hover {
  color: #4338ca;
}

.customer-info-box {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: #f0f4ff;
  border-radius: 12px;
  border: 1.5px solid #dbeafe;
  margin: 20px 0 0;
}

.customer-info-icon {
  font-size: 28px;
}

.customer-info-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-info-name {
  font-weight: 600;
  color: #1a1a2e;
  font-size: 15px;
}

.customer-info-email,
.customer-info-phone {
  font-size: 13px;
  color: #6b7280;
}

.change-customer-btn {
  padding: 4px 12px;
  background: transparent;
  color: #4f46e5;
  border: 1px solid #4f46e5;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.change-customer-btn:hover {
  background: #4f46e5;
  color: #ffffff;
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
  .modal-title { font-size: 20px; }
  .modal-form { padding: 20px; }
  .form-column { gap: 16px; }
  .form-actions { flex-direction: column-reverse; }
  .form-actions button { width: 100%; justify-content: center; }
}

@media (max-width: 480px) {
  .modal-overlay { padding: 10px; }
  .modal { border-radius: 16px; max-height: 98vh; }
  .modal-header { padding: 16px; }
  .modal-title { font-size: 18px; }
  .modal-subtitle { font-size: 13px; }
  .modal-form { padding: 16px; }
  .form-column { gap: 14px; }
  .form-input, .form-select, .form-textarea { padding: 8px 12px; font-size: 13px; }
  .customer-info-box { flex-direction: column; text-align: center; padding: 12px 16px; }
  .customer-info-details { align-items: center; }
  .customer-search-results { max-height: 150px; }
}

.modal::-webkit-scrollbar { width: 6px; }
.modal::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
.modal::-webkit-scrollbar-thumb { background: #c4c4c4; border-radius: 10px; }
.modal::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
.customer-search-results::-webkit-scrollbar { width: 4px; }
.customer-search-results::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
.customer-search-results::-webkit-scrollbar-thumb { background: #c4c4c4; border-radius: 10px; }
</style>