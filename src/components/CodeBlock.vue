<script setup lang="ts">
import { computed } from 'vue'
import { highlightCSharp } from '../lib/highlightCSharp'

interface Props {
  code: string
}
const props = defineProps<Props>()

const highlighted = computed(() => highlightCSharp(props.code))
</script>


<!--
  VUE CONCEPT: v-html.
  Vue normally escapes everything you interpolate with {{ }} — that's why
  {{ userInput }} can never inject a <script> tag. v-html is the explicit
  opt-out: it sets innerHTML directly, so anything in that string becomes
  real markup. That's dangerous with content from another user or the
  network (classic stored-XSS vector) — the rule is: v-html ONLY what you
  would trust to hand-write into the page yourself.

  Here `highlighted` is Prism's output over `code`, which always comes
  from content.generated.ts (our own parsed markdown) or a solution the
  USER pasted into their own browser — never another user's data, never a
  network response. Prism also HTML-escapes the underlying source before
  wrapping pieces of it in <span>, so even a stray `<` inside a C# string
  literal renders as text, not markup.
-->
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
