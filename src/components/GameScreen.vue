<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MarkdownTex from './MarkdownTex.vue'
import ConfettiBurst from './ConfettiBurst.vue'
import { NEXT_DELAY_MS, type Game } from '@/lib/game'
import { QUANTITY_LABELS, QUANTITY_SYMBOLS, UNITS } from '@/lib/units'
import { STREAK_TIERS } from '@/lib/scoring'
import { partPoints } from '@/lib/tasks'

const props = defineProps<{ game: Game }>()
const g = props.game
const s = g.state

const value = ref('')
const unit = ref('')
const error = ref('')
const storyOpen = ref(true)
const confettiKey = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)
const sheetEl = ref<HTMLElement | null>(null)

const step = computed(() => g.step.value!)
const part = computed(() => step.value.task.parts[step.value.partIndex]!)
const units = computed(() => UNITS[part.value.answer.quantity])
const partLetter = computed(() => String.fromCharCode(97 + step.value.partIndex))
const tierName = computed(() => STREAK_TIERS.find((t) => s.streak >= t.from)!.name)

const LORE: Record<string, string> = {
  archimedes: 'Archimedes',
  dysk: 'Świat Dysku',
  zwykłe: 'Codzienne',
}

const MILESTONE_TEXT: Record<number, string> = {
  3: 'Rozgrzewka zaliczona. Mnożnik ×1,5.',
  5: 'Archimedes biegnie przez Syrakuzy. Mnożnik ×2.',
  8: 'Ook! Ook! Bibliotekarz bije brawo. Mnożnik ×3.',
  12: 'Vetinari unosi brew. To u niego owacja na stojąco. Mnożnik ×4.',
  20: 'TO JUŻ PRZESADA. GRATULUJĘ. — ŚMIERĆ',
}

// ───── Licznik punktów z animacją ─────
const shownScore = ref(s.score)
const popup = ref<{ id: number; text: string } | null>(null)
let raf = 0
watch(
  () => s.score,
  (to, from) => {
    cancelAnimationFrame(raf)
    if (to > from) popup.value = { id: Date.now(), text: `+${(to - from).toLocaleString('pl-PL')}` }
    const t0 = performance.now()
    const dur = 700
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      shownScore.value = Math.round(from + (to - from) * (1 - (1 - k) ** 3))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  },
)

// ───── Reset pól przy nowym pytaniu ─────
const finePointer = typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine)').matches
watch(
  () => s.index,
  async () => {
    value.value = ''
    unit.value = ''
    error.value = ''
    storyOpen.value = g.isFirstPartOfTask.value
    window.scrollTo({ top: 0, behavior: 'smooth' })
    await nextTick()
    if (finePointer) inputEl.value?.focus()
  },
  { immediate: true },
)

// Konfetti przy progu serii albo bonusie za zadanie
watch(
  () => s.phase,
  async (p) => {
    if (p !== 'verdict') return
    if (s.milestone || s.taskBonus) confettiKey.value++
    await nextTick()
    sheetEl.value?.focus()
  },
)

function submit() {
  error.value = g.submit(value.value, unit.value) ?? ''
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && s.phase === 'verdict') {
    e.preventDefault()
    g.next()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  cancelAnimationFrame(raf)
})

const gainLine = computed(() => {
  const x = s.gain
  if (!x) return ''
  const bits = [`${x.base} baza`]
  if (x.speed) bits.push(`+${x.speed} tempo`)
  if (x.mult > 1) bits.push(`×${x.mult.toLocaleString('pl-PL')} seria`)
  return bits.join(' · ')
})

function quit() {
  if (confirm('Przerwać grę? Punkty z tej rundy przepadną jak srebro w koronie.')) g.toMenu()
}
</script>

