import { parse } from 'yaml'
import rawYaml from '@/data/zadania.yml?raw'
import { findUnit, type ExpectedAnswer, type Quantity } from './units'

export interface TaskPart {
  question: string
  answer: ExpectedAnswer
  /** Względna tolerancja, domyślnie 1% */
  tolerance?: number
  points?: number
  hint?: string
  solution?: string
}

export interface Task {
  id: string
  title: string
  /** Kategorie do filtrowania, np. masa, objętość, gęstość, ciężar, wyporność */
  tags: string[]
  /** Uniwersum: archimedes, dysk, zwykłe */
  lore?: string
  story: string
  parts: TaskPart[]
  /** Dodatkowe punkty za całe zadanie (za historyjkę, nie za zasługi) */
  bonus?: number
  bonusReason?: string
  /** Ciekawostka po rozwiązaniu */
  epilogue?: string
}

export interface TaskBank {
  title: string
  intro?: string
  tasks: Task[]
}

const QUANTITIES: Quantity[] = ['mass', 'volume', 'density', 'force']

function fail(where: string, msg: string): never {
  throw new Error(`zadania.yml → ${where}: ${msg}`)
}

/** Walidacja, żeby literówka w YAML-u nie kończyła się białą stroną bez komunikatu */
function validate(bank: TaskBank): TaskBank {
  if (!bank || !Array.isArray(bank.tasks)) fail('root', 'brak listy "tasks"')
  const ids = new Set<string>()
  bank.tasks.forEach((t, ti) => {
    const where = `tasks[${ti}] (${t.id ?? '?'})`
    if (!t.id) fail(where, 'brak "id"')
    if (ids.has(t.id)) fail(where, `zduplikowane id "${t.id}"`)
    ids.add(t.id)
    if (!t.title) fail(where, 'brak "title"')
    if (!t.story) fail(where, 'brak "story"')
    if (!Array.isArray(t.parts) || t.parts.length === 0) fail(where, 'brak "parts"')
    t.tags ??= []
    t.parts.forEach((p, pi) => {
      const pw = `${where}.parts[${pi}]`
      if (!p.question) fail(pw, 'brak "question"')
      if (!p.answer) fail(pw, 'brak "answer"')
      if (!QUANTITIES.includes(p.answer.quantity)) fail(pw, `zła wielkość "${p.answer.quantity}"`)
      if (typeof p.answer.value !== 'number') fail(pw, '"answer.value" musi być liczbą')
      try {
        findUnit(p.answer.quantity, String(p.answer.unit))
      } catch (e) {
        fail(pw, (e as Error).message)
      }
    })
  })
  return bank
}

export function loadTaskBank(): TaskBank {
  return validate(parse(rawYaml) as TaskBank)
}

export function partPoints(p: TaskPart): number {
  return p.points ?? 1
}

export function maxPoints(t: Task): number {
  return t.parts.reduce((s, p) => s + partPoints(p), 0) + (t.bonus ?? 0)
}
