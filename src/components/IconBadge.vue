<script setup lang="ts">
// A small rounded-square swatch for an icon, in one of the app's existing
// semantic tones. Purely presentational — the icon itself is whatever the
// caller puts in the default slot (usually one lucide component), so this
// stays decoupled from any particular icon set.
interface Props {
  tone?: 'accent' | 'easy' | 'medium' | 'hard' | 'info' | 'neutral'
  size?: 'sm' | 'md'
}
withDefaults(defineProps<Props>(), { tone: 'neutral', size: 'md' })
</script>

<template>
  <span class="icon-badge" :class="[`icon-badge--${tone}`, `icon-badge--${size}`]">
    <slot />
  </span>
</template>

<style scoped>
.icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--radius-md);
}
.icon-badge--md {
  width: 40px;
  height: 40px;
}
.icon-badge--sm {
  width: 28px;
  height: 28px;
}
.icon-badge :deep(svg) {
  width: 55%;
  height: 55%;
}

.icon-badge--accent {
  background: rgb(99 102 241 / 16%);
  color: var(--color-accent-hover);
}
.icon-badge--easy {
  background: var(--color-easy-bg);
  color: var(--color-easy);
}
.icon-badge--medium {
  background: var(--color-medium-bg);
  color: var(--color-medium);
}
.icon-badge--hard {
  background: var(--color-hard-bg);
  color: var(--color-hard);
}
.icon-badge--info {
  background: var(--color-info-bg);
  color: var(--color-info);
}
.icon-badge--neutral {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: var(--border-width) solid var(--color-border);
}
</style>