<template>
  <div class="screen" :class="s.phase">
    <!-- HUD -->
    <header class="hud">
      <div class="bar" role="progressbar" :aria-valuenow="Math.round(g.progress.value * 100)" aria-valuemin="0" aria-valuemax="100">
        <div class="fill" :style="{ width: g.progress.value * 100 + '%' }" />
      </div>
      <div class="row">
        <button type="button" class="x" aria-label="Przerwij grę" @click="quit">✕</button>
        <span class="pos">Zadanie {{ step.taskNo }}/{{ s.taskCount }}</span>
        <span class="streak" :class="{ hot: s.streak >= 3 }" :title="tierName">
          🔥 {{ s.streak }}<b v-if="g.multiplier.value > 1"> ×{{ g.multiplier.value.toLocaleString('pl-PL') }}</b>
        </span>
        <span class="score">
          {{ shownScore.toLocaleString('pl-PL') }}
          <Transition name="pop">
            <span v-if="popup" :key="popup.id" class="popup">{{ popup.text }}</span>
          </Transition>
        </span>
      </div>
    </header>

    <!-- Treść -->
    <main class="content">
      <div class="title-row">
        <span v-if="step.task.lore" class="lore" :class="step.task.lore">{{ LORE[step.task.lore] ?? step.task.lore }}</span>
        <h1>{{ step.task.title }}</h1>
      </div>

      <section class="story" :class="{ closed: !storyOpen }">
        <MarkdownTex v-if="storyOpen" :source="step.task.story" />
        <button v-if="!g.isFirstPartOfTask.value" type="button" class="link" @click="storyOpen = !storyOpen">
          {{ storyOpen ? 'Zwiń historyjkę' : 'Przypomnij historyjkę' }}
        </button>
      </section>

      <section class="question">
        <div class="qhead">
          <span class="letter">{{ partLetter }})</span>
          <span class="qmeta">{{ step.partIndex + 1 }}/{{ step.task.parts.length }} · {{ partPoints(part) * 100 }} pkt</span>
        </div>
        <MarkdownTex :source="part.question" />

        <div v-if="part.hint" class="hint-wrap">
          <button
            v-if="!s.hintUsed"
            type="button"
            class="link"
            :disabled="s.phase !== 'answering'"
            @click="g.useHint()"
          >
            💡 Wskazówka (−50% punktów bazowych)
          </button>
          <MarkdownTex v-else class="hint" :source="part.hint" />
        </div>
      </section>
    </main>

    <!-- Dolny panel: odpowiedź albo werdykt -->
    <div class="dock">
      <form v-if="s.phase !== 'verdict'" class="answer" @submit.prevent="submit">
        <div class="field">
          <label class="sym" for="ans">{{ QUANTITY_SYMBOLS[part.answer.quantity] }} =</label>
          <input
            id="ans"
            ref="inputEl"
            v-model="value"
            type="text"
            inputmode="decimal"
            enterkeyhint="done"
            autocomplete="off"
            :placeholder="QUANTITY_LABELS[part.answer.quantity]"
            :disabled="s.phase === 'checking'"
            @input="error = ''"
          />
        </div>
        <div class="units" role="radiogroup" aria-label="Jednostka">
          <button
            v-for="u in units"
            :key="u.id"
            type="button"
            role="radio"
            :aria-checked="unit === u.id"
            :class="{ on: unit === u.id }"
            :disabled="s.phase === 'checking'"
            @click="unit = u.id; error = ''"
          >
            {{ u.label }}
          </button>
        </div>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <button type="submit" class="cta" :disabled="s.phase === 'checking'">
          <template v-if="s.phase === 'checking'">
            <span class="dots"><i /><i /><i /></span> Sprawdzam
          </template>
          <template v-else>Sprawdź</template>
        </button>
      </form>

      <section
        v-else-if="s.verdict"
        ref="sheetEl"
        tabindex="-1"
        class="sheet"
        :class="s.verdict.correct ? 'good' : 'bad'"
        aria-live="assertive"
      >
        <div class="sheet-scroll">
          <div class="vhead">
            <span class="icon">{{ s.verdict.correct ? '✓' : '✗' }}</span>
            <div>
              <h2>{{ s.verdict.title }}</h2>
              <p v-if="s.gain" class="gain">+{{ s.gain.total.toLocaleString('pl-PL') }} pkt <small>{{ gainLine }}</small></p>
            </div>
          </div>

          <div v-if="s.milestone" class="banner streak-banner">
            <b>SERIA {{ s.milestone }}!</b> {{ MILESTONE_TEXT[s.milestone] }}
          </div>
          <div v-if="s.brokenStreak" class="banner broken">
            Seria {{ s.brokenStreak }} przepadła. Bagaż ją zjadł.
          </div>

          <template v-if="!s.verdict.correct">
            <p class="yours">Twoja odpowiedź: <b>{{ s.lastAnswer.value }} {{ units.find((u) => u.id === s.lastAnswer.unit)?.label }}</b></p>
            <MarkdownTex class="reason" :source="s.verdict.reason" />
            <p class="expected">Poprawnie: <b>{{ s.verdict.expectedText }}</b></p>
            <details v-if="part.solution" class="solution">
              <summary>Rozwiązanie krok po kroku</summary>
              <MarkdownTex :source="part.solution" />
            </details>
          </template>

          <div v-if="s.taskBonus" class="banner bonus">
            <b>+{{ s.taskBonus.points.toLocaleString('pl-PL') }} bonus!</b> {{ s.taskBonus.reason }}
          </div>
          <MarkdownTex
            v-if="g.isLastPartOfTask.value && step.task.epilogue"
            class="epilogue"
            :source="step.task.epilogue"
          />
        </div>

        <button
          type="button"
          class="cta next"
          :class="{ locked: !s.canContinue }"
          :disabled="!s.canContinue"
          :style="{ '--lock': NEXT_DELAY_MS + 'ms' }"
          @click="g.next()"
        >
          <span class="lockfill" />
          <span class="label">{{ s.index + 1 >= s.steps.length ? 'Wyniki' : 'Dalej' }} →</span>
        </button>
      </section>
    </div>

    <ConfettiBurst v-if="confettiKey" :key="confettiKey" />
  </div>
