<script setup lang="ts">
// No props — Card is pure visual chrome, so there's nothing to declare.
// `$slots` is a template-only special value (not something you import):
// checking `$slots.header` lets the wrapper <header> only render when the
// parent actually filled that named slot, instead of always rendering an
// empty, weirdly-padded header.
</script>

<template>
  <section class="card">
    <!-- VUE CONCEPT: named slots.
         A default <slot /> is the "one hole" version; naming a slot
         ("header") gives the parent multiple distinct holes to fill,
         each addressed by name: <Card><template #header>...</template>
         ...body...</Card>. Closest C# analogy: a control with more than
         one ContentPresenter, each with its own name. -->
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
