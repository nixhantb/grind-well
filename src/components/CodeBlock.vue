<script setup lang="ts">
import { computed } from 'vue'
import { highlightCSharp } from '../lib/highlightCSharp'

interface Props {
  code: string
}
const props = defineProps<Props>()

const highlighted = computed(() => highlightCSharp(props.code))
</script>


<!-- v-html is safe here: Prism HTML-escapes the source before wrapping
     pieces of it in <span>, so even a stray `<` in a C# string literal
     renders as text, not markup — regardless of whether `code` is our own
     content or something the user pasted. -->
<template>
  <pre class="code-block"><code
    class="language-csharp"
    v-html="highlighted"
  /></pre>
</template>

<style scoped>
.code-block {
  margin: 0;
  padding: var(--space-4) var(--space-5);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
}
.code-block code {
  font-family: var(--font-mono);
  font-size: var(--text-code);
  line-height: var(--leading-code);
  white-space: pre;
}

/* Prism emits `<span class="token keyword">`, etc. — `:deep()` is needed
   because that markup comes from v-html, not from this template, so
   scoped CSS wouldn't otherwise reach it (same reason Table.vue needs it
   for slotted <td>s). */
.code-block :deep(.token.keyword) {
  color: var(--syntax-keyword);
}
.code-block :deep(.token.string) {
  color: var(--syntax-string);
}
.code-block :deep(.token.comment) {
  color: var(--color-text-faint);
  font-style: italic;
}
.code-block :deep(.token.function) {
  color: var(--syntax-function);
}
.code-block :deep(.token.number),
.code-block :deep(.token.boolean) {
  color: var(--syntax-number);
}
.code-block :deep(.token.class-name) {
  color: var(--syntax-class);
}
.code-block :deep(.token.operator),
.code-block :deep(.token.punctuation) {
  color: var(--color-text-muted);
}
</style>