</template>

<style scoped>
.screen {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* ───── HUD ───── */
.hud {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg);
  padding-top: env(safe-area-inset-top);
  border-bottom: 1px solid var(--line);
}
.bar {
  height: 4px;
  background: var(--line);
}
.fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.5s ease;
}
.row {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 16px;
  font-size: 0.9rem;
}
.x {
  font: inherit;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  margin-left: -8px;
}
.pos {
  color: var(--muted);
  flex: 1;
  white-space: nowrap;
}
.streak {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: var(--box);
  white-space: nowrap;
  transition: background 0.3s, transform 0.3s;
}
.streak.hot {
  background: var(--fire-soft);
  color: var(--fire-ink);
  animation: throb 1.6s ease-in-out infinite;
}
.score {
  position: relative;
  font-family: var(--serif);
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--accent-ink);
  min-width: 4ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.popup {
  position: absolute;
  right: 0;
  top: 100%;
  font-size: 0.85rem;
  color: var(--ok);
  white-space: nowrap;
  animation: float-up 1.4s ease-out forwards;
}

/* ───── Treść ───── */
.content {
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem 16px 16rem; /* miejsce na dolny panel */
}
.title-row h1 {
  font-family: var(--serif);
  font-size: clamp(1.4rem, 6vw, 1.9rem);
  line-height: 1.15;
  margin: 0.35rem 0 0.75rem;
  color: var(--ink-strong);
}
.lore {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--box);
  color: var(--muted);
}
.lore.archimedes {
  background: var(--gold-soft);
  color: var(--gold-ink);
}
.lore.dysk {
  background: var(--octarine-soft);
  color: var(--octarine-ink);
}
.story {
  line-height: 1.6;
  font-size: 1rem;
}
.story.closed {
  margin-bottom: -0.25rem;
}
.question {
  margin-top: 1.1rem;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 0.9rem 1rem 1rem;
  font-size: 1.05rem;
  line-height: 1.55;
  box-shadow: 0 2px 0 var(--shadow);
}
.qhead {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25rem;
}
.letter {
  font-family: var(--serif);
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--accent-ink);
}
.qmeta {
  font-size: 0.78rem;
  color: var(--muted);
}
.hint-wrap {
  margin-top: 0.6rem;
}
.hint {
  background: var(--box);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  font-size: 0.95rem;
}
.link {
  font: inherit;
  font-size: 0.92rem;
  background: none;
  border: 0;
  padding: 0.4rem 0;
  color: var(--accent-ink);
  cursor: pointer;
  font-weight: 600;
}
.link:disabled {
  opacity: 0.5;
}

