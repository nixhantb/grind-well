<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { computeDiff, firstDivergentLine } from '../lib/diff'
import { formatSeconds } from '../lib/format'
import type { RepResult } from '../stores/progressTypes'
import Button from './Button.vue'
import Pill from './Pill.vue'
import Modal from './Modal.vue'

const { t } = useI18n()

// "Two modes, same component": `mode` only changes what happens AFTER the
// diff — a template drill has nothing to log (there's no Pattern-level
// rep history in the data model, only Problem-level), so it just loops
// back to practicing; a solution rep ends in the clean/assisted/failed
// log form and emits `logRep` for the caller to persist.
interface Props {
  mode: 'pattern' | 'solution'
  referenceCode: string
  targetSeconds: number
  contextLabel: string
}
const props = defineProps<Props>()

const emit = defineEmits<{
  logRep: [payload: { result: RepResult; seconds: number; stuckLine: string | null; usedReference: boolean }]
}>()

// ---------- refs to the DOM ----------
// VUE CONCEPT: a template ref.
// `ref<HTMLTextAreaElement | null>(null)` here, `<textarea ref="editorRef">`
// in the template — Vue fills in the real DOM element after mount. This is
// the escape hatch for anything Vue's declarative bindings can't do:
// imperatively calling `.focus()` is a method call on the element itself,
// not a piece of state to bind.
const editorRef = ref<HTMLTextAreaElement | null>(null)
// `ref` on a custom component normally gives you the component INSTANCE,
// not its DOM node — this works because Button.vue explicitly
// `defineExpose`s a `.focus()` method for exactly this case.
const firstModalButtonRef = ref<InstanceType<typeof Button> | null>(null)

// ---------- core state ----------
const typedCode = ref('')
const phase = ref<'typing' | 'reviewing'>('typing')
const elapsedSeconds = ref(0)
const peekCount = ref(0)
const peekSecondsRemaining = ref<number | null>(null)
const stalled = ref(false)
const showPasteWarning = ref(false)
const ignoreWhitespace = ref(true)
const selectedResult = ref<RepResult | null>(null)
const stuckLine = ref('')

const usedReference = computed(() => peekCount.value > 0)
const isPeeking = computed(() => peekSecondsRemaining.value !== null)

// ---------- timers ----------
// Plain variables, not refs — nothing in the template reads a timer
// HANDLE, only the state the timers update (elapsedSeconds, etc.), so
// there's no reason to pay for reactivity tracking on these.
let elapsedTimerId: ReturnType<typeof setInterval> | undefined
let stallCheckTimerId: ReturnType<typeof setInterval> | undefined
let peekTimerId: ReturnType<typeof setInterval> | undefined
let pasteWarningTimeoutId: ReturnType<typeof setTimeout> | undefined
let lastActivityAt = Date.now()

function startTimers() {
  elapsedTimerId = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)
  stallCheckTimerId = setInterval(checkStall, 1000)
}

function stopTypingTimers() {
  clearInterval(elapsedTimerId)
  clearInterval(stallCheckTimerId)
  if (peekTimerId !== undefined) {
    clearInterval(peekTimerId)
    peekTimerId = undefined
  }
  peekSecondsRemaining.value = null
}

// VUE CONCEPT: `onMounted` / `onUnmounted`.
// Lifecycle hooks — code that runs when this component's DOM is actually
// inserted, and when it's about to be torn down. Closest C# analogy:
// something implementing IDisposable, where onMounted is the constructor
// doing setup and onUnmounted is Dispose() releasing it. It matters here
// specifically because `setInterval` keeps running even after a component
// is gone — navigate away mid-rep without this cleanup, and the timer
// keeps firing into a component that no longer exists, silently leaking.
onMounted(() => {
  editorRef.value?.focus()
  startTimers()
})
onUnmounted(() => {
  stopTypingTimers()
  if (pasteWarningTimeoutId !== undefined) clearTimeout(pasteWarningTimeoutId)
})

function checkStall() {
  if (phase.value !== 'typing' || isPeeking.value || stalled.value) return
  if (Date.now() - lastActivityAt >= 90_000) stalled.value = true
}

