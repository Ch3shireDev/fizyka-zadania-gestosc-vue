<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ConfettiBurst from './ConfettiBurst.vue'
import type { Game } from '@/lib/game'

const props = defineProps<{ game: Game }>()
const s = props.game.state

const accuracy = computed(() => (s.answeredCount ? Math.round((s.correctCount / s.answeredCount) * 100) : 0))

const rank = computed(() => {
  const a = accuracy.value
  if (a === 100) return { name: 'Patrycjusz Vetinari', note: 'Wiedziałeś wszystko od początku. Jak zawsze.' }
  if (a >= 85) return { name: 'Archimedes', note: 'Genialnie. Teraz załóż coś na siebie.' }
  if (a >= 65) return { name: 'Bibliotekarz', note: 'Ook. (Czyli: całkiem nieźle.)' }
  if (a >= 45) return { name: 'Kapral Nobbs', note: 'Formalnie człowiek, formalnie zaliczone.' }
  if (a >= 25) return { name: 'Uczeń złotnika', note: 'Ktoś tu dosypuje srebra do wyników.' }
  return { name: 'Rincewind', note: 'Klasyczna strategia: uciekać. Z fizyki też się da.' }
})

// Wynik nabija się od zera, bo dopamina sama się nie wyprodukuje
const shown = ref(0)
onMounted(() => {
  const target = s.score
  const t0 = performance.now()
  const dur = 1200
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / dur)
    shown.value = Math.round(target * (1 - (1 - k) ** 3))
    if (k < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

function again() {
  props.game.toMenu()
}
</script>

<template>
  <div class="screen">
    <p class="kicker">Koniec rundy</p>
    <div class="big">{{ shown.toLocaleString('pl-PL') }}</div>
    <p class="pts">punktów</p>
    <p v-if="s.newRecord" class="record">🏆 Nowy rekord!</p>

    <div class="rank">
      <span class="rname">{{ rank.name }}</span>
      <span class="rnote">{{ rank.note }}</span>
    </div>

    <div class="stats">
      <div><b>{{ s.correctCount }}/{{ s.answeredCount }}</b><span>poprawnych</span></div>
      <div><b>{{ accuracy }}%</b><span>skuteczność</span></div>
      <div><b>🔥 {{ s.bestStreak }}</b><span>najdłuższa seria</span></div>
      <div><b>{{ s.hintsTotal }}</b><span>wskazówek</span></div>
    </div>

    <p class="best">Rekord wszech czasów: {{ s.records.bestScore.toLocaleString('pl-PL') }} pkt · seria {{ s.records.bestStreak }}</p>

    <div class="dock">
      <button type="button" class="cta" @click="again">Jeszcze raz</button>
    </div>

    <ConfettiBurst v-if="s.newRecord || accuracy >= 85" />
  </div>
</template>

<style scoped>
.screen {
  max-width: 640px;
  margin: 0 auto;
  min-height: 100dvh;
  padding: calc(2.5rem + env(safe-area-inset-top)) 16px calc(6.5rem + env(safe-area-inset-bottom));
  text-align: center;
}
.kicker {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.big {
  font-family: var(--serif);
  font-size: clamp(3.5rem, 18vw, 5.5rem);
  font-weight: 800;
  line-height: 1;
  margin-top: 0.75rem;
  color: var(--accent-ink);
  font-variant-numeric: tabular-nums;
}
.pts {
  margin: 0.2rem 0 0;
  color: var(--muted);
}
.record {
  display: inline-block;
  margin: 1rem 0 0;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  background: var(--gold-soft);
  color: var(--gold-ink);
  font-weight: 700;
  animation: bounce 0.7s ease 0.9s both;
}
.rank {
  margin: 1.5rem auto 0;
  padding: 1rem;
  border-radius: 14px;
  background: var(--card);
  border: 1px solid var(--line);
  display: grid;
  gap: 0.2rem;
}
.rname {
  font-family: var(--serif);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink-strong);
}
.rnote {
  color: var(--muted);
}
.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-top: 1rem;
}
.stats > div {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.75rem 0.5rem;
  display: grid;
}
.stats b {
  font-size: 1.35rem;
  font-family: var(--serif);
}
.stats span {
  font-size: 0.78rem;
  color: var(--muted);
}
.best {
  margin-top: 1.25rem;
  font-size: 0.85rem;
  color: var(--muted);
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
}
@keyframes bounce {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  60% {
    transform: scale(1.12);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}
@media (min-width: 520px) {
  .stats {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
