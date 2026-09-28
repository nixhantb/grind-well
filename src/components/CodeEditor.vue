<script setup lang="ts">
// A CodeMirror 6 wrapper used for BOTH places this app wants a C# editor
// instead of a plain <textarea>: the trainer's typing box, and Problem
// Detail's "paste your accepted solution" box. Line numbers, syntax
// highlighting, bracket MATCHING (a visual highlight when the cursor
// sits next to a bracket) and now auto-closing brackets/quotes (VS
// Code-style — typing `{` inserts `}` too) are always on. There's still
// no autocomplete/IntelliSense — that's the one line this stops short
// of being a full IDE.
//
// `blockPaste` is the one behavioral difference between the two sites:
// the trainer sets it so a rep stays "typed, not pasted"; Problem Detail
// leaves it off, since pasting the accepted solution in is the entire
// point of that box.
//
// CodeMirror manages its own DOM inside `containerRef` — it isn't a Vue
// template concern beyond that one mount point, which is why this file
// is mostly imperative setup/teardown in <script setup> rather than
// template bindings.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, placeholder as placeholderExtension } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle, StreamLanguage } from '@codemirror/language'
import { csharp } from '@codemirror/legacy-modes/mode/clike'
import { tags as t } from '@lezer/highlight'

interface Props {
  modelValue: string
  ariaLabel: string
  placeholder?: string
  /** Block paste/drop and emit `pasteAttempt` instead of inserting the
   *  text — on for the trainer's "typed, not pasted" rule, off (the
   *  default) everywhere a paste is the whole point of the box. */
  blockPaste?: boolean
  /** CSS height (e.g. `'320px'`) — the two editable call sites want
   *  different resting sizes (the trainer's rep box vs. Problem Detail's
   *  solution box), both still user-resizable via the same drag handle.
   *  Ignored when `autoHeight` is set. */
  minHeight?: string
  /** Not editable — for showing a pattern template to read, not type
   *  into. Still gets line numbers/highlighting/bracket matching; just
   *  no cursor, no changes accepted. */
  readOnly?: boolean
  /** Grows to fit its content instead of a fixed, resizable box — the
   *  right fit for `readOnly` display where there's nothing to resize. */
  autoHeight?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  blockPaste: false,
  minHeight: '320px',
  readOnly: false,
  autoHeight: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  pasteAttempt: []
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null

// Same category-to-token mapping CodeBlock.vue's Prism setup already
// uses (see the `--syntax-*` vars in tokens.css) — reusing it here means
// the code you're TYPING and the code you're READING elsewhere in the
// app share one palette instead of two independently-tuned ones. Colors
// are `var(--syntax-*)` strings, not fixed hex — CodeMirror just emits
// them into a stylesheet, so the browser re-resolves them live on the
// same dark/light toggle everything else in the app uses, no separate
// light/dark HighlightStyle needed.
const csharpHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--syntax-keyword)' },
  { tag: [t.typeName, t.standard(t.variableName)], color: 'var(--syntax-class)' },
  { tag: t.atom, color: 'var(--syntax-number)' },
  { tag: [t.string, t.special(t.string), t.character], color: 'var(--syntax-string)' },
  { tag: t.comment, color: 'var(--color-text-faint)', fontStyle: 'italic' },
  { tag: t.number, color: 'var(--syntax-number)' },
  { tag: t.definition(t.variableName), color: 'var(--syntax-function)' },
  { tag: t.operator, color: 'var(--color-text-muted)' },
])

