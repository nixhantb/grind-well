<script setup lang="ts">
import IconBadge from './IconBadge.vue'

// One number, labeled, with an icon for quick scanning. `hero` gives the
// cold-reproduction-rate card the extra visual weight the spec asks for —
// "the one metric that matters" should read as more prominent than the
// vanity problems-solved count, not just be listed first.
interface Props {
  label: string
  value: string
  sublabel?: string
  tone?: 'accent' | 'easy' | 'medium' | 'hard' | 'info' | 'neutral'
  hero?: boolean
}
withDefaults(defineProps<Props>(), { tone: 'neutral', hero: false })
</script>

<template>
  <div class="stat-card" :class="{ 'stat-card--hero': hero }">
    <IconBadge :tone="tone">
      <slot name="icon" />
    </IconBadge>
    <div class="stat-card__text">
      <p class="stat-card__label">{{ label }}</p>
      <p class="stat-card__value">{{ value }}</p>
      <p v-if="sublabel" class="stat-card__sublabel">{{ sublabel }}</p>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-5);
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-lg);
}
.stat-card__text {
  min-width: 0;
}
.stat-card__label {
  margin: 0 0 var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-faint);
}
.stat-card__value {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 700;
  line-height: var(--leading-tight);
}
.stat-card__sublabel {
  margin: var(--space-1) 0 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* Hero: an accent gradient card rather than a bigger version of the same
   neutral card — the point is a different visual REGISTER, not just size,
   so it can't be mistaken for "one more stat" at a glance. */
.stat-card--hero {
  background: var(--gradient-accent);
  border-color: transparent;
  color: var(--color-accent-text);
}
.stat-card--hero .stat-card__label {
  color: rgb(255 255 255 / 75%);
}
.stat-card--hero .stat-card__value {
  font-size: var(--text-2xl);
}
.stat-card--hero .stat-card__sublabel {
  color: rgb(255 255 255 / 85%);
}
/* The icon badge is a child component, so its own tone classes render
   outside this file's scope attribute — :deep() reaches in to override
   just the two visual properties that need to change on the gradient. */
.stat-card--hero :deep(.icon-badge) {
  background: rgb(255 255 255 / 20%);
  color: #fff;
}
</style>
