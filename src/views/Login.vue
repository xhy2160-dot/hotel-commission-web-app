<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>飞筝后台管理系统</h1>
        <p>登录</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form" novalidate>
        <div class="form-group">
          <label for="email" class="form-label">邮箱</label>
          <div class="input-wrapper">
            <span class="input-icon">✉️</span>
            <input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="请输入邮箱"
                required
                autocomplete="email"
                :class="{ 'input-error': validationErrors.email }"
                @input="clearFieldError('email')"
            />
          </div>
          <span v-if="validationErrors.email" class="error-message">
            {{ validationErrors.email }}
          </span>
        </div>

        <div class="form-group">
          <label for="password" class="form-label">密码</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                required
                autocomplete="current-password"
                :class="{ 'input-error': validationErrors.password }"
                @input="clearFieldError('password')"
            />
            <button
                type="button"
                class="toggle-password"
                @click="togglePasswordVisibility"
                aria-label="Toggle password visibility"
            >
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
          <span v-if="validationErrors.password" class="error-message">
            {{ validationErrors.password }}
          </span>
        </div>

<!--        <div class="form-options">-->
<!--          <label class="remember-me">-->
<!--            <input type="checkbox" v-model="form.rememberMe" />-->
<!--            <span>Remember me</span>-->
<!--          </label>-->
<!--          <a href="#" class="forgot-link" @click.prevent="handleForgotPassword">-->
<!--            忘记密码?-->
<!--          </a>-->
<!--        </div>-->
        <p v-if="showError" class="login-error">{{authStore.$state.error}}</p>
        <button type="submit" class="login-button" :disabled="isLoading">
          <span v-if="isLoading" class="spinner"></span>
          <span v-else>登录</span>
        </button>

        <p class="demo-hint">
          邮箱+密码登录(密码最少6位)
        </p>
      </form>

<!--      <div class="login-footer">-->
<!--        <p>-->
<!--          Don't have an account?-->
<!--          <a href="#" @click.prevent="handleSignUp">Sign up</a>-->
<!--        </p>-->
<!--      </div>-->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const loginError = ref('')
const showError = ref(false);

// --- Types ---
interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

interface ValidationErrors {
  email: string | null
  password: string | null
}

// --- Emits ---
const emit = defineEmits<{
  (e: 'login', payload: { email: string; password: string; rememberMe: boolean }): void
  (e: 'forgot-password'): void
  (e: 'sign-up'): void
}>()

// --- State ---
const form = reactive<LoginForm>({
  email: '',
  password: '',
  rememberMe: false
})

const validationErrors = reactive<ValidationErrors>({
  email: null,
  password: null
})

const isLoading = ref(false)
const showPassword = ref(false)

// --- Validation ---
const validateForm = (): boolean => {
  let isValid = true

  // Reset errors
  validationErrors.email = null
  validationErrors.password = null

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!form.email) {
    validationErrors.email = '请填写邮箱'
    isValid = false
  } else if (!emailRegex.test(form.email)) {
    validationErrors.email = '请输入有效的邮箱地址'
    isValid = false
  }
  // Password validation
  if (!form.password) {
    validationErrors.password = '请填写密码'
    isValid = false
  } else if (form.password.length < 6) {
    validationErrors.password = '密码最少6位'
    isValid = false
  }

  return isValid
}

const clearFieldError = (field: keyof ValidationErrors) => {
  validationErrors[field] = null
  showError.value = false
}

// --- Actions ---
const handleLogin = async () => {
  if (!validateForm()) return

  isLoading.value = true

  try {
    const res = await authStore.login(form)
    if(authStore.$state.error){
      loginError.value = authStore.$state.error
      showError.value = true
    }
    if(res){ await router.push('/') }

  } catch (error) {
    console.error('Login error:', error)
    loginError.value = error as string
    showError.value = true
  } finally {
    isLoading.value = false
  }
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const handleForgotPassword = () => {
  emit('forgot-password')
}

const handleSignUp = () => {
  emit('sign-up')
}
</script>

<style scoped>
/* ----- Reset & Base ----- */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  background: linear-gradient(145deg, #f6f9fc 0%, #e9f1f8 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.login-card {
  width: 100%;
  max-width: 480px;
  padding: 2.5rem 2.5rem;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 32px;
  box-shadow: 0 20px 40px -12px rgba(0, 20, 40, 0.25), 0 8px 24px -6px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: transform 0.2s ease;
}

/* Wider on larger screens */
@media (min-width: 768px) {
  .login-card {
    max-width: 560px;
    padding: 3rem 3.5rem;
  }
}

@media (max-width: 480px) {
  .login-card {
    padding: 1.75rem 1.25rem;
    border-radius: 24px;
  }
}

/* ----- Header ----- */
.login-header {
  text-align: center;
  margin-bottom: 2.25rem;
}

.login-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #0b2b44;
  letter-spacing: -0.5px;
  margin-bottom: 0.25rem;
}

