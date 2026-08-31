<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ShortcutEntry } from '../composables/useGlobalShortcuts'
import Modal from './Modal.vue'

defineProps<{ shortcuts: ShortcutEntry[] }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
</script>

<template>
  <Modal labelled-by="shortcuts-title" @close="emit('close')">
    <h3 id="shortcuts-title" class="title">{{ t('shortcuts.title') }}</h3>
    <dl class="list">
      <template v-for="s in shortcuts" :key="s.keys">
        <dt><kbd>{{ s.keys }}</kbd></dt>
        <dd>{{ s.description }}</dd>
      </template>
    </dl>
    <p class="hint">{{ t('shortcuts.hint') }}</p>
  </Modal>
</template>

<style scoped>
.title {
  margin-top: 0;
}
.list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-2) var(--space-4);
  margin: 0;
}
.list dt {
  margin: 0;
}
.list dd {
  margin: 0;
  color: var(--color-text-muted);
}
kbd {
  display: inline-block;
  min-width: 24px;
  padding: var(--space-1) var(--space-2);
  text-align: center;
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
}
.hint {
  margin: var(--space-4) 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}
</style>
