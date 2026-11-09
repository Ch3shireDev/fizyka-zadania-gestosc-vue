<script setup lang="ts">
import { computed, ref } from 'vue'
import MarkdownTex from './MarkdownTex.vue'
import { checkAnswer, QUANTITY_LABELS, QUANTITY_SYMBOLS, UNITS, findUnit } from '@/lib/units'
import { partPoints, type TaskPart } from '@/lib/tasks'
import { markPart, partKey, progress } from '@/lib/progress'

const props = defineProps<{ taskId: string; index: number; part: TaskPart }>()

const value = ref('')
const unit = ref('')
const attempts = ref(0)
const showHint = ref(false)
const showSolution = ref(false)
const feedback = ref<{ kind: 'ok' | 'bad' | 'warn'; text: string } | null>(null)

const state = computed(() => progress[partKey(props.taskId, props.index)])
const units = computed(() => UNITS[props.part.answer.quantity])
const label = computed(() => String.fromCharCode(97 + props.index)) // a, b, c...

const pick = (pool: string[]) => pool[Math.floor(Math.random() * pool.length)]!

const PRAISE = [
  'Poprawnie. Archimedes byłby dumny, choć pewnie nadal bez ręcznika.',
  'Dobrze. Bibliotekarz mówi „Ook”, co w tym kontekście oznacza aprobatę.',
  'Zgadza się. Złotnik właśnie poczuł chłód na karku.',
  'Poprawnie. ŚMIERĆ KIWA GŁOWĄ Z UZNANIEM.',
  'Trafione. Nawet Rincewind by tego nie zepsuł. No, może by zepsuł.',
]
const WRONG = [
  'Nie. Spróbuj jeszcze raz, tym razem z fizyką.',
  'Pudło. Bagaż patrzy na ciebie. Bagaż nie ma oczu, a i tak patrzy.',
  'Źle. Sprawdź wzór, a potem jednostki. Potem znowu jednostki.',
  'Nie tym razem. Woda dalej się wylewa, a odpowiedź dalej jest zła.',
]

function submit() {
  const result = checkAnswer(value.value, unit.value, props.part.answer, props.part.tolerance ?? 0.01)
  if (result.status === 'invalid') {
    feedback.value = { kind: 'warn', text: result.reason }
    return
  }
  attempts.value++
  if (result.status === 'correct') {
    markPart(props.taskId, props.index, 'correct')
    feedback.value = { kind: 'ok', text: pick(PRAISE) }
  } else if (result.status === 'wrong-unit') {
    feedback.value = {
      kind: 'bad',
      text: `Liczba byłaby dobra, gdyby to były ${result.wouldMatchUnit.label}, a nie ${findUnit(props.part.answer.quantity, unit.value).label}. Przelicz albo zmień jednostkę.`,
    }
  } else {
    feedback.value = { kind: 'bad', text: pick(WRONG) }
  }
}

function giveUp() {
  if (!state.value) markPart(props.taskId, props.index, 'revealed')
  showSolution.value = true
}
</script>

<template>
  <div class="part" :class="state">
    <div class="question">
      <span class="label">{{ label }})</span>
      <MarkdownTex :source="part.question" />
      <span class="pts">{{ partPoints(part) }} pkt</span>
    </div>

    <form class="answer" @submit.prevent="submit">
      <span class="sym">{{ QUANTITY_SYMBOLS[part.answer.quantity] }} =</span>
      <input
        v-model="value"
        inputmode="decimal"
        autocomplete="off"
        :placeholder="QUANTITY_LABELS[part.answer.quantity]"
        :aria-label="`Wartość: ${QUANTITY_LABELS[part.answer.quantity]}`"
        :disabled="state === 'correct'"
      />
      <select v-model="unit" aria-label="Jednostka" :disabled="state === 'correct'">
        <option value="" disabled>jednostka</option>
        <option v-for="u in units" :key="u.id" :value="u.id">{{ u.label }}</option>
      </select>
      <button type="submit" class="primary" :disabled="state === 'correct'">Sprawdź</button>
    </form>

    <p v-if="feedback" class="feedback" :class="feedback.kind" role="status">{{ feedback.text }}</p>
    <p v-if="state === 'revealed'" class="feedback warn">
      Podejrzane rozwiązanie. Możesz dalej ćwiczyć, ale punktów z tego nie będzie.
    </p>

    <div class="tools">
      <button v-if="part.hint" type="button" class="ghost" @click="showHint = !showHint">
        {{ showHint ? 'Schowaj wskazówkę' : 'Wskazówka' }}
      </button>
      <button
        v-if="part.solution && (state || attempts > 0)"
        type="button"
        class="ghost"
        @click="state ? (showSolution = !showSolution) : giveUp()"
      >
        {{ showSolution ? 'Schowaj rozwiązanie' : state ? 'Rozwiązanie' : 'Poddaję się' }}
      </button>
    </div>

    <div v-if="showHint && part.hint" class="box hint"><MarkdownTex :source="part.hint" /></div>
    <div v-if="showSolution && part.solution" class="box solution">
      <MarkdownTex :source="part.solution" />
    </div>
  </div>
</template>

<style scoped>
.part {
  border-left: 3px solid var(--line);
  padding: 0.75rem 0 0.75rem 1rem;
  margin-top: 0.75rem;
}
.part.correct {
  border-left-color: var(--ok);
}
.part.revealed {
  border-left-color: var(--warn);
}
.question {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: baseline;
}
.label {
  font-weight: 700;
  color: var(--accent-ink);
}
.pts {
  font-size: 0.8rem;
  color: var(--muted);
  white-space: nowrap;
}
.answer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.75rem;
}
.sym {
  font-family: 'KaTeX_Math', serif;
  font-style: italic;
  font-size: 1.15rem;
}
input,
select {
  font: inherit;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--field);
  color: var(--ink);
}
input {
  width: 9rem;
}
input:focus,
select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
button {
  font: inherit;
  cursor: pointer;
  border-radius: 6px;
  padding: 0.45rem 0.9rem;
  border: 1px solid transparent;
}
button:disabled,
input:disabled,
select:disabled {
  opacity: 0.55;
  cursor: default;
}
.primary {
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
}
.ghost {
  background: transparent;
  border-color: var(--line);
  color: var(--ink);
  font-size: 0.9rem;
  padding: 0.3rem 0.7rem;
}
.tools {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.6rem;
}
.feedback {
  margin: 0.6rem 0 0;
  font-size: 0.95rem;
}
.feedback.ok {
  color: var(--ok);
}
.feedback.bad {
  color: var(--bad);
}
.feedback.warn {
  color: var(--warn);
}
.box {
  margin-top: 0.6rem;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  background: var(--box);
}
.solution {
  border: 1px dashed var(--line);
}
</style>
