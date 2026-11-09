<script setup lang="ts">
import { computed, ref } from 'vue'
import MarkdownTex from './MarkdownTex.vue'
import type { Game } from '@/lib/game'
import type { TaskBank } from '@/lib/tasks'
import { STREAK_TIERS } from '@/lib/scoring'

const props = defineProps<{ game: Game; bank: TaskBank }>()

const lore = ref('')
const limit = ref(5)
const shuffle = ref(true)
const showRules = ref(false)

const LORES = [
  { id: '', label: 'Wszystko' },
  { id: 'archimedes', label: 'Archimedes' },
  { id: 'dysk', label: 'Świat Dysku' },
  { id: 'zwykłe', label: 'Codzienne' },
]
const LIMITS = [
  { n: 5, label: '5 zadań' },
  { n: 10, label: '10 zadań' },
  { n: 0, label: 'Wszystkie' },
]

const count = (id: string) => props.game.availableTasks(id).length
const chosenCount = computed(() => {
  const n = count(lore.value)
  return limit.value > 0 ? Math.min(limit.value, n) : n
})
const tiers = [...STREAK_TIERS].reverse().filter((t) => t.mult > 1)
const records = computed(() => props.game.state.records)

function go() {
  props.game.start({ lore: lore.value, shuffle: shuffle.value, limit: limit.value })
}
</script>

<template>
  <div class="screen">
    <header class="hero">
      <p class="kicker">Gęstość · masa · objętość · wypór</p>
      <h1>{{ bank.title }}</h1>
    </header>

    <div v-if="records.games > 0" class="records">
      <div><span class="rv">{{ records.bestScore.toLocaleString('pl-PL') }}</span><span class="rl">rekord</span></div>
      <div><span class="rv">{{ records.bestStreak }}</span><span class="rl">najdłuższa seria</span></div>
      <div><span class="rv">{{ records.games }}</span><span class="rl">rozgrywki</span></div>
    </div>

    <MarkdownTex v-if="bank.intro" class="intro" :source="bank.intro" />

    <section class="opt">
      <h2>Zestaw</h2>
      <div class="chips">
        <button
          v-for="l in LORES"
          :key="l.id"
          type="button"
          :class="{ on: lore === l.id }"
          :aria-pressed="lore === l.id"
          @click="lore = l.id"
        >
          {{ l.label }} <span class="n">{{ count(l.id) }}</span>
        </button>
      </div>
    </section>

    <section class="opt">
      <h2>Długość</h2>
      <div class="chips">
        <button
          v-for="l in LIMITS"
          :key="l.n"
          type="button"
          :class="{ on: limit === l.n }"
          :aria-pressed="limit === l.n"
          @click="limit = l.n"
        >
          {{ l.label }}
        </button>
      </div>
      <label class="toggle">
        <input v-model="shuffle" type="checkbox" />
        <span>Losowa kolejność</span>
      </label>
    </section>

    <section class="opt">
      <button type="button" class="rules-btn" :aria-expanded="showRules" @click="showRules = !showRules">
        {{ showRules ? '▾' : '▸' }} Jak liczymy punkty
      </button>
      <ul v-if="showRules" class="rules">
        <li><b>100 pkt</b> za każdy punkt pytania (trudniejsze są warte więcej).</li>
        <li><b>do +50</b> za tempo: im szybciej, tym więcej.</li>
        <li><b>Wskazówka</b> kosztuje połowę punktów bazowych.</li>
        <li v-for="t in tiers" :key="t.from">
          Seria <b>{{ t.from }}+</b> poprawnych: mnożnik <b>×{{ t.mult.toLocaleString('pl-PL') }}</b>
        </li>
        <li><b>Bonus</b> za zadanie z Archimedesem albo ze Świata Dysku rozwiązane bez żadnego błędu.</li>
        <li>Jedna próba na pytanie. Źle to źle, ale dostaniesz wyjaśnienie dlaczego.</li>
      </ul>
    </section>

    <div class="dock">
      <button type="button" class="cta" :disabled="chosenCount === 0" @click="go">
        Start · {{ chosenCount }} {{ chosenCount === 1 ? 'zadanie' : chosenCount < 5 ? 'zadania' : 'zadań' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.screen {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(1.25rem + env(safe-area-inset-top)) 16px calc(6.5rem + env(safe-area-inset-bottom));
}
.hero {
  margin-bottom: 1rem;
}
.kicker {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-ink);
  font-weight: 600;
}
h1 {
  font-family: var(--serif);
  font-size: clamp(2rem, 9vw, 3rem);
  line-height: 1.05;
  margin: 0;
  color: var(--ink-strong);
}
.records {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin: 1rem 0;
}
.records > div {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.6rem;
  text-align: center;
}
.rv {
  display: block;
  font-family: var(--serif);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--accent-ink);
}
.rl {
  font-size: 0.72rem;
  color: var(--muted);
}
.intro {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 1rem;
  line-height: 1.55;
  font-size: 0.95rem;
}
.opt {
  margin-top: 1.25rem;
}
h2 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
  margin: 0 0 0.5rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.chips button {
  font: inherit;
  min-height: 44px;
  padding: 0 1rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--ink);
  cursor: pointer;
}
.chips button.on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
}
.n {
  opacity: 0.6;
  font-size: 0.85em;
  margin-left: 0.15rem;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.75rem;
  min-height: 44px;
  cursor: pointer;
}
.toggle input {
  width: 1.3rem;
  height: 1.3rem;
  accent-color: var(--accent);
}
.rules-btn {
  font: inherit;
  background: none;
  border: 0;
  color: var(--accent-ink);
  padding: 0.5rem 0;
  cursor: pointer;
  font-weight: 600;
}
.rules {
  margin: 0.25rem 0 0;
  padding-left: 1.2rem;
  font-size: 0.92rem;
  line-height: 1.6;
}
.dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0.75rem 16px calc(0.75rem + env(safe-area-inset-bottom));
  background: linear-gradient(to top, var(--bg) 70%, transparent);
}
.cta {
  display: block;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  min-height: 56px;
  font: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  border: 0;
  border-radius: 14px;
  background: var(--accent);
  color: var(--on-accent);
  cursor: pointer;
  box-shadow: 0 6px 18px -6px var(--accent);
}
.cta:active {
  transform: scale(0.98);
}
.cta:disabled {
  opacity: 0.5;
}
</style>
