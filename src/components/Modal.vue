<script setup lang="ts">
import { ref, onMounted } from 'vue'

// The native <dialog> element already solves everything this used to
// hand-roll: showModal() gives real focus-trapping (Tab can't escape the
// dialog — the old backdrop-div version never had this), Escape-to-close
// is automatic, and ::backdrop replaces the manual overlay div. The one
// bit of script left is the standard "click landed on the dialog element
// itself, not a child" test for click-outside-to-close.
interface Props {
  labelledBy: string
  role?: 'dialog' | 'alertdialog'
}
withDefaults(defineProps<Props>(), { role: 'dialog' })

const emit = defineEmits<{ close: [] }>()
const dialogRef = ref<HTMLDialogElement | null>(null)

onMounted(() => dialogRef.value?.showModal())
</script>

<template>
  <dialog
    ref="dialogRef"
    class="modal"
    :role="role"
    :aria-labelledby="labelledBy"
    @click.self="dialogRef?.close()"
    @close="emit('close')"
  >
    <slot />
  </dialog>
</template>

<style scoped>
.modal {
  color: var(--color-text);
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-6);
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
}
.modal::backdrop {
  background: var(--color-overlay);
}

@media (max-width: 480px) {
  .modal {
    padding: var(--space-4);
  }
}
</style>
