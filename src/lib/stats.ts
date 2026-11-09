// Rekordy trzymane w przeglądarce. Jak localStorage nie działa, rekordy po prostu
// nie przetrwają odświeżenia, a świat się nie zawali.

export interface Records {
  bestScore: number
  bestStreak: number
  games: number
}

const KEY = 'eureka-records-v1'

export function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { bestScore: 0, bestStreak: 0, games: 0, ...(JSON.parse(raw) as Partial<Records>) }
  } catch {
    /* tryb prywatny */
  }
  return { bestScore: 0, bestStreak: 0, games: 0 }
}

export function saveRecords(r: Records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r))
  } catch {
    /* trudno */
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* iOS i tak nie wibruje, bo Apple wie lepiej */
  }
}
