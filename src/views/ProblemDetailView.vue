<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { problems, patterns, ladder } from '../content'
import { useProgressStore } from '../stores/progress'
import { renderInlineMarkdown } from '../lib/markdownLite'
import { problemFlags } from '../lib/problemFlags'
import { formatSeconds } from '../lib/format'
import Button from '../components/Button.vue'
import Card from '../components/Card.vue'
import Pill from '../components/Pill.vue'
import Table from '../components/Table.vue'

interface Props {
  id: string
}
const props = defineProps<Props>()
const problemId = computed(() => Number(props.id))

const { t } = useI18n()
const store = useProgressStore()

const problem = computed(() => problems.find((p) => p.id === problemId.value))
const pattern = computed(() => patterns.find((p) => p.id === problem.value?.patternId))
const state = computed(() => store.getState(problemId.value))

// ---------- solution paste box ----------
// Seeded once from whatever's already saved; NOT bound directly to the
// store, so typing doesn't write to localStorage on every keystroke —
// only the explicit Save does. `isDirty` compares against the live store
// value (not a snapshot) so switching problems via the router without a
// full remount can't leave a stale comparison behind.
const draftSolution = ref(state.value.solutionCode)
const isDirty = computed(() => draftSolution.value !== state.value.solutionCode)

function saveSolution() {
  store.saveSolution(problemId.value, draftSolution.value)
}

// ---------- notes ----------
const draftNotes = ref(state.value.notes)
function saveNotes() {
  store.updateNotes(problemId.value, draftNotes.value)
}

// ---------- rep history ----------
const repsNewestFirst = computed(() => [...state.value.reps].reverse())

// ---------- the run timer + 20-minute ladder ----------
// Ephemeral, local-only state — there's no field in ProblemState for "how
// long has this run been going," and there shouldn't be: this tracks time
// spent solving on LeetCode itself (elsewhere), not a rep inside this app,
// so it resets on reload same as a physical stopwatch would if you closed
// the tab.
const runSeconds = ref(0)
const runActive = ref(false)
let runTimerId: ReturnType<typeof setInterval> | undefined

function toggleRun() {
  runActive.value = !runActive.value
  if (runActive.value) {
    runTimerId = setInterval(() => runSeconds.value++, 1000)
  } else if (runTimerId !== undefined) {
    clearInterval(runTimerId)
    runTimerId = undefined
  }
}
function resetRun() {
  runActive.value = false
  runSeconds.value = 0
  if (runTimerId !== undefined) {
    clearInterval(runTimerId)
    runTimerId = undefined
  }
}
onUnmounted(() => {
  if (runTimerId !== undefined) clearInterval(runTimerId)
})

const runMinutes = computed(() => runSeconds.value / 60)

// The editorial step (minute 55) is the one rung that needs a deliberate
// second click even once time-unlocked — "the whole discipline is not
// reaching for it at minute 22." This is a fixed rule about that specific
// rung, not a generic per-step field from the source doc, so it's a
// literal check here rather than invented data.
const EDITORIAL_MINUTE = 55
const editorialConfirmed = ref(false)
</script>