// Structural chrome only (background, gutter, caret, selection) — reuses
// the same design tokens as the rest of the app's cards/inputs rather
// than a CodeMirror theme preset, so this doesn't look like a bolted-on
// widget. `dark: false` is irrelevant here since every color is a CSS
// var that already flips with the app's own [data-theme] toggle.
const editorTheme = EditorView.theme(
  {
    '&': {
      color: 'var(--color-text)',
      backgroundColor: 'var(--color-bg)',
      fontSize: 'var(--text-code)',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: 'var(--font-mono)',
      lineHeight: 'var(--leading-code)',
      caretColor: 'var(--color-text)',
      padding: 'var(--space-4)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text-faint)',
      border: 'none',
      borderRight: `var(--border-width) solid var(--color-border)`,
    },
    '.cm-activeLine': { backgroundColor: 'var(--color-surface)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--color-surface)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'var(--color-focus-ring) !important',
    },
    '.cm-cursor': { borderLeftColor: 'var(--color-text)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono)' },
    '.cm-placeholder': { color: 'var(--color-text-faint)' },
  },
  { dark: false },
)

function buildExtensions(): Extension[] {
  return [
    ...(props.readOnly ? [EditorView.editable.of(false), EditorState.readOnly.of(true)] : []),
    lineNumbers(),
    highlightActiveLine(),
    drawSelection(),
    history(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    EditorView.lineWrapping,
    StreamLanguage.define(csharp),
    syntaxHighlighting(csharpHighlightStyle, { fallback: true }),
    editorTheme,
    placeholderExtension(props.placeholder),
    keymap.of([indentWithTab, ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),
    EditorView.contentAttributes.of({
      'aria-label': props.ariaLabel,
      spellcheck: 'false',
      autocorrect: 'off',
      autocapitalize: 'off',
    }),
    // Only blocks anything when `blockPaste` is set (the trainer's rep
    // box) — mirrors the old textarea's
    // @paste.prevent/@drop.prevent/@dragover.prevent for that one case.
    // Problem Detail's solution box leaves this alone entirely, so a
    // real paste/drop just inserts text the normal contenteditable way.
    EditorView.domEventHandlers({
      paste: (event) => {
        if (!props.blockPaste) return
        event.preventDefault()
        emit('pasteAttempt')
      },
      drop: (event) => {
        if (!props.blockPaste) return
        event.preventDefault()
        emit('pasteAttempt')
      },
      dragover: (event) => {
        if (props.blockPaste) event.preventDefault()
      },
    }),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      const value = update.state.doc.toString()
      if (value !== props.modelValue) emit('update:modelValue', value)
    }),
  ]
}

onMounted(() => {
  if (!containerRef.value) return
  view = new EditorView({
    state: EditorState.create({ doc: props.modelValue, extensions: buildExtensions() }),
    parent: containerRef.value,
  })
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

// One-way sync FROM the parent's v-model (e.g. `typedCode.value = ''` on
// restart/practice-again) — guarded against the doc already matching so
// this never fights with the updateListener above and loop.
watch(
  () => props.modelValue,
  (next) => {
    if (!view) return
    const current = view.state.doc.toString()
    if (next === current) return
    view.dispatch({ changes: { from: 0, to: current.length, insert: next } })
  },
)

// Same escape hatch Button.vue exposes for its `ref="firstModalButtonRef"`
// case — a `ref` on this component gives the instance, not a DOM node, so
// MotorTrainer's `editorRef.value?.focus()` calls need this explicitly.
defineExpose({
  focus: () => view?.focus(),
})
</script>

<template>
  <div
    ref="containerRef"
    class="code-editor"
    :class="{ 'code-editor--auto': autoHeight }"
    :style="autoHeight ? {} : { height: minHeight, minHeight }"
  />
</template>

<style scoped>
.code-editor {
  margin-bottom: var(--space-4);
  resize: vertical;
  overflow: hidden;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.code-editor:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}
/* CodeMirror's own root element — needs to fill the resizable wrapper
   above so dragging the resize handle actually grows the editor, not
   just an empty wrapper around a fixed-height CodeMirror instance. */
.code-editor :deep(.cm-editor) {
  height: 100%;
}
/* Read-only display (pattern templates): grow with content instead of a
   fixed, scrollable, resizable box — there's nothing to resize when
   there's nothing to type. */
.code-editor.code-editor--auto {
  resize: none;
  overflow: visible;
}
.code-editor--auto :deep(.cm-editor) {
  height: auto;
}
.code-editor--auto :deep(.cm-scroller) {
  overflow: visible;
}
</style>
