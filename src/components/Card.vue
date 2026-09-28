<script setup lang="ts">
// No props — Card is pure visual chrome.
</script>

<template>
  <section class="card">
    <!-- Only render the header wrapper when the parent filled that slot,
         instead of an empty, weirdly-padded header. -->
    <header v-if="$slots.header" class="card__header">
      <slot name="header" />
    </header>
    <div class="card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.card {
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-lg);
}
.card__header {
  padding: var(--space-4) var(--space-6);
  border-bottom: var(--border-width) solid var(--color-border);
  font-size: var(--text-lg);
  font-weight: 600;
}
.card__body {
  padding: var(--space-6);
}
</style>
