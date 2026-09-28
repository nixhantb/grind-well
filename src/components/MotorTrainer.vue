<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useIntervalFn, useTimeoutFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { computeDiff, firstDivergentLine, extractSignature, formatSignature } from '../lib/diff'
import { formatSeconds } from '../lib/format'
import type { RepResult } from '../stores/progressTypes'
import Button from './Button.vue'
import Pill from './Pill.vue'
import Modal from './Modal.vue'
import CodeEditor from './CodeEditor.vue'

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
  logRep: [
    payload: {
      result: RepResult
      seconds: number
      stuckLine: string | null
      usedReference: boolean
      methodSignature: string | null
    },
  ]
}>()

// ---------- refs to the DOM ----------
const editorRef = ref<InstanceType<typeof CodeEditor> | null>(null)
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
// Renaming the method/its params doesn't change the mechanics you're
// actually drilling — this stays on by default so the % match (and the
// auto-suggested clean/assisted/failed result) don't punish a rename.
// It's still a toggle, not baked in silently, so a rep can be inspected
// strictly when that's actually what's being checked.
const ignoreNames = ref(true)
const selectedResult = ref<RepResult | null>(null)
const stuckLine = ref('')

const usedReference = computed(() => peekCount.value > 0)
const isPeeking = computed(() => peekSecondsRemaining.value !== null)

// ---------- timers ----------
// VueUse's interval/timeout composables auto-pause themselves on unmount
// (no more `let timerId; onUnmounted(() => clearInterval(timerId))` per
// timer, and no way to forget one) — `immediate: false` because these
// start on specific app events (mount, peek, paste), not on setup.
let lastActivityAt = Date.now()

const { pause: pauseElapsed, resume: resumeElapsed } = useIntervalFn(() => elapsedSeconds.value++, 1000, {
  immediate: false,
})
const { pause: pauseStallCheck, resume: resumeStallCheck } = useIntervalFn(() => checkStall(), 1000, {
  immediate: false,
})
const { pause: pausePeekCountdown, resume: resumePeekCountdown } = useIntervalFn(
  () => {
    if (peekSecondsRemaining.value === null) return
    peekSecondsRemaining.value--
    if (peekSecondsRemaining.value <= 0) {
      pausePeekCountdown()
      peekSecondsRemaining.value = null
      lastActivityAt = Date.now() // a fresh 90s window starts once the reference is hidden again
      editorRef.value?.focus()
    }
  },
  1000,
  { immediate: false },
)

function startTimers() {
  resumeElapsed()
  resumeStallCheck()
}

function stopTypingTimers() {
  pauseElapsed()
  pauseStallCheck()
  pausePeekCountdown()
  peekSecondsRemaining.value = null
}

onMounted(() => {
  editorRef.value?.focus()
  startTimers()
})

function checkStall() {
  if (phase.value !== 'typing' || isPeeking.value || stalled.value) return
  if (Date.now() - lastActivityAt >= 90_000) stalled.value = true
}

// The instant the stall modal appears, focus its first real action so a
// keyboard user isn't left focused on a now-hidden/disabled textarea.
watch(stalled, (isStalled) => {
  if (isStalled) nextTick(() => firstModalButtonRef.value?.focus())
})

function onKeystroke() {
  lastActivityAt = Date.now()
}

// CodeEditor emits its own `update:modelValue` (CodeMirror, not a native
// <textarea>, so there's no plain DOM `input` event to listen for) —
// this both writes through to `typedCode` and counts as activity for the
// stall timer, replacing the old `v-model` + `@input="onKeystroke"` pair.
function onEditorInput(value: string) {
  typedCode.value = value
  onKeystroke()
}

// ---------- paste blocking ----------
// A single `paste` event handler is enough to cover Ctrl+V, the right-click
// context menu's Paste item, AND middle-click paste on Linux (X11's
// primary-selection paste) — all three dispatch the same ClipboardEvent in
// every current browser; there's no separate code path per input method.
// CodeEditor's own `drop`/`dragover` handlers close the other obvious way
// text can arrive without being typed (dragging a selection in), and both
// funnel into the same `pasteAttempt` event this listens for.
const { start: startPasteWarningTimeout } = useTimeoutFn(() => (showPasteWarning.value = false), 2500, {
  immediate: false,
})
function onPasteAttempt() {
  showPasteWarning.value = true
  startPasteWarningTimeout()
}

