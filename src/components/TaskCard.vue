<script setup lang="ts">
import { computed } from 'vue'
import MarkdownTex from './MarkdownTex.vue'
import AnswerPart from './AnswerPart.vue'
import { maxPoints, type Task } from '@/lib/tasks'
import { partKey, progress } from '@/lib/progress'

const props = defineProps<{ task: Task; number: number }>()

const LORE: Record<string, string> = {
  archimedes: 'Archimedes',
  dysk: 'Świat Dysku',
  zwykłe: 'Życie codzienne',
}

const states = computed(() => props.task.parts.map((_, i) => progress[partKey(props.task.id, i)]))
const allCorrect = computed(() => states.value.every((s) => s === 'correct'))
const allDone = computed(() => states.value.every((s) => s))
</script>

<template>
  <article class="card" :id="task.id">
    <header>
      <span class="num">{{ number }}</span>
      <h2>{{ task.title }}</h2>
      <span v-if="task.lore" class="lore" :class="task.lore">{{ LORE[task.lore] ?? task.lore }}</span>
    </header>

    <div class="meta">
      <span v-for="tag in task.tags" :key="tag" class="tag">{{ tag }}</span>
      <span class="max">do {{ maxPoints(task) }} pkt</span>
    </div>

    <MarkdownTex class="story" :source="task.story" />

    <AnswerPart
      v-for="(part, i) in task.parts"
      :key="i"
      :task-id="task.id"
      :index="i"
      :part="part"
    />

    <div v-if="task.bonus" class="bonus" :class="{ earned: allCorrect }">
      <strong>{{ allCorrect ? '+' : '' }}{{ task.bonus }} pkt bonusu</strong>
      <span v-if="task.bonusReason"> · {{ task.bonusReason }}</span>
      <span v-if="!allCorrect" class="muted"> (za samodzielne rozwiązanie wszystkich podpunktów)</span>
    </div>

    <div v-if="allDone && task.epilogue" class="epilogue">
      <MarkdownTex :source="task.epilogue" />
    </div>
  </article>
</template>

<style scoped>
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.25rem 1.4rem 1.4rem;
  box-shadow: 0 1px 0 var(--shadow);
}
header {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.num {
  font-family: var(--serif);
  color: var(--muted);
  font-size: 1.1rem;
}
h2 {
  font-family: var(--serif);
  font-size: 1.4rem;
  margin: 0;
  flex: 1;
  min-width: 12rem;
  color: var(--ink-strong);
}
.lore {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.2rem 0.5rem;
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
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.5rem 0 1rem;
}
.tag {
  font-size: 0.75rem;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
}
.max {
  font-size: 0.75rem;
  color: var(--muted);
  margin-left: auto;
}
.story {
  line-height: 1.6;
}
.bonus {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: var(--muted);
}
.bonus.earned {
  color: var(--gold-ink);
}
.muted {
  color: var(--muted);
}
.epilogue {
  margin-top: 1rem;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  background: var(--gold-soft);
  color: var(--ink);
  font-size: 0.95rem;
}
</style>
