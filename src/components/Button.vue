<script setup lang="ts">
import { ref } from 'vue'

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

// No defineEmits/@click handling needed — with a single root element,
// Vue forwards attributes and listeners straight onto it, so
// `<Button @click="save">` just works.

// `defineExpose` so a parent's `ref="x"` can call `.focus()` — plain
// `ref` on a component gives the instance, not the DOM node.
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
