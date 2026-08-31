<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Checklist } from '../content/types'
import { renderInlineMarkdown } from '../lib/markdownLite'
import CodeBlock from './CodeBlock.vue'
import Button from './Button.vue'

const props = defineProps<{ checklist: Checklist }>()
const { t } = useI18n()

// Deliberately NOT persisted to localStorage: this is a ritual you walk
// through fresh for every new problem, not a one-time task list — saving
// "done" forever would make it useless the second time you open this
// page. Plain `reactive` local state, reset by the button below or just
// by leaving and re-entering the page (the component remounts blank).
const checked = reactive<Record<string, boolean>>(Object.fromEntries(props.checklist.steps.map((s) => [s.id, false])))

const doneCount = computed(() => Object.values(checked).filter(Boolean).length)

function reset() {
  for (const step of props.checklist.steps) checked[step.id] = false
}
</script>

<template>
  <p class="intro" v-html="renderInlineMarkdown(checklist.intro)" />

  <div class="progress-row">
    <p class="progress">{{ t('interactiveChecklist.doneCount', { done: doneCount, total: checklist.steps.length }) }}</p>
    <Button variant="ghost" @click="reset">{{ t('interactiveChecklist.resetButton') }}</Button>
  </div>

  <ol class="steps">
    <li v-for="step in checklist.steps" :key="step.id" class="step">
      <label class="step-label">
        <input v-model="checked[step.id]" type="checkbox" />
        <span :class="{ 'step-done': checked[step.id] }">{{ step.label }}</span>
      </label>
      <p class="step-body" v-html="renderInlineMarkdown(step.body)" />
      <CodeBlock v-if="step.code && step.codeLang === 'csharp'" :code="step.code" />
      <pre v-else-if="step.code" class="plain-code"><code>{{ step.code }}</code></pre>
      <p v-if="step.afterCode" class="step-body" v-html="renderInlineMarkdown(step.afterCode)" />
    </li>
  </ol>

  <p class="closing-note" v-html="renderInlineMarkdown(checklist.closingNote)" />
</template>

<style scoped>
.intro {
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}
.progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.progress {
  margin: 0;
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.steps {
  list-style: none;
  margin: 0 0 var(--space-6);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.step {
  padding-bottom: var(--space-5);
  border-bottom: var(--border-width) solid var(--color-border);
}
.step:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.step-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  margin-bottom: var(--space-2);
  cursor: pointer;
}
.step-done {
  color: var(--color-text-faint);
  text-decoration: line-through;
}
.step-body {
  margin: 0 0 var(--space-2);
  color: var(--color-text-muted);
}
.step-body :deep(code) {
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  background: var(--color-bg);
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
}
.plain-code {
  margin: 0 0 var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  line-height: var(--leading-code);
  overflow-x: auto;
  color: var(--color-text-muted);
}

.closing-note {
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
