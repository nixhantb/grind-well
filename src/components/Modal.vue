<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

// A shared shell for both the trainer's stall dialog and the shortcuts
// overlay below — backdrop, ARIA wiring, and Escape-to-close live here
// ONCE, instead of every modal needing its own copy. Concretely: this is
// how the Phase 7 "add Escape to the stall modal" exercise gets solved
// for every future modal at the same time, by moving the listener down
// into the shared component instead of duplicating it per caller.
interface Props {
  labelledBy: string
  role?: 'dialog' | 'alertdialog'
}
withDefaults(defineProps<Props>(), { role: 'dialog' })

const emit = defineEmits<{ close: [] }>()

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal" :role="role" aria-modal="true" :aria-labelledby="labelledBy">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  z-index: 100;
}
.modal {
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-6);
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
}
</style>
