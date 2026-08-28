<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-container">
      <div class="modal-header">
        <h2>Installment Payments Ledger (ID: #{{ treatmentId }})</h2>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <div v-if="loading" class="loading-state">
        Loading installment payments...
      </div>

      <div v-else class="modal-content">
        <table class="payment-table">
          <thead>
          <tr>
            <th>Amount ($)</th>
            <th>Payment Method</th>
            <th>Date Added</th>
            <th class="actions-hdr">Actions</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="payment in payments" :key="payment.id">
            <td>
              <input
                  type="number"
                  step="0.01"
                  v-model.number="payment.amount"
                  class="inline-input active-amount"
                  @change="trackEdit(payment.id)"
              />
            </td>
            <td>
              <select
                  v-model="payment.payment_method"
                  class="inline-input"
                  @change="trackEdit(payment.id)"
              >
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="WeChat Pay">WeChat Pay</option>
                <option value="Alipay">Alipay</option>
              </select>
            </td>
            <td>
              <span class="date-string">{{ formatDate(payment.created_at) }}</span>
            </td>
            <td class="action-cell">
              <button
                  class="save-row-btn"
                  :disabled="!isRowEdited(payment.id)"
                  @click="updatePayment(payment)"
              >
                Save
              </button>
            </td>
          </tr>

          <tr v-if="isAdding" class="new-record-row">
            <td>
              <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  v-model.number="newForm.amount"
                  class="inline-input new-input"
              />
            </td>
            <td>
              <select v-model="newForm.payment_method" class="inline-input new-input">
                <option value="" disabled selected>Select Method</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="WeChat Pay">WeChat Pay</option>
                <option value="Alipay">Alipay</option>
              </select>
            </td>
            <td><span class="draft-badge">Pending Draft</span></td>
            <td class="action-cell">
              <div class="row-actions-cluster">
                <button class="confirm-add-btn" @click="submitNewPayment">Submit</button>
                <button class="cancel-add-btn" @click="isAdding = false">&times;</button>
              </div>
            </td>
          </tr>
          </tbody>
        </table>

        <div v-if="!isAdding" class="add-trigger-wrapper">
          <button class="plus-trigger-btn" @click="isAdding = true" title="Add New Payment Block">
            <span class="plus-icon">+</span> Add Installment Payment
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="action-btn-secondary" @click="closeModal">Close Ledger</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, reactive } from 'vue';
// import api from '@/api/axios';

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  treatmentId: { type: [Number, String], required: true }
});

const emit = defineEmits(['close']);

const payments = ref([]);
const loading = ref(false);
const isAdding = ref(false);
const editedRowIds = ref(new Set());

const newForm = reactive({
  amount: null,
  payment_method: ''
});

const fetchPayments = async () => {
  // if (!props.treatmentId) return;
  // loading.value = true;
  // try {
  //   const response = await api.get(`/api/install-payments?treatment_id=${props.treatmentId}`);
  //   payments.value = response.data;
  //   editedRowIds.value.clear();
  //   isAdding.value = false;
  // } catch (error) {
  //   console.error('Failed to resolve payments array schema:', error);
  // } finally {
  //   loading.value = false;
  // }
};

watch(() => [props.isOpen, props.treatmentId], ([open, id]) => {
  if (open && id) {
    fetchPayments();
  }
}, { immediate: true });

// Change management engine
const trackEdit = (id) => editedRowIds.value.add(id);
const isRowEdited = (id) => editedRowIds.value.has(id);

// PUT: Update inline record
const updatePayment = async (payment) => {
  // try {
  //   await api.put(`/api/install-payments/${payment.id}`, {
  //     amount: payment.amount,
  //     payment_method: payment.payment_method
  //   });
  //   editedRowIds.value.delete(payment.id);
  //   alert('Payment node modified successfully.');
  // } catch (error) {
  //   console.error(error);
  //   alert('Failed to save payment alterations.');
  // }
};