// VUE CONCEPT: `watch` reacting to a boolean flag to run a DOM side
// effect — a different job than the `watch` in the Pinia stores (which
// persists data). Here it's purely about moving keyboard focus: the
// instant the stall modal appears, focus its first real action so a
// keyboard user isn't left focused on a now-hidden/disabled textarea.
watch(stalled, (isStalled) => {
  if (isStalled) nextTick(() => firstModalButtonRef.value?.focus())
})

function onKeystroke() {
  lastActivityAt = Date.now()
}

// ---------- paste blocking ----------
// A single `paste` event handler is enough to cover Ctrl+V, the right-click
// context menu's Paste item, AND middle-click paste on Linux (X11's
// primary-selection paste) — all three dispatch the same ClipboardEvent in
// every current browser; there's no separate code path per input method.
// `@drop.prevent` closes the other obvious way text can arrive without
// being typed (dragging a selection into the textarea).
function onPasteAttempt() {
  showPasteWarning.value = true
  if (pasteWarningTimeoutId !== undefined) clearTimeout(pasteWarningTimeoutId)
  pasteWarningTimeoutId = setTimeout(() => {
    showPasteWarning.value = false
  }, 2500)
}

// ---------- peek ----------
function startPeek() {
  if (isPeeking.value) return
  peekCount.value++
  peekSecondsRemaining.value = 20
  stalled.value = false
  lastActivityAt = Date.now()
  peekTimerId = setInterval(() => {
    if (peekSecondsRemaining.value === null) return
    peekSecondsRemaining.value--
    if (peekSecondsRemaining.value <= 0) {
      clearInterval(peekTimerId)
      peekTimerId = undefined
      peekSecondsRemaining.value = null
      lastActivityAt = Date.now() // a fresh 90s window starts once the reference is hidden again
      editorRef.value?.focus()
    }
  }, 1000)
}

// ---------- the 90-second stall rule ----------
function restartFromScratch() {
  // Per the re-typing protocol: patch nothing in — clear the whole
  // attempt and start over. Worded as a reset, not a penalty.
  typedCode.value = ''
  stalled.value = false
  lastActivityAt = Date.now()
  nextTick(() => editorRef.value?.focus())
}
function dismissStallModal() {
  stalled.value = false
  lastActivityAt = Date.now()
  nextTick(() => editorRef.value?.focus())
}

// ---------- timer color ----------
const timerTone = computed(() => {
  const ratio = elapsedSeconds.value / props.targetSeconds
  if (ratio < 0.8) return 'ok'
  if (ratio < 1) return 'warn'
  return 'over'
})

// ---------- submit -> review ----------
// Mechanics-only similarity (always whitespace-insensitive), used to
// suggest a result — independent of the DISPLAY toggle below, so flipping
// that toggle to inspect whitespace never changes what gets suggested.
const mechanicsSimilarity = computed(
  () => computeDiff(props.referenceCode, typedCode.value, { ignoreWhitespace: true }).similarity,
)
const suggestedResult = computed<RepResult>(() => {
  if (usedReference.value) return 'assisted' // "Any peek marks the rep assisted, never clean"
  if (elapsedSeconds.value > props.targetSeconds) return 'failed'
  if (mechanicsSimilarity.value >= 0.98) return 'clean'
  return 'failed'
})

function submit() {
  if (typedCode.value.trim().length === 0) return
  stopTypingTimers()
  phase.value = 'reviewing'
  selectedResult.value = suggestedResult.value
  stuckLine.value = firstDivergentLine(props.referenceCode, typedCode.value) ?? ''
}

// The diff shown on screen DOES respect the whitespace toggle — this is
// the "inspect it either way" view, separate from the fixed-criteria
// suggestion above.
const diffResult = computed(() =>
  computeDiff(props.referenceCode, typedCode.value, { ignoreWhitespace: ignoreWhitespace.value }),
)
const similarityPercent = computed(() => Math.round(diffResult.value.similarity * 100))