// ---------- peek ----------
function startPeek() {
  if (isPeeking.value) return
  peekCount.value++
  peekSecondsRemaining.value = 20
  stalled.value = false
  lastActivityAt = Date.now()
  resumePeekCountdown()
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
// The method name + param list actually typed (best-effort-parsed — see
// extractSignature), independent of whatever the reference solution
// called them. Computed once submission happens, since that's the only
// point a rep gets logged/persisted.
const submittedSignature = computed(() => extractSignature(typedCode.value))
const submittedSignatureLabel = computed(() => formatSignature(submittedSignature.value))

// Mechanics-only similarity (always whitespace- AND name-insensitive),
// used to suggest a result — independent of the DISPLAY toggles below, so
// flipping those to inspect whitespace/naming never changes what gets
// suggested. Renaming the method or its parameters is not a mechanics
// failure; only the code between the braces is what's being drilled.
const mechanicsSimilarity = computed(
  () => computeDiff(props.referenceCode, typedCode.value, { ignoreWhitespace: true, ignoreNames: true }).similarity,
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

// The diff shown on screen DOES respect both toggles — this is the
// "inspect it either way" view, separate from the fixed-criteria
// suggestion above. The highlighted characters are always the REAL typed
// text (ignoreNames never swaps in placeholders for display, see
// computeDiff) — only the resulting % match is affected.
const diffResult = computed(() =>
  computeDiff(props.referenceCode, typedCode.value, {
    ignoreWhitespace: ignoreWhitespace.value,
    ignoreNames: ignoreNames.value,
  }),
)
const similarityPercent = computed(() => Math.round(diffResult.value.similarity * 100))
const similarityTone = computed(() => {
  if (similarityPercent.value >= 95) return 'easy'
  if (similarityPercent.value >= 75) return 'medium'
  return 'hard'
})

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
    methodSignature: submittedSignatureLabel.value,
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
      <div class="typing-toolbar">
        <div class="reference-row">
          <Button variant="secondary" :disabled="isPeeking" @click="startPeek">
            {{ isPeeking ? t('trainer.peeking', { seconds: peekSecondsRemaining }) : t('trainer.peek') }}
          </Button>
          <span v-if="peekCount > 0" class="peek-count">{{ t('trainer.peekedWarning', { count: peekCount }) }}</span>
        </div>
        <p class="detected-signature">
          <Pill v-if="submittedSignatureLabel" tone="accent">{{ t('trainer.detectedMethod') }}</Pill>
          <code v-if="submittedSignatureLabel">{{ submittedSignatureLabel }}</code>
          <span v-else class="detected-signature--muted">{{ t('trainer.noMethodDetectedYet') }}</span>
        </p>
      </div>
      <pre v-if="isPeeking" class="reference-block"><code>{{ referenceCode }}</code></pre>

      <p v-if="showPasteWarning" class="paste-warning" role="alert">{{ t('trainer.pasteWarning') }}</p>

      <CodeEditor
        ref="editorRef"
        :model-value="typedCode"
        :ariaLabel="t('trainer.editorAriaLabel')"
        :placeholder="t('trainer.editorPlaceholder')"
        :block-paste="true"
        @update:model-value="onEditorInput"
        @paste-attempt="onPasteAttempt"
      />

      <Button variant="primary" @click="submit">{{ t('trainer.submit') }}</Button>
    </template>

    <template v-else>
      <div class="review-summary">
        <div class="match-stat">
          <span class="match-stat__value" :class="`match-stat__value--${similarityTone}`">{{ similarityPercent }}%</span>
          <span class="match-stat__label">{{ t('trainer.similarityLabel') }}</span>
        </div>
        <div class="review-summary__meta">
          <p class="detected-signature">
            <Pill v-if="submittedSignatureLabel" tone="accent">{{ t('trainer.detectedMethod') }}</Pill>
            <code v-if="submittedSignatureLabel">{{ submittedSignatureLabel }}</code>
            <span v-else class="detected-signature--muted">{{ t('trainer.noMethodDetected') }}</span>
          </p>
          <div class="review-controls">
            <label class="toggle">
              <input v-model="ignoreWhitespace" type="checkbox" />
              {{ t('trainer.ignoreWhitespace') }}
            </label>
            <label class="toggle">
              <input v-model="ignoreNames" type="checkbox" />
              {{ t('trainer.ignoreNames') }}
            </label>
          </div>
        </div>
      </div>

      <div class="diff-legend">
        <span class="legend-item"><span class="legend-swatch legend-swatch--equal" />{{ t('trainer.legendMatched') }}</span>
        <span class="legend-item"><span class="legend-swatch legend-swatch--delete" />{{ t('trainer.legendMissing') }}</span>
        <span class="legend-item"><span class="legend-swatch legend-swatch--insert" />{{ t('trainer.legendExtra') }}</span>
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

.typing-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3) var(--space-4);
  margin-bottom: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-lg);
}
.reference-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
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
  box-shadow: var(--shadow-sm);
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

.review-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-5);
  margin-bottom: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-lg);
}
.match-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 88px;
}
.match-stat__value {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: 700;
  line-height: 1;
}
.match-stat__value--easy {
  color: var(--color-easy);
}
.match-stat__value--medium {
  color: var(--color-medium);
}
.match-stat__value--hard {
  color: var(--color-hard);
}
.match-stat__label {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: var(--space-1);
}
.review-summary__meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 220px;
}
.detected-signature {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-sm);
}
.detected-signature code {
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  background: var(--color-bg);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text);
}
.detected-signature--muted {
  color: var(--color-text-faint);
}
.review-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
}
.toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
}

.diff-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-sm);
  display: inline-block;
}
.legend-swatch--equal {
  background: var(--color-border-strong);
}
.legend-swatch--delete {
  background: var(--color-hard);
}
.legend-swatch--insert {
  background: var(--color-medium);
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