// POST: Append new transaction element
const submitNewPayment = async () => {
  if (!newForm.amount || !newForm.payment_method) {
    alert('Please enter both an amount and select a payment method.');
    return;
  }
  // try {
  //   await api.post('/api/install-payments', {
  //     treatment_id: props.treatmentId,
  //     amount: newForm.amount,
  //     payment_method: newForm.payment_method
  //   });
  //
  //   // Reset layout fields and reload dataset block
  //   newForm.amount = null;
  //   newForm.payment_method = '';
  //   isAdding.value = false;
  //   await fetchPayments();
  // } catch (error) {
  //   console.error(error);
  //   alert('Could not record new installment.');
  // }
};

const formatDate = (isoString) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const closeModal = () => emit('close');
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background-color: rgba(15, 23, 42, 0.85);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}

.modal-container {
  background-color: #1e293b;
  border: 1px solid #475569;
  border-radius: 8px;
  width: 90%; max-width: 800px; max-height: 80vh;
  display: flex; flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  color: #f8fafc;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #334155;
  display: flex; justify-content: space-between; align-items: center;
}

.modal-header h2 { font-size: 1.15rem; color: #e2e8f0; margin: 0; }

.close-btn { background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; }
.close-btn:hover { color: #ef4444; }

.modal-content { padding: 1.5rem; overflow-y: auto; }

.payment-table { width: 100%; border-collapse: collapse; text-align: left; }
.payment-table th {
  background-color: #0f172a; color: #94a3b8;
  padding: 0.75rem 1rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;
}
.payment-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #334155; vertical-align: middle; }

/* Input Styling */
.inline-input {
  background-color: #0f172a; border: 1px solid #475569; border-radius: 4px;
  color: #fff; padding: 0.45rem 0.6rem; width: 100%; box-sizing: border-box;
}
.inline-input:focus { outline: none; border-color: #d97706; }
.active-amount { color: #f8fafc; font-weight: 500; }

/* Row Actions Button States */
.save-row-btn {
  background-color: #d97706; color: #0f172a; border: none;
  padding: 0.35rem 0.75rem; border-radius: 4px; font-weight: 600; cursor: pointer;
}
.save-row-btn:disabled { background-color: #475569; color: #94a3b8; cursor: not-allowed; }

/* Plus Trigger Node Layout */
.add-trigger-wrapper { display: flex; justify-content: center; padding: 1.25rem 0 0.25rem 0; }
.plus-trigger-btn {
  background: none; border: 1px dashed #d97706; color: #fbbf24;
  padding: 0.6rem 2rem; border-radius: 6px; cursor: pointer;
  display: flex; align-items: center; gap: 0.5rem; font-weight: 500; transition: all 0.2s;
}
.plus-trigger-btn:hover { background-color: rgba(217, 119, 6, 0.1); color: #fff; }
.plus-icon { font-size: 1.2rem; font-weight: bold; }

/* New Row Appending Contextual States */
.new-record-row { background-color: rgba(15, 23, 42, 0.4); }
.new-input { border-color: #fbbf24; }
.draft-badge { font-size: 0.75rem; background-color: #b45309; color: #fff; padding: 0.2rem 0.5rem; border-radius: 4px; }

.row-actions-cluster { display: flex; gap: 0.5rem; align-items: center; }
.confirm-add-btn { background-color: #10b981; color: #0f172a; border: none; padding: 0.35rem 0.75rem; border-radius: 4px; font-weight: 600; cursor: pointer; }
.cancel-add-btn { background: none; border: 1px solid #ef4444; color: #ef4444; border-radius: 4px; padding: 0.15rem 0.5rem; font-size: 1.1rem; cursor: pointer; }

.actions-hdr, .action-cell { text-align: right; width: 120px; }
.date-string { color: #94a3b8; font-size: 0.9rem; }

.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #334155; display: flex; justify-content: flex-end; background-color: #0f172a; }
.action-btn-secondary { background: none; border: 1px solid #475569; color: #cbd5e1; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
.action-btn-secondary:hover { background-color: #1e293b; color: #fff; }
.loading-state { text-align: center; padding: 3rem; color: #94a3b8; }
</style>