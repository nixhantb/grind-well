<script setup lang="ts">
// Deliberately NOT a generic prop-driven data table (no `columns` /
// `rows` props). The problem tables coming in Phase 3 need custom cell
// content — Pill flags, a LeetCode link — and a config-object API for
// that ends up fighting itself (slot-per-cell escape hatches, render
// functions) worse than just letting the caller write real <thead>/<tbody>
// markup. So Table.vue's whole job is: provide the scroll container and
// consistent row/border styling; the caller supplies the actual table via
// the default slot, same as any plain HTML <table>.
</script>

<template>
  <div class="table-scroll">
    <table class="table">
      <slot />
    </table>
  </div>
</template>

<style scoped>
/* `scoped` styles normally can't reach into a slot's content — the <th>/
   <td> elements below are written by whichever parent uses <Table>, not
   by this file, so plain `.table th { }` would never match them. `:deep()`
   is the documented escape hatch: it keeps the scoping attribute on
   `.table` itself but drops it from the selector's remainder, so these
   rules cascade into slotted content on purpose. */
.table-scroll {
  /* Desktop-first, but a wide table (many columns) must scroll inside
     itself rather than force the whole page wider. */
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  text-align: left;
}
.table :deep(th),
.table :deep(td) {
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--border-width) solid var(--color-border);
  white-space: nowrap;
}
.table :deep(th) {
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.table :deep(tbody tr) {
  transition: background-color var(--duration-fast) var(--ease-standard);
}
.table :deep(tbody tr:hover) {
  background: var(--color-surface);
}
</style>
