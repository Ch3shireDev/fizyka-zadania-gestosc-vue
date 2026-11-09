import { reactive, watch } from 'vue'

// Postęp: dla każdego podpunktu "correct" (rozwiązany sam) albo "revealed"
// (podejrzał rozwiązanie, punktów brak, wstyd zostaje).
export type PartState = 'correct' | 'revealed'

const STORAGE_KEY = 'eureka-progress-v1'

function load(): Record<string, PartState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, PartState>) : {}
  } catch {
    return {}
  }
}

export const progress = reactive<Record<string, PartState>>(load())

watch(progress, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // tryb prywatny albo zablokowane ciasteczka: trudno, postęp zniknie po odświeżeniu
  }
})

export const partKey = (taskId: string, index: number) => `${taskId}#${index}`

export function markPart(taskId: string, index: number, state: PartState) {
  const key = partKey(taskId, index)
  // Pierwszy stan wygrywa: podejrzane zostaje podejrzane, rozwiązane zostaje rozwiązane.
  if (progress[key]) return
  progress[key] = state
}

export function resetProgress() {
  for (const key of Object.keys(progress)) delete progress[key]
}