const stuckLineRequired = computed(() => selectedResult.value !== 'clean')
const canSubmitLog = computed(() => {
  if (selectedResult.value === null) return false
  if (stuckLineRequired.value && stuckLine.value.trim().length === 0) return false
  return true
})

const justLogged = ref(false)

function submitLog() {
  if (!canSubmitLog.value || selectedResult.value === null) return
  emit('logRep', {
    result: selectedResult.value,
    seconds: elapsedSeconds.value,
    stuckLine: stuckLine.value.trim() || null,
    usedReference: usedReference.value,
  })
  // The parent (TrainerView) is responsible for persisting this via the
  // store — this component only needs to know "done", so it can offer
  // to go again. Any next-due-date/status confirmation reads live from
  // the store elsewhere, since that's already reactive there.
  justLogged.value = true
}

function practiceAgain() {
  typedCode.value = ''
  phase.value = 'typing'
  elapsedSeconds.value = 0
  peekCount.value = 0
  stalled.value = false
  selectedResult.value = null
  stuckLine.value = ''
  justLogged.value = false
  lastActivityAt = Date.now()
  startTimers()
  nextTick(() => editorRef.value?.focus())
}
</script>

<template>
  <div class="trainer">
    <header class="trainer-header">
      <div>
        <p class="eyebrow">{{ mode === 'pattern' ? t('trainer.templateDrill') : t('trainer.solutionRep') }}</p>
        <h2>{{ contextLabel }}</h2>
      </div>
      <p class="timer" :class="`timer--${timerTone}`">
        {{ formatSeconds(elapsedSeconds) }} <span class="timer-target">/ {{ formatSeconds(targetSeconds) }}</span>
      </p>
    </header>

    <template v-if="phase === 'typing'">
      <div class="reference-row">
        <Button variant="secondary" :disabled="isPeeking" @click="startPeek">
          {{ isPeeking ? t('trainer.peeking', { seconds: peekSecondsRemaining }) : t('trainer.peek') }}
        </Button>
        <span v-if="peekCount > 0" class="peek-count">{{ t('trainer.peekedWarning', { count: peekCount }) }}</span>
      </div>
      <pre v-if="isPeeking" class="reference-block"><code>{{ referenceCode }}</code></pre>

      <p v-if="showPasteWarning" class="paste-warning" role="alert">{{ t('trainer.pasteWarning') }}</p>

      <textarea
        ref="editorRef"
        v-model="typedCode"
        class="editor"
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        :aria-label="t('trainer.editorAriaLabel')"
        :placeholder="t('trainer.editorPlaceholder')"
        @paste.prevent="onPasteAttempt"
        @drop.prevent="onPasteAttempt"
        @dragover.prevent
        @input="onKeystroke"
      />

      <Button variant="primary" @click="submit">{{ t('trainer.submit') }}</Button>
    </template>

    <template v-else>
      <div class="review-controls">
        <label class="toggle">
          <input v-model="ignoreWhitespace" type="checkbox" />
          {{ t('trainer.ignoreWhitespace') }}
        </label>
        <p class="similarity">{{ t('trainer.similarityMatch', { percent: similarityPercent }) }}</p>
      </div>

      <pre class="diff-block"><code
        ><span
          v-for="(segment, i) in diffResult.segments"
          :key="i"
          :class="`diff-${segment.type}`"
          >{{ segment.text }}</span
        ></code
      ></pre>

      <template v-if="mode === 'solution' && !justLogged">
        <fieldset class="log-form">
          <legend>{{ t('trainer.logThisRep') }}</legend>
          <label>
            <input v-model="selectedResult" type="radio" value="clean" :disabled="usedReference" />
            {{ t('trainer.resultClean') }}
          </label>
          <label>
            <input v-model="selectedResult" type="radio" value="assisted" />
            {{ t('trainer.resultAssisted') }}
          </label>
          <label>
            <input v-model="selectedResult" type="radio" value="failed" />
            {{ t('trainer.resultFailed') }}
          </label>

          <label class="stuck-line-label">
            {{ t('trainer.stuckLineLabel') }} ({{ stuckLineRequired ? t('trainer.required') : t('trainer.optional') }})
            <input v-model="stuckLine" type="text" class="stuck-line-input" />
          </label>

          <Button variant="primary" :disabled="!canSubmitLog" @click="submitLog">{{ t('trainer.logRep') }}</Button>
        </fieldset>
      </template>
      <template v-else>
        <p v-if="justLogged" class="logged-confirmation">
          <Pill tone="accent">{{ t('trainer.logged') }}</Pill> {{ t('trainer.loggedConfirmation') }}
        </p>
        <Button variant="primary" @click="practiceAgain">{{ t('trainer.practiceAgain') }}</Button>
      </template>
    </template>

    <!-- `role="alertdialog"` since this interrupts to ask for a decision,
         not just informs. Escape-to-close and the backdrop click both
         come free from Modal.vue now. -->
    <Modal v-if="stalled" role="alertdialog" labelled-by="stall-title" @close="dismissStallModal">
      <h3 id="stall-title" class="modal-title">{{ t('trainer.stallTitle') }}</h3>
      <p>{{ t('trainer.stallBody') }}</p>
      <div class="modal-actions">
        <Button ref="firstModalButtonRef" variant="primary" @click="startPeek">{{ t('trainer.stallPeek') }}</Button>
        <Button variant="secondary" @click="restartFromScratch">{{ t('trainer.stallRestart') }}</Button>
      </div>
      <button class="modal-dismiss" type="button" @click="dismissStallModal">{{ t('trainer.stallDismiss') }}</button>
    </Modal>
  </div>
