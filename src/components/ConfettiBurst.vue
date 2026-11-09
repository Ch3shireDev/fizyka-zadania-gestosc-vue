<script setup lang="ts">
// Konfetti z czystego CSS. Remontuj komponent (zmień :key), żeby odpalić ponownie.
const COLORS = ['#e0a526', '#8f5bd6', '#2f9e5b', '#e2574c', '#3a86d4', '#f2d16b']
const pieces = Array.from({ length: 44 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 0.25,
  duration: 1.1 + Math.random() * 0.9,
  drift: (Math.random() - 0.5) * 140,
  rotate: Math.random() * 720 - 360,
  color: COLORS[i % COLORS.length],
  w: 6 + Math.random() * 6,
  h: 8 + Math.random() * 8,
}))
</script>

<template>
  <div class="confetti" aria-hidden="true">
    <span
      v-for="p in pieces"
      :key="p.id"
      :style="{
        left: p.left + '%',
        width: p.w + 'px',
        height: p.h + 'px',
        background: p.color,
        animationDelay: p.delay + 's',
        animationDuration: p.duration + 's',
        '--drift': p.drift + 'px',
        '--rot': p.rotate + 'deg',
      }"
    />
  </div>
</template>

<style scoped>
.confetti {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 50;
}
span {
  position: absolute;
  top: -20px;
  border-radius: 2px;
  animation-name: fall;
  animation-timing-function: cubic-bezier(0.25, 0.6, 0.4, 1);
  animation-fill-mode: forwards;
}
@keyframes fall {
  to {
    transform: translate(var(--drift), 105dvh) rotate(var(--rot));
    opacity: 0.2;
  }
}
@media (prefers-reduced-motion: reduce) {
  .confetti {
    display: none;
  }
}
</style>
