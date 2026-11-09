<script setup lang="ts">
import StartScreen from './components/StartScreen.vue'
import GameScreen from './components/GameScreen.vue'
import EndScreen from './components/EndScreen.vue'
import { loadTaskBank, type TaskBank } from './lib/tasks'
import { useGame } from './lib/game'

let bank: TaskBank | null = null
let loadError = ''
try {
  bank = loadTaskBank()
} catch (e) {
  loadError = (e as Error).message
}

const game = bank ? useGame(bank) : null
</script>

<template>
  <div v-if="loadError || !game || !bank" class="error">
    <strong>YAML się wysypał.</strong>
    <pre>{{ loadError }}</pre>
  </div>
  <template v-else>
    <StartScreen v-if="game.state.phase === 'start'" :game="game" :bank="bank" />
    <EndScreen v-else-if="game.state.phase === 'end'" :game="game" />
    <GameScreen v-else :game="game" />
  </template>
</template>

<style>
:root {
  --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --bg: #f4efe4;
  --card: #fffdf8;
  --box: #f1ebdd;
  --field: #ffffff;
  --ink: #2b2620;
  --ink-strong: #17130f;
  --muted: #776d5f;
  --line: #ddd3c1;
  --shadow: #e6dccb;
  --accent: #8a5a12;
  --accent-ink: #8a5a12;
  --on-accent: #fffaf0;
  --ok: #2b7a3b;
  --bad: #b23a2a;
  --warn: #a86b00;
  --gold-soft: #f6e9c6;
  --gold-ink: #7a5300;
  --octarine-soft: #ece3f7;
  --octarine-ink: #5c3a8c;
  --fire-soft: #fde2cf;
  --fire-ink: #a33d0b;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #17140f;
    --card: #211d17;
    --box: #2b261e;
    --field: #15120e;
    --ink: #e9e1d3;
    --ink-strong: #fbf5ea;
    --muted: #a4998a;
    --line: #3d362b;
    --shadow: #0e0c09;
    --accent: #d9a24a;
    --accent-ink: #e6b766;
    --on-accent: #1a1409;
    --ok: #7cc98b;
    --bad: #ef8a7a;
    --warn: #e2b04f;
    --gold-soft: #3a2f17;
    --gold-ink: #f0c873;
    --octarine-soft: #2f2440;
    --octarine-ink: #c9a8f2;
    --fire-soft: #45230f;
    --fire-ink: #ffb07a;
    color-scheme: dark;
  }
}
*,
*::before,
*::after {
  box-sizing: border-box;
}
html {
  -webkit-text-size-adjust: 100%;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.5;
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
}
button {
  touch-action: manipulation; /* bez opóźnienia na double-tap zoom */
}
.katex-display {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.15em 0;
}
.error {
  margin: 2rem 16px;
  padding: 1rem;
  border: 1px solid var(--bad);
  border-radius: 10px;
  color: var(--bad);
}
.error pre {
  white-space: pre-wrap;
}
</style>
