<template>
  <router-link :to="to" class="nav-card" :style="{ '--accent': accent }">
    <div class="nav-card__accent" />

    <div class="nav-card__inner">
      <div class="nav-card__top">
        <div class="nav-card__icon-wrap">
          <component :is="icon" class="nav-card__icon" />
        </div>
        <span class="nav-card__tag" v-if="tag">{{ tag }}</span>
      </div>

      <div class="nav-card__body">
        <p class="nav-card__label">{{ label }}</p>
        <h3 class="nav-card__title">{{ title }}</h3>
        <p class="nav-card__description">{{ description }}</p>
      </div>

      <div class="nav-card__footer">
<!--        <div class="nav-card__stats" v-if="stats && stats.length">-->
<!--          <div class="nav-card__stat" v-for="s in stats" :key="s.label">-->
<!--            <span class="nav-card__stat-value">{{ s.value }}</span>-->
<!--            <span class="nav-card__stat-label">{{ s.label }}</span>-->
<!--          </div>-->
<!--        </div>-->
        <div class="nav-card__arrow">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  </router-link>
</template>

<script setup>
defineProps({
  to: { type: String, required: true },
  icon: { type: Object, required: true },   // pass a Vue component
  label: { type: String, default: '' },      // eyebrow text e.g. "Analytics"
  title: { type: String, required: true },
  description: { type: String, default: '' },
  accent: { type: String, default: '#3b82f6' },
  tag: { type: String, default: null },      // optional badge e.g. "New"
  stats: {                                   // optional mini-stats row
    type: Array,
    default: null,
    // [{ value: '12', label: 'active' }, ...]
  }
})
</script>

<style scoped>
.nav-card {
  --accent: #3b82f6;
  position: relative;
  display: flex;
  text-decoration: none;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e5e9ef;
  overflow: hidden;
  transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.nav-card:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.09);
  border-color: #d1d5db;
  transform: translateY(-2px);
}

.nav-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ── Accent bar ─────────────────────────────────────── */
.nav-card__accent {
  width: 4px;
  flex-shrink: 0;
  background: var(--accent);
  border-radius: 0;
  opacity: 0.85;
  transition: opacity 0.18s;
}

.nav-card:hover .nav-card__accent {
  opacity: 1;
}

/* ── Inner layout ───────────────────────────────────── */
.nav-card__inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 20px 18px;
}

/* ── Top row ────────────────────────────────────────── */
.nav-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.nav-card__icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-card__icon {
  width: 18px;
  height: 18px;
  color: var(--accent);
}

.nav-card__tag {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  padding: 3px 8px;
  border-radius: 100px;
  line-height: 1.4;
}

/* ── Body ───────────────────────────────────────────── */
.nav-card__body {
  flex: 1;
}

.nav-card__label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9ca3af;
  margin: 0 0 4px;
}

.nav-card__title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 6px;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.nav-card__description {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.55;
}

/* ── Footer ─────────────────────────────────────────── */
.nav-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.nav-card__stats {
  display: flex;
  gap: 16px;
}

.nav-card__stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nav-card__stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.nav-card__stat-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.nav-card__arrow {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #e5e9ef;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.nav-card:hover .nav-card__arrow {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
</style>
