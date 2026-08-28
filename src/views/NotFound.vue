<!-- src/views/NotFoundPage.vue -->
<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <!-- Animated 404 Illustration -->
      <div class="illustration">
        <div class="floating-404">
          <span class="digit">4</span>
          <span class="digit zero">0</span>
          <span class="digit">4</span>
        </div>
        <div class="search-icon">🔍</div>
        <div class="floating-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <!-- Text Content -->
      <h1 class="error-title">Page Not Found</h1>
      <p class="error-description">
        Oops! The page you're looking for doesn't exist or has been moved.
      </p>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <router-link to="/" class="btn btn-primary">
          <span class="btn-icon">🏠</span>
          Go to Home
        </router-link>
        <router-link to="/login" class="btn btn-secondary">
          <span class="btn-icon">🔐</span>
          Go to Login
        </router-link>
        <button @click="goBack" class="btn btn-outline">
          <span class="btn-icon">↩️</span>
          Go Back
        </button>
      </div>

      <!-- Helpful Links -->
      <div class="helpful-links">
        <p>Or try these links:</p>
        <div class="links-grid">
          <router-link to="/dashboard" class="help-link">Dashboard</router-link>
          <router-link to="/settings" class="help-link">Settings</router-link>
          <router-link to="/profile" class="help-link">Profile</router-link>
          <a href="#" @click.prevent="handleContact" class="help-link">Contact Support</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>




    const goBack=()=> {
      this.$router.go(-1)
    }

    const handleContact =() =>{
      // You can implement contact modal or redirect
      alert('Support page coming soon!')
    }


</script>

<style scoped>
/* ----- Container ----- */
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #f6f9fc 0%, #e9f1f8 50%, #dfe8f2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.not-found-content {
  max-width: 600px;
  width: 100%;
  text-align: center;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 3rem 2.5rem;
  border-radius: 32px;
  box-shadow: 0 20px 40px -12px rgba(0, 20, 40, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.5);
  position: relative;
  overflow: hidden;
}

@media (max-width: 480px) {
  .not-found-content {
    padding: 2rem 1.5rem;
    border-radius: 24px;
  }
}

/* ----- Illustration ----- */
.illustration {
  position: relative;
  height: 160px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.floating-404 {
  display: flex;
  gap: 0.5rem;
  font-size: 5rem;
  font-weight: 900;
  color: #2d7aff;
  animation: float 3s ease-in-out infinite;
  position: relative;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
}

.digit {
  display: inline-block;
  text-shadow: 0 4px 12px rgba(45, 122, 255, 0.2);
}

.zero {
  color: #1f5fd9;
  position: relative;
}

.zero::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border: 4px solid rgba(45, 122, 255, 0.1);
  border-radius: 50%;
  animation: pulse-ring 2s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
}

.search-icon {
  position: absolute;
  font-size: 2.5rem;
  top: 20%;
  right: 10%;
  animation: bounce 2s ease-in-out infinite;
  opacity: 0.8;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(-10deg); }
}

.floating-dots {
  position: absolute;
  bottom: 0;
  left: 10%;
  display: flex;
  gap: 0.5rem;
}

.floating-dots span {
  width: 8px;
  height: 8px;
  background: #2d7aff;
  border-radius: 50%;
  opacity: 0.3;
  animation: dot-float 2s ease-in-out infinite;
}

.floating-dots span:nth-child(2) {
  animation-delay: 0.3s;
  opacity: 0.5;
}

.floating-dots span:nth-child(3) {
  animation-delay: 0.6s;
  opacity: 0.7;
}

@keyframes dot-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* ----- Text Content ----- */
.error-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #0b2b44;
  margin-bottom: 0.75rem;
  letter-spacing: -0.5px;
}

@media (max-width: 480px) {
  .error-title {
    font-size: 2rem;
  }

  .floating-404 {
    font-size: 4rem;
  }
}

.error-description {
  font-size: 1.1rem;
  color: #5b6f82;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 450px;
  margin-left: auto;
  margin-right: auto;
}

/* ----- Action Buttons ----- */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 2.5rem;
}

@media (min-width: 480px) {
  .action-buttons {
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  border-radius: 40px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: all 0.25s ease;
  border: 2px solid transparent;
  cursor: pointer;
  font-family: inherit;
  min-width: 160px;
  justify-content: center;
}

.btn-icon {
  font-size: 1.2rem;
}

.btn-primary {
  background: linear-gradient(135deg, #1f5fd9, #2d7aff);
  color: white;
  box-shadow: 0 4px 12px rgba(45, 122, 255, 0.35);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(45, 122, 255, 0.45);
}

.btn-secondary {
  background: #e9f1f8;
  color: #1f3a4e;
  border-color: #dae3ec;
}

.btn-secondary:hover {
  background: #dae3ec;
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: #1f3a4e;
  border-color: #dae3ec;
}

.btn-outline:hover {
  background: rgba(0, 0, 0, 0.03);
  border-color: #b0c4d8;
  transform: translateY(-2px);
}

/* ----- Helpful Links ----- */
.helpful-links {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 1.5rem;
}

.helpful-links p {
  font-size: 0.9rem;
  color: #7a8fa3;
  margin-bottom: 0.75rem;
}

.links-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

@media (min-width: 480px) {
  .links-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.help-link {
  display: block;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  color: #2d7aff;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.help-link:hover {
  background: rgba(45, 122, 255, 0.08);
  transform: scale(1.03);
}

/* ----- Responsive Tweaks ----- */
@media (max-width: 380px) {
  .btn {
    width: 100%;
    min-width: unset;
  }

  .links-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .not-found-container {
    background: linear-gradient(135deg, #1a2634 0%, #0f1a24 100%);
  }

  .not-found-content {
    background: rgba(30, 40, 55, 0.85);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .error-title {
    color: #e8f0f8;
  }

  .error-description {
    color: #a0b8cc;
  }

  .btn-secondary {
    background: #2a3a4a;
    color: #c8d8e8;
    border-color: #3a4a5a;
  }

  .btn-secondary:hover {
    background: #3a4a5a;
  }

  .btn-outline {
    color: #c8d8e8;
    border-color: #3a4a5a;
  }

  .btn-outline:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .help-link {
    background: rgba(255, 255, 255, 0.05);
    color: #6a9eff;
  }

  .help-link:hover {
    background: rgba(45, 122, 255, 0.15);
  }

  .helpful-links p {
    color: #8a9fb3;
  }
}
</style>