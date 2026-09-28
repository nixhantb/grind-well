<script setup lang="ts">
import IconBadge from './IconBadge.vue'

// The icon + title + one-line subtitle pattern every view opens with.
// Pulling it into one component means every page gets the same rhythm
// for free, instead of eight views each hand-rolling their own h1/lede.
interface Props {
  title: string
  subtitle?: string
}
defineProps<Props>()
</script>

<template>
  <header class="page-header">
    <div class="page-header__main">
      <IconBadge tone="accent">
        <slot name="icon" />
      </IconBadge>
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}
.page-header__main {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}
.page-header h1 {
  margin: 0;
}
.page-header__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
}
.page-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
