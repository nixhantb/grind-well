<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

// VUE CONCEPT: `computed`.
// Closest C# analogy: a get-only property that caches its result and
// recomputes only when something it reads changes — like a property
// backed by a private field that's invalidated on dependency change,
// except Vue tracks the dependency (here, `props.tone`) for you instead
// of you writing the invalidation logic by hand.
interface Props {
  tone?: 'neutral' | 'accent' | 'easy' | 'medium' | 'hard'
}
const props = withDefaults(defineProps<Props>(), { tone: 'neutral' })
const { t, te } = useI18n()

// Difficulty is never distinguished by color alone (a real accessibility
// requirement, not decoration) — easy/medium/hard pills get a single-letter
// badge ahead of the label text.
const letter = computed(() => {
  const key = `common.difficultyLetter.${props.tone}`
  return te(key) ? t(key) : undefined
})
</script>

<template>
  <span class="pill" :class="`pill--${tone}`">
    <span v-if="letter" class="pill__letter" aria-hidden="true">{{ letter }}</span>
    <slot />
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.pill__letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  background: currentColor; /* the square itself, in the pill's tone color */
}

.pill--neutral {
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  color: var(--color-text-muted);
}
.pill--accent {
  background: rgb(99 102 241 / 16%);
  color: var(--color-accent-hover);
}
.pill--easy {
  background: var(--color-easy-bg);
  color: var(--color-easy);
}
.pill--medium {
  background: var(--color-medium-bg);
  color: var(--color-medium);
}
.pill--hard {
  background: var(--color-hard-bg);
  color: var(--color-hard);
}
.pill--easy .pill__letter,
.pill--medium .pill__letter,
.pill--hard .pill__letter {
  color: var(--color-surface); /* punch the letter out in the page background */
}
</style>
