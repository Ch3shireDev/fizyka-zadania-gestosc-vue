import { computed, reactive } from 'vue'
import type { Task, TaskBank } from './tasks'
import { partPoints } from './tasks'
import { parseNumber } from './units'
import {
  BASE_POINTS,
  STREAK_MILESTONES,
  computeGain,
  diagnose,
  multiplierFor,
  type Gain,
  type Verdict,
} from './scoring'
import { loadRecords, saveRecords, vibrate, type Records } from './stats'

/** Napięcie przed werdyktem */
export const CHECK_DELAY_MS = 900
/** Ile trzeba poczekać, zanim da się kliknąć „Dalej” (czas na przeczytanie, czemu źle) */
export const NEXT_DELAY_MS = 1500

export type Phase = 'start' | 'answering' | 'checking' | 'verdict' | 'end'

export interface Step {
  task: Task
  /** Numer zadania w tej rozgrywce (od 1) */
  taskNo: number
  partIndex: number
}

export interface GameConfig {
  lore: string // '' = wszystko
  shuffle: boolean
  limit: number // 0 = wszystkie
}

interface TaskBonus {
  points: number
  reason: string
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function useGame(bank: TaskBank) {
  const s = reactive({
    phase: 'start' as Phase,
    steps: [] as Step[],
    taskCount: 0,
    index: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    answeredCount: 0,
    hintUsed: false,
    hintsTotal: 0,
    questionStartedAt: 0,
    verdict: null as Verdict | null,
    gain: null as Gain | null,
    milestone: null as number | null,
    brokenStreak: 0,
    taskBonus: null as TaskBonus | null,
    taskClean: {} as Record<string, boolean>,
    canContinue: false,
    records: loadRecords() as Records,
    newRecord: false,
    lastAnswer: { value: '', unit: '' },
  })

  let timers: ReturnType<typeof setTimeout>[] = []
  const clearTimers = () => {
    timers.forEach(clearTimeout)
    timers = []
  }
  const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms))

  const step = computed(() => s.steps[s.index] ?? null)
  const isFirstPartOfTask = computed(() => step.value?.partIndex === 0)
  const isLastPartOfTask = computed(
    () => !!step.value && step.value.partIndex === step.value.task.parts.length - 1,
  )
  const multiplier = computed(() => multiplierFor(s.streak))
  const progress = computed(() => (s.steps.length ? s.index / s.steps.length : 0))

  function availableTasks(lore: string) {
    return bank.tasks.filter((t) => !lore || t.lore === lore)
  }

  function start(cfg: GameConfig) {
    clearTimers()
    let tasks = availableTasks(cfg.lore)
    if (cfg.shuffle) tasks = shuffled(tasks)
    if (cfg.limit > 0) tasks = tasks.slice(0, cfg.limit)

    s.steps = tasks.flatMap((task, ti) =>
      task.parts.map((_, partIndex) => ({ task, taskNo: ti + 1, partIndex })),
    )
    s.taskCount = tasks.length
    s.index = 0
    s.score = 0
    s.streak = 0
    s.bestStreak = 0
    s.correctCount = 0
    s.answeredCount = 0
    s.hintsTotal = 0
    s.taskClean = Object.fromEntries(tasks.map((t) => [t.id, true]))
    s.newRecord = false
    beginQuestion()
  }

  function beginQuestion() {
    s.phase = 'answering'
    s.hintUsed = false
    s.verdict = null
    s.gain = null
    s.milestone = null
    s.brokenStreak = 0
    s.taskBonus = null
    s.canContinue = false
    s.lastAnswer = { value: '', unit: '' }
    s.questionStartedAt = performance.now()
  }

  function useHint() {
    if (s.phase !== 'answering' || s.hintUsed) return
    s.hintUsed = true
    s.hintsTotal++
  }

  /** Zwraca komunikat walidacji albo null, jeśli odpowiedź poszła do sprawdzenia */
  function submit(raw: string, unit: string): string | null {
    const st = step.value
    if (!st || s.phase !== 'answering') return null
    if (parseNumber(raw) === null) return 'To nie jest liczba. Przecinek albo kropka, bez liter.'
    if (!unit) return 'Wybierz jednostkę. Bez jednostki to nie fizyka, tylko numerologia.'

    const seconds = (performance.now() - s.questionStartedAt) / 1000
    s.lastAnswer = { value: raw, unit }
    s.phase = 'checking'

    later(() => {
      const part = st.task.parts[st.partIndex]!
      const verdict = diagnose(raw, unit, part.answer, part.tolerance ?? 0.01)
      s.verdict = verdict
      s.answeredCount++

      if (verdict.correct) {
        s.correctCount++
        s.streak++
        s.bestStreak = Math.max(s.bestStreak, s.streak)
        s.gain = computeGain(partPoints(part), seconds, s.hintUsed, s.streak)
        s.score += s.gain.total
        if (STREAK_MILESTONES.includes(s.streak)) {
          s.milestone = s.streak
          vibrate([20, 40, 20, 40, 80])
        } else {
          vibrate(25)
        }
      } else {
        s.brokenStreak = s.streak >= 3 ? s.streak : 0
        s.streak = 0
        s.taskClean[st.task.id] = false
        vibrate([70, 50, 70])
      }

      if (isLastPartOfTask.value && s.taskClean[st.task.id] && st.task.bonus) {
        s.taskBonus = {
          points: st.task.bonus * BASE_POINTS,
          reason: st.task.bonusReason ?? 'Bezbłędne zadanie.',
        }
        s.score += s.taskBonus.points
      }

      s.phase = 'verdict'
      later(() => (s.canContinue = true), NEXT_DELAY_MS)
    }, CHECK_DELAY_MS)

    return null
  }

  function next() {
    if (s.phase !== 'verdict' || !s.canContinue) return
    if (s.index + 1 >= s.steps.length) return finish()
    s.index++
    beginQuestion()
  }

  function finish() {
    clearTimers()
    const r = s.records
    s.newRecord = s.score > r.bestScore
    s.records = {
      bestScore: Math.max(r.bestScore, s.score),
      bestStreak: Math.max(r.bestStreak, s.bestStreak),
      games: r.games + 1,
    }
    saveRecords(s.records)
    s.phase = 'end'
  }

  function toMenu() {
    clearTimers()
    s.phase = 'start'
  }

  return {
    state: s,
    step,
    isFirstPartOfTask,
    isLastPartOfTask,
    multiplier,
    progress,
    availableTasks,
    start,
    useHint,
    submit,
    next,
    finish,
    toMenu,
  }
}

export type Game = ReturnType<typeof useGame>