.login-header p {
  color: #5b6f82;
  font-size: 1rem;
  font-weight: 400;
}

@media (max-width: 480px) {
  .login-header h1 {
    font-size: 1.7rem;
  }
}

/* ----- Form ----- */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1f3a4e;
  letter-spacing: 0.3px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  font-size: 1.1rem;
  opacity: 0.6;
  pointer-events: none;
  line-height: 1;
}

.input-wrapper input {
  width: 100%;
  padding: 0.85rem 1rem 0.85rem 44px;
  font-size: 1rem;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.7);
  border: 1.5px solid #dae3ec;
  border-radius: 16px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  color: #0b2b44;
}

.input-wrapper input:focus {
  border-color: #2d7aff;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(45, 122, 255, 0.12);
}

.input-wrapper input::placeholder {
  color: #a0b3c7;
  font-weight: 400;
  opacity: 0.7;
}

.input-wrapper input.input-error {
  border-color: #e5474b;
  background: #fff7f7;
}

.input-wrapper input.input-error:focus {
  box-shadow: 0 0 0 4px rgba(229, 71, 75, 0.12);
}

.toggle-password {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s;
  color: #1f3a4e;
}

.toggle-password:hover {
  opacity: 1;
}

/* Error message */
.error-message {
  font-size: 0.8rem;
  color: #e5474b;
  font-weight: 500;
  padding-left: 4px;
  min-height: 1.2rem;
}

/* ----- Options row ----- */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1f3a4e;
  cursor: pointer;
  font-weight: 500;
}

.remember-me input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #2d7aff;
  cursor: pointer;
  border-radius: 4px;
}

.forgot-link {
  color: #2d7aff;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: color 0.15s;
}

.forgot-link:hover {
  color: #1a5fcc;
  text-decoration: underline;
}

/* ----- Submit Button ----- */
.login-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.9rem 1.5rem;
  background: linear-gradient(135deg, #1f5fd9, #2d7aff);
  color: white;
  font-weight: 700;
  font-size: 1.05rem;
  border: none;
  border-radius: 40px;
  cursor: pointer;
  transition: background 0.25s, transform 0.1s, box-shadow 0.25s;
  box-shadow: 0 8px 20px -6px rgba(45, 122, 255, 0.35);
  margin-top: 0.25rem;
  min-height: 56px;
  font-family: inherit;
}

.login-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #1a4fbf, #1f5fd9);
  box-shadow: 0 10px 24px -6px rgba(45, 122, 255, 0.45);
  transform: scale(1.01);
}

.login-button:active:not(:disabled) {
  transform: scale(0.97);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  box-shadow: none;
}

.login-error{
  color:orangered;
  text-align: center;
  font-size: 0.8rem;
}

/* Spinner */
.spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ----- Demo hint (dev only) ----- */
.demo-hint {
  font-size: 0.75rem;
  text-align: center;
  color: #7a8fa3;
  background: rgba(0, 0, 0, 0.03);
  padding: 0.4rem 0.8rem;
  border-radius: 40px;
  margin-top: 0.2rem;
  letter-spacing: 0.2px;
}

/* ----- Footer ----- */
.login-footer {
  margin-top: 1.75rem;
  text-align: center;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 1.5rem;
}

.login-footer p {
  color: #3e566a;
  font-size: 0.95rem;
}

.login-footer a {
  color: #2d7aff;
  text-decoration: none;
  font-weight: 700;
  transition: color 0.15s;
}

.login-footer a:hover {
  color: #1a5fcc;
  text-decoration: underline;
}

/* ----- Touch-friendly adjustments ----- */
@media (max-width: 480px) {
  .login-button {
    min-height: 52px;
    font-size: 1rem;
  }

  .input-wrapper input {
    padding: 0.8rem 1rem 0.8rem 40px;
    font-size: 0.95rem;
  }

  .form-options {
    font-size: 0.85rem;
  }

  .login-header h1 {
    font-size: 1.6rem;
  }
}

/* Larger touch targets */
.toggle-password,
.forgot-link,
.remember-me {
  touch-action: manipulation;
}
</style>