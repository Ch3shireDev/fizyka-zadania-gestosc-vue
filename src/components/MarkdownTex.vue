<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/lib/markdown'

const props = defineProps<{ source: string }>()

// Treść pochodzi z naszego własnego YAML-a, a markdown-it ma wyłączony surowy HTML.
const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <div class="md" v-html="html"></div>
</template>

<style scoped>
.md :deep(p) {
  margin: 0 0 0.75em;
}
.md :deep(p:last-child) {
  margin-bottom: 0;
}
.md :deep(.katex-display) {
  margin: 0.6em 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.2em 0;
}
.md :deep(strong) {
  color: var(--ink-strong);
}
.md :deep(em) {
  color: var(--accent-ink);
}
</style>
