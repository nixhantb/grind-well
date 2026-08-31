<script setup lang="ts">
import { ref } from 'vue'

// VUE CONCEPT: props, typed with a plain TS interface.
// `defineProps<Props>()` is a compile-time-only macro (it vanishes in the
// compiled output) — the closest C# analogy is a constructor parameter
// list: the caller must supply values matching these shapes, and
// `withDefaults` is like giving some of those parameters default values.
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
}
withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  type: 'button',
  disabled: false,
})

// Notice there's no `defineEmits` and no `@click` handling in this file at
// all. VUE-SPECIFIC MAGIC, no real C# equivalent: because this component's
// template has exactly one root element (the <button>), Vue automatically
// forwards every attribute AND event listener the parent puts on <Button>
// straight onto that root element. So a parent writing
// `<Button @click="save">Save</Button>` just works — the native `click`
// event fires on the real <button>, bubbles up, and Vue's fallthrough
// wires the parent's listener to it with zero code here. Same for
// `aria-label`, `id`, etc. This stops working the moment a component has
// multiple root nodes or you opt out with `inheritAttrs: false`.

// A plain `ref="x"` on <Button> from a parent gives the component
// INSTANCE, not the underlying DOM node, because <script setup> hides
// everything by default. `defineExpose` is the explicit opt-in: it picks
// exactly what a parent is allowed to reach through that ref — here, just
// enough to call `.focus()` imperatively (MotorTrainer's stall modal
// needs this), without exposing the raw element for anything else.
const buttonRef = ref<HTMLButtonElement | null>(null)
defineExpose({
  focus: () => buttonRef.value?.focus(),
})
</script>

<template>
  <button ref="buttonRef" :type="type" :disabled="disabled" class="btn" :class="`btn--${variant}`">
    <slot />
  </button>
</template>

<style scoped>
/* `scoped` — Vue appends a unique attribute (e.g. data-v-f3a1) to every
   element this template renders and to every selector below, so ".btn"
   here can never accidentally match a `.btn` in some other component. */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--hit-target);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: var(--border-width) solid transparent;
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard),
    opacity var(--duration-fast) var(--ease-standard);
}
.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.btn--primary {
  background: var(--color-accent);
  color: var(--color-accent-text);
}
.btn--primary:not(:disabled):hover {
  background: var(--color-accent-hover);
}

.btn--secondary {
  background: var(--color-surface-raised);
  border-color: var(--color-border);
  color: var(--color-text);
}
.btn--secondary:not(:disabled):hover {
  border-color: var(--color-border-strong);
}

.btn--ghost {
  background: transparent;
  color: var(--color-text-muted);
}
.btn--ghost:not(:disabled):hover {
  background: var(--color-surface-raised);
  color: var(--color-text);
}
</style>