/* ───── Dolny panel ───── */
.dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background: var(--card);
  border-top: 1px solid var(--line);
  box-shadow: 0 -10px 30px -12px rgba(0, 0, 0, 0.25);
  border-radius: 18px 18px 0 0;
  padding: 0.85rem 16px calc(0.85rem + env(safe-area-inset-bottom));
}
.answer,
.sheet {
  max-width: 640px;
  margin: 0 auto;
}
.field {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.sym {
  font-family: 'KaTeX_Math', var(--serif);
  font-style: italic;
  font-size: 1.35rem;
  white-space: nowrap;
}
.field input {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 1.25rem; /* ≥16px, żeby iOS nie zoomował */
  padding: 0.65rem 0.8rem;
  border-radius: 12px;
  border: 2px solid var(--line);
  background: var(--field);
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.field input:focus {
  outline: none;
  border-color: var(--accent);
}
.units {
  display: flex;
  gap: 0.45rem;
  margin-top: 0.65rem;
}
.units button {
  flex: 1;
  min-height: 46px;
  font: inherit;
  font-size: 1rem;
  border-radius: 12px;
  border: 2px solid var(--line);
  background: var(--field);
  color: var(--ink);
  cursor: pointer;
  transition: transform 0.1s;
}
.units button.on {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
}
.units button:active {
  transform: scale(0.96);
}
.err {
  margin: 0.55rem 0 0;
  color: var(--bad);
  font-size: 0.9rem;
}
.cta {
  position: relative;
  overflow: hidden;
  display: block;
  width: 100%;
  min-height: 54px;
  margin-top: 0.75rem;
  font: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  border: 0;
  border-radius: 14px;
  background: var(--accent);
  color: var(--on-accent);
  cursor: pointer;
}
.cta:active:not(:disabled) {
  transform: scale(0.98);
}
.cta:disabled {
  cursor: default;
}
.checking .answer .cta {
  opacity: 0.85;
}
.dots {
  display: inline-flex;
  gap: 4px;
  margin-right: 0.4rem;
  vertical-align: middle;
}
.dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  animation: dot 0.9s infinite ease-in-out;
}
.dots i:nth-child(2) {
  animation-delay: 0.15s;
}
.dots i:nth-child(3) {
  animation-delay: 0.3s;
}

/* ───── Werdykt ───── */
.sheet {
  outline: none;
  animation: slide-up 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}
.sheet-scroll {
  max-height: min(60dvh, 30rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.vhead {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.icon {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  font-weight: 800;
  color: #fff;
}
.good .icon {
  background: var(--ok);
  animation: bounce 0.5s ease;
}
.bad .icon {
  background: var(--bad);
  animation: shake 0.45s ease;
}
.vhead h2 {
  margin: 0;
  font-family: var(--serif);
  font-size: 1.45rem;
}
.good h2 {
  color: var(--ok);
}
.bad h2 {
  color: var(--bad);
}
.gain {
  margin: 0.1rem 0 0;
  font-weight: 700;
  color: var(--ok);
}
.gain small {
  font-weight: 400;
  color: var(--muted);
  margin-left: 0.3rem;
}
.yours,
.expected {
  margin: 0.75rem 0 0;
}
.reason {
  margin-top: 0.5rem;
  line-height: 1.5;
}
.expected b {
  color: var(--ok);
}
.solution {
  margin-top: 0.75rem;
  background: var(--box);
  border-radius: 10px;
  padding: 0.5rem 0.8rem;
}
.solution summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--accent-ink);
  min-height: 32px;
  display: flex;
  align-items: center;
}
.banner {
  margin-top: 0.75rem;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  font-size: 0.95rem;
}
.streak-banner {
  background: var(--fire-soft);
  color: var(--fire-ink);
  animation: bounce 0.6s ease;
}
.broken {
  background: var(--box);
  color: var(--muted);
}
.bonus {
  background: var(--gold-soft);
  color: var(--gold-ink);
  animation: bounce 0.6s ease 0.2s both;
}
.epilogue {
  margin-top: 0.75rem;
  font-size: 0.92rem;
  color: var(--muted);
  border-left: 3px solid var(--line);
  padding-left: 0.75rem;
}
.next .label {
  position: relative;
}
.next .lockfill {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.25);
  transform-origin: left;
  transform: scaleX(0);
}
.next.locked {
  opacity: 0.8;
}
.next.locked .lockfill {
  animation: lock var(--lock) linear forwards;
}

/* ───── Animacje ───── */
@keyframes slide-up {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
}
@keyframes bounce {
  0% {
    transform: scale(0.6);
  }
  60% {
    transform: scale(1.12);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes shake {
  20%,
  60% {
    transform: translateX(-6px);
  }
  40%,
  80% {
    transform: translateX(6px);
  }
}
@keyframes dot {
  0%,
  80%,
  100% {
    transform: scale(0.5);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes lock {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
@keyframes throb {
  50% {
    transform: scale(1.07);
  }
}
@keyframes float-up {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }
  15% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-28px);
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
  }
}
@media (min-width: 700px) {
  .dock {
    left: 50%;
    right: auto;
    width: 640px;
    transform: translateX(-50%);
    border-left: 1px solid var(--line);
    border-right: 1px solid var(--line);
  }
}
</style>
