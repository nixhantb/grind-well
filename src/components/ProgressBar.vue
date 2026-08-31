<script setup lang="ts">
import { computed } from 'vue'

// A plain horizontal fraction bar — value/max, clamped, filled left to
// right. Used anywhere a count needs a quick visual alongside the number
// (pattern checklists, the overall progress card) instead of a chart
// library for something this simple.
interface Props {
  value: number
  max: number
  tone?: 'accent' | 'easy' | 'medium' | 'hard' | 'info'
}
const props = withDefaults(defineProps<Props>(), { tone: 'accent' })

const percent = computed(() => (props.max <= 0 ? 0 : Math.min(100, (props.value / props.max) * 100)))
</script>

<template>
  <div class="progress-bar" role="progressbar" :aria-valuenow="value" :aria-valuemin="0" :aria-valuemax="max">
    <div class="progress-bar__fill" :class="`progress-bar__fill--${tone}`" :style="{ width: `${percent}%` }" />
  </div>
</template>

<style scoped>
.progress-bar {
  width: 100%;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-bg);
  overflow: hidden;
}
.progress-bar__fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--duration-base) var(--ease-standard);
}
.progress-bar__fill--accent {
  background: var(--color-accent);
}
.progress-bar__fill--easy {
  background: var(--color-easy);
}
.progress-bar__fill--medium {
  background: var(--color-medium);
}
.progress-bar__fill--hard {
  background: var(--color-hard);
}
.progress-bar__fill--info {
  background: var(--color-info);
}
</style>
