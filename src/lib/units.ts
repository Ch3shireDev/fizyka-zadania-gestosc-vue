// Wielkości fizyczne i jednostki. Wszystko liczymy wewnętrznie w SI
// (kg, m³, kg/m³, N), a użytkownik może podawać wynik w czym chce.

export type Quantity = 'mass' | 'volume' | 'density' | 'force'

export interface UnitDef {
  /** Identyfikator używany w YAML, np. "cm3", "g/cm3" */
  id: string
  /** Ładna etykieta do wyświetlenia w <select> */
  label: string
  /** Mnożnik do SI: wartość_SI = wartość * factor */
  factor: number
}

export const QUANTITY_LABELS: Record<Quantity, string> = {
  mass: 'masa',
  volume: 'objętość',
  density: 'gęstość',
  force: 'siła',
}

export const QUANTITY_SYMBOLS: Record<Quantity, string> = {
  mass: 'm',
  volume: 'V',
  density: 'ρ',
  force: 'F',
}

export const UNITS: Record<Quantity, UnitDef[]> = {
  mass: [
    { id: 'g', label: 'g', factor: 1e-3 },
    { id: 'kg', label: 'kg', factor: 1 },
  ],
  volume: [
    { id: 'cm3', label: 'cm³', factor: 1e-6 },
    { id: 'dm3', label: 'dm³', factor: 1e-3 },
    { id: 'm3', label: 'm³', factor: 1 },
  ],
  density: [
    { id: 'g/cm3', label: 'g/cm³', factor: 1000 },
    { id: 'kg/dm3', label: 'kg/dm³', factor: 1000 },
    { id: 'kg/m3', label: 'kg/m³', factor: 1 },
  ],
  force: [
    { id: 'N', label: 'N', factor: 1 },
    { id: 'kN', label: 'kN', factor: 1000 },
  ],
}

export function findUnit(quantity: Quantity, unitId: string): UnitDef {
  const unit = UNITS[quantity].find((u) => u.id === unitId)
  if (!unit) {
    throw new Error(`Nieznana jednostka "${unitId}" dla wielkości "${quantity}"`)
  }
  return unit
}

export function toSI(value: number, quantity: Quantity, unitId: string): number {
  return value * findUnit(quantity, unitId).factor
}

/**
 * Parsuje liczbę wpisaną przez człowieka: przecinek albo kropka,
 * spacje jako separator tysięcy, notacja 1e-3 też przejdzie.
 */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s+/g, '').replace(',', '.')
  if (cleaned === '' || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

const nf = new Intl.NumberFormat('pl-PL', { maximumSignificantDigits: 4 })

export function formatNumber(n: number): string {
  return nf.format(n)
}

/** Przelicza wartość z jednej jednostki na inną tej samej wielkości */
export function convert(value: number, quantity: Quantity, from: string, to: string): number {
  return (value * findUnit(quantity, from).factor) / findUnit(quantity, to).factor
}

export function isClose(actual: number, expected: number, relTol: number): boolean {
  if (expected === 0) return Math.abs(actual) < 1e-12
  return Math.abs(actual - expected) <= relTol * Math.abs(expected)
}

export type CheckResult =
  | { status: 'correct' }
  | { status: 'wrong-unit'; wouldMatchUnit: UnitDef }
  | { status: 'wrong' }
  | { status: 'invalid'; reason: string }

export interface ExpectedAnswer {
  quantity: Quantity
  value: number
  unit: string
}

/**
 * Sprawdza odpowiedź. Jeśli liczba pasuje do innej jednostki niż wybrana,
 * zwraca 'wrong-unit', żeby można było użytkownikowi wytknąć, co zepsuł.
 */
export function checkAnswer(
  raw: string,
  unitId: string,
  expected: ExpectedAnswer,
  relTol = 0.01,
): CheckResult {
  const value = parseNumber(raw)
  if (value === null) return { status: 'invalid', reason: 'To nie jest liczba.' }
  if (!unitId) return { status: 'invalid', reason: 'Wybierz jednostkę.' }

  const expectedSI = toSI(expected.value, expected.quantity, expected.unit)
  const givenSI = toSI(value, expected.quantity, unitId)
  if (isClose(givenSI, expectedSI, relTol)) return { status: 'correct' }

  const chosen = findUnit(expected.quantity, unitId)
  const match = UNITS[expected.quantity].find(
    (u) => u.factor !== chosen.factor && isClose(value * u.factor, expectedSI, relTol),
  )
  return match ? { status: 'wrong-unit', wouldMatchUnit: match } : { status: 'wrong' }
}