</template>

<style scoped>
.trainer-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-2) var(--space-4);
  margin-bottom: var(--space-4);
}
.eyebrow {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  margin: 0 0 var(--space-1);
}
.trainer-header h2 {
  margin: 0;
}
.timer {
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  margin: 0;
  color: var(--color-text);
}
.timer-target {
  font-size: var(--text-sm);
  color: var(--color-text-faint);
}
.timer--warn {
  color: var(--color-medium);
}
.timer--over {
  color: var(--color-hard);
}

.reference-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.peek-count {
  font-size: var(--text-sm);
  color: var(--color-medium);
}
.reference-block,
.diff-block {
  margin: 0 0 var(--space-4);
  padding: var(--space-4);
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-code);
  line-height: var(--leading-code);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  white-space: pre-wrap;
  word-break: break-word;
}

.paste-warning {
  color: var(--color-hard);
  font-size: var(--text-sm);
  margin-bottom: var(--space-2);
}

.editor {
  width: 100%;
  min-height: 320px;
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  background: var(--color-bg);
  color: var(--color-text);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-code);
  line-height: var(--leading-code);
  resize: vertical;
}
.editor:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.review-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  font-size: var(--text-sm);
}
.toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
}
.similarity {
  font-weight: 600;
  margin: 0;
}

/* Reusing the muted red/amber semantic colors already defined for
   difficulty — same visual language applies here: red = missing
   (something you needed isn't there), amber = extra (something's there
   that shouldn't be). Deliberately not introducing a second color pair
   that would mean the same thing. */
.diff-delete {
  background: var(--color-hard-bg);
  color: var(--color-hard);
  text-decoration: line-through;
}
.diff-insert {
  background: var(--color-medium-bg);
  color: var(--color-medium);
}

.logged-confirmation {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}
.log-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
  border: none;
  padding: 0;
  margin: 0;
}
.log-form legend {
  width: 100%;
  font-weight: 600;
  margin-bottom: var(--space-2);
  padding: 0;
}
.log-form label {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.stuck-line-label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  flex: 1;
  min-width: 240px;
}
.stuck-line-input {
  width: 100%;
  min-height: var(--hit-target);
  padding: 0 var(--space-3);
  background: var(--color-bg);
  color: var(--color-text);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
}

.modal-title {
  margin-top: 0;
}
.modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin: var(--space-4) 0;
}
.modal-dismiss {
  background: none;
  border: none;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
  min-height: var(--hit-target);
}
.modal-dismiss:hover {
  color: var(--color-text-muted);
}
</style>