<template>
  <div v-if="!problem">
    <p>{{ t('problemDetail.notFound', { id }) }}</p>
    <RouterLink to="/patterns">{{ t('common.backToPatterns') }}</RouterLink>
  </div>

  <div v-else>
    <p class="eyebrow">
      <RouterLink v-if="pattern" :to="`/patterns/${pattern.id}`">{{ pattern.name }}</RouterLink>
    </p>
    <div class="title-row">
      <h1>#{{ problem.id }} {{ problem.title }}</h1>
      <a :href="problem.url" target="_blank" rel="noopener noreferrer">{{ t('problemDetail.leetCodeLink') }}</a>
    </div>
    <div class="pills-row">
      <Pill :tone="problem.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'">{{ problem.difficulty }}</Pill>
      <Pill v-for="flag in problemFlags(problem)" :key="flag.kind + (flag.repOf ?? '')" :tone="flag.tone">
        {{ t(`problemFlags.${flag.kind}`, { id: flag.repOf }) }}
      </Pill>
    </div>
    <p class="sub-skill" v-html="renderInlineMarkdown(problem.subSkill)" />
    <p class="meta">{{ t('problemDetail.meta', { minutes: problem.targetMinutes, loc: problem.expectedLoc }) }}</p>

    <Card class="section">
      <template #header>{{ t('problemDetail.runTimerHeader') }}</template>
      <div class="run-row">
        <p class="run-clock">{{ formatSeconds(runSeconds) }}</p>
        <Button :variant="runActive ? 'secondary' : 'primary'" @click="toggleRun">
          {{ runActive ? t('problemDetail.pause') : t('problemDetail.start') }}
        </Button>
        <Button variant="ghost" @click="resetRun">{{ t('problemDetail.reset') }}</Button>
      </div>

      <ol class="ladder">
        <li v-for="step in ladder" :key="step.minute" class="ladder-step">
          <!-- Conditional rendering IS the whole feature here: a step
               simply doesn't reveal its content until runMinutes crosses
               its threshold — no separate "hidden" flag to keep in sync,
               just a comparison against time-driven state. -->
          <template v-if="runMinutes >= step.minute">
            <template v-if="step.minute === EDITORIAL_MINUTE && !editorialConfirmed">
              <p class="ladder-title">{{ t('problemDetail.ladderStepTitle', { minute: step.minute, title: step.title }) }}</p>
              <p class="editorial-warning">
                {{ t('problemDetail.editorialWarning', { minute: EDITORIAL_MINUTE }) }}
              </p>
              <Button variant="secondary" @click="editorialConfirmed = true">{{ t('problemDetail.editorialReveal') }}</Button>
            </template>
            <template v-else>
              <p class="ladder-title ladder-title--unlocked">{{ t('problemDetail.ladderStepTitle', { minute: step.minute, title: step.title }) }}</p>
              <p class="ladder-description" v-html="renderInlineMarkdown(step.description)" />
            </template>
          </template>
          <p v-else class="ladder-title ladder-title--locked">
            {{ t('problemDetail.ladderStepTitle', { minute: step.minute, title: step.title }) }}
            <span class="ladder-lock">{{ t('problemDetail.lockedUntil', { time: step.minute }) }}</span>
          </p>
        </li>
      </ol>
    </Card>

    <Card class="section">
      <template #header>{{ t('problemDetail.solutionHeader') }}</template>
      <p class="lede">{{ t('problemDetail.solutionLede') }}</p>
      <textarea
        v-model="draftSolution"
        class="solution-box"
        spellcheck="false"
        :aria-label="t('problemDetail.solutionAriaLabel')"
        :placeholder="t('problemDetail.solutionPlaceholder')"
      />
      <Button variant="primary" :disabled="!isDirty" @click="saveSolution">{{ t('problemDetail.saveSolution') }}</Button>
    </Card>

    <Card class="section">
      <template #header>{{ t('problemDetail.notesHeader') }}</template>
      <textarea
        v-model="draftNotes"
        class="notes-box"
        :aria-label="t('problemDetail.notesAriaLabel')"
        :placeholder="t('problemDetail.notesPlaceholder')"
      />
      <Button variant="secondary" :disabled="draftNotes === state.notes" @click="saveNotes">{{ t('problemDetail.saveNotes') }}</Button>
    </Card>

    <Card class="section">
      <template #header>{{ t('problemDetail.repHistoryHeader') }}</template>
      <p v-if="repsNewestFirst.length === 0" class="lede">{{ t('common.noRepsLogged') }}</p>
      <Table v-else>
        <thead>
          <tr>
            <th>{{ t('problemDetail.colRep') }}</th>
            <th>{{ t('problemDetail.colDate') }}</th>
            <th>{{ t('problemDetail.colResult') }}</th>
            <th>{{ t('problemDetail.colTime') }}</th>
            <th>{{ t('problemDetail.colPeeked') }}</th>
            <th>{{ t('problemDetail.colStuckLine') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rep in repsNewestFirst" :key="`${rep.repNumber}-${rep.date}-${rep.seconds}`">
            <td>{{ rep.repNumber }}</td>
            <td>{{ rep.date }}</td>
            <td>
              <Pill :tone="rep.result === 'clean' ? 'easy' : rep.result === 'assisted' ? 'medium' : 'hard'">
                {{ rep.result }}
              </Pill>
            </td>
            <td>{{ formatSeconds(rep.seconds) }}</td>
            <td>{{ rep.usedReference ? t('common.yes') : t('common.no') }}</td>
            <td class="stuck-line-cell">{{ rep.stuckLine ?? t('common.unknownDash') }}</td>
          </tr>
        </tbody>
      </Table>
    </Card>

    <div class="start-rep-row">
      <RouterLink v-if="state.solutionCode.trim() !== ''" :to="`/train/solution/${problem.id}`">
        <Button variant="primary">{{ t('problemDetail.startRep') }}</Button>
      </RouterLink>
      <p v-else class="lede">{{ t('problemDetail.pasteFirst') }}</p>
    </div>
  </div>
</template>

<style scoped>
.eyebrow {
  margin-bottom: var(--space-1);
}
.title-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
}
.title-row h1 {
  margin: 0;
}
.pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}
.sub-skill {
  color: var(--color-text-muted);
}
.meta {
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  margin-bottom: var(--space-8);
}
.lede {
  color: var(--color-text-muted);
}
.section {
  margin-bottom: var(--space-6);
}

.run-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-4);
  margin-bottom: var(--space-6);
}
.run-clock {
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  margin: 0;
  min-width: 4ch;
}

.ladder {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.ladder-step {
  padding-bottom: var(--space-4);
  border-bottom: var(--border-width) solid var(--color-border);
}
.ladder-step:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.ladder-title {
  font-weight: 600;
  margin: 0 0 var(--space-2);
}
.ladder-title--locked {
  color: var(--color-text-faint);
  font-weight: 400;
}
.ladder-lock {
  margin-left: var(--space-2);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ladder-description {
  margin: 0;
  color: var(--color-text-muted);
}
.ladder-description :deep(code) {
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  background: var(--color-bg);
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
}
.editorial-warning {
  color: var(--color-medium);
  margin: 0 0 var(--space-3);
}

.solution-box,
.notes-box {
  width: 100%;
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  background: var(--color-bg);
  color: var(--color-text);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  resize: vertical;
}
.solution-box {
  min-height: 240px;
  font-family: var(--font-mono);
  font-size: var(--text-code);
  line-height: var(--leading-code);
}
.notes-box {
  min-height: 100px;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
}

.stuck-line-cell {
  white-space: normal !important; /* same Table-vs-consumer specificity note as elsewhere */
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  min-width: 220px;
}

.start-rep-row {
  margin-top: var(--space-6);
}
</style>
