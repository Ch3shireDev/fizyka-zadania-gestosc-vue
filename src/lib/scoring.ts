import {
  UNITS,
  convert,
  findUnit,
  formatNumber,
  isClose,
  parseNumber,
  toSI,
  type ExpectedAnswer,
  type Quantity,
} from './units'

// ───────────────────────────── Diagnoza odpowiedzi ─────────────────────────────

export interface Verdict {
  correct: boolean
  /** Krótki nagłówek: „Dobrze!”, „Zła jednostka” itd. */
  title: string
  /** Dlaczego źle (puste przy poprawnej odpowiedzi) */
  reason: string
  /** Poprawny wynik w jednostce wybranej przez gracza i w jednostce z bazy */
  expectedText: string
}

const FORMULA_HINT: Record<Quantity, string> = {
  mass: 'Masa to $m = \\rho \\cdot V$ (albo $m = F_g / g$).',
  volume: 'Objętość to $V = m / \\rho$.',
  density: 'Gęstość to $\\rho = m / V$.',
  force: 'Ciężar to $F_g = m \\cdot g$, a wypór $F_w = \\rho_{cieczy} \\cdot g \\cdot V$.',
}

const unitLabel = (q: Quantity, id: string) => findUnit(q, id).label

function expectedText(expected: ExpectedAnswer, chosenUnit: string): string {
  const base = `${formatNumber(expected.value)} ${unitLabel(expected.quantity, expected.unit)}`
  if (!chosenUnit || chosenUnit === expected.unit) return base
  const inChosen = convert(expected.value, expected.quantity, expected.unit, chosenUnit)
  const chosenText = `${formatNumber(inChosen)} ${unitLabel(expected.quantity, chosenUnit)}`
  return chosenText === base ? base : `${chosenText} = ${base}`
}

/** Sprawdza, czy stosunek jest (w przybliżeniu) potęgą dziesiątki różną od 1 */
function powerOfTen(ratio: number, tol: number): number | null {
  if (ratio <= 0) return null
  const k = Math.round(Math.log10(ratio))
  if (k === 0 || Math.abs(k) > 9) return null
  return isClose(ratio, 10 ** k, tol) ? k : null
}

/**
 * Ocena odpowiedzi z wyjaśnieniem, co poszło nie tak.
 * Zakłada, że wartość i jednostka zostały już zwalidowane (parseNumber != null, unit wybrany).
 */
export function diagnose(
  raw: string,
  unitId: string,
  expected: ExpectedAnswer,
  tol = 0.01,
): Verdict {
  const q = expected.quantity
  const value = parseNumber(raw) ?? NaN
  const exp = expectedText(expected, unitId)
  const givenSI = toSI(value, q, unitId)
  const expectedSI = toSI(expected.value, q, expected.unit)
  const ratio = givenSI / expectedSI

  if (isClose(givenSI, expectedSI, tol)) {
    return { correct: true, title: 'Dobrze!', reason: '', expectedText: exp }
  }

  const wrong = (title: string, reason: string): Verdict => ({
    correct: false,
    title,
    reason,
    expectedText: exp,
  })

  if (value < 0) {
    return wrong('Ujemny wynik?', 'Masy, objętości i gęstości nie bywają ujemne. Chyba że to antymateria, ale tej nie ma w zadaniu.')
  }

  // Dobra liczba, zła jednostka (g/cm³ i kg/dm³ mają ten sam mnożnik, więc się nie liczą)
  const chosen = findUnit(q, unitId)
  const other = UNITS[q].find((u) => u.factor !== chosen.factor && isClose(value * u.factor, expectedSI, tol))
  if (other) {
    return wrong(
      'Zła jednostka',
      `Liczba ${formatNumber(value)} byłaby dobra w ${other.label}, ale wybrałeś ${chosen.label}. Albo przelicz, albo kliknij właściwą jednostkę.`,
    )
  }

  // Pomylony ciężar z masą
  if (q === 'force' && isClose(ratio, 0.1, tol)) {
    return wrong('10 razy za mało', 'Wygląda na to, że podałeś masę w kg zamiast siły w N. Brakuje mnożenia przez $g = 10\\ \\tfrac{\\text{m}}{\\text{s}^2}$.')
  }
  if (q === 'mass' && isClose(ratio, 10, tol)) {
    return wrong('10 razy za dużo', 'To wygląda na ciężar w niutonach, a nie masę. Podziel przez $g = 10\\ \\tfrac{\\text{m}}{\\text{s}^2}$.')
  }

  // Błąd przeliczenia jednostek po drodze
  const k = powerOfTen(ratio, tol)
  if (k !== null) {
    const factor = formatNumber(10 ** Math.abs(k))
    return wrong(
      `${factor} razy za ${k > 0 ? 'dużo' : 'mało'}`,
      `Wzór pewnie dobry, ale gdzieś po drodze źle przeliczyłeś jednostki. Przypominajka: $1\\ \\text{dm}^3 = 1000\\ \\text{cm}^3$, $1\\ \\text{m}^3 = 1000\\ \\text{dm}^3$, $1\\ \\text{kg} = 1000\\ \\text{g}$.`,
    )
  }

  if (isClose(givenSI, expectedSI, 0.05)) {
    return wrong('Prawie', 'Blisko, ale za grube zaokrąglenie albo drobny błąd rachunkowy. Licz dokładniej, zaokrąglaj na końcu.')
  }

  return wrong(
    'Źle',
    `Wynik nie pasuje nawet po przeliczeniu jednostek, więc problem jest raczej we wzorze albo w danych. ${FORMULA_HINT[q]}`,
  )
}

// ───────────────────────────── Punkty i serie ─────────────────────────────

export const BASE_POINTS = 100
export const SPEED_BONUS_MAX = 50
export const SPEED_WINDOW_S = 45

export const STREAK_TIERS = [
  { from: 12, mult: 4, name: 'Vetinari' },
  { from: 8, mult: 3, name: 'Bibliotekarz' },
  { from: 5, mult: 2, name: 'Archimedes' },
  { from: 3, mult: 1.5, name: 'Rozgrzewka' },
  { from: 0, mult: 1, name: '' },
] as const

export function multiplierFor(streak: number): number {
  return STREAK_TIERS.find((t) => streak >= t.from)!.mult
}

/** Progi serii, przy których odpala się fajerwerk */
export const STREAK_MILESTONES = [3, 5, 8, 12, 20]

export interface Gain {
  base: number
  speed: number
  mult: number
  total: number
}

export function computeGain(partPoints: number, seconds: number, hintUsed: boolean, streakAfter: number): Gain {
  const base = Math.round(BASE_POINTS * partPoints * (hintUsed ? 0.5 : 1))
  const speed = Math.round(SPEED_BONUS_MAX * Math.max(0, 1 - seconds / SPEED_WINDOW_S))
  const mult = multiplierFor(streakAfter)
  return { base, speed, mult, total: Math.round((base + speed) * mult) }
}
