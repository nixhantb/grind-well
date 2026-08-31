<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { patterns, problems } from '../content'
import { useProgressStore } from '../stores/progress'
import { deriveCurrentRepNumber } from '../lib/scheduler'
import { todayISO } from '../lib/date'
import type { RepResult } from '../stores/progressTypes'
import MotorTrainer from '../components/MotorTrainer.vue'
import Pill from '../components/Pill.vue'

const { t } = useI18n()

interface Props {
  kind: string
  id: string
}
const props = defineProps<Props>()

const store = useProgressStore()

type Resolved =
  | { status: 'not-found' }
  | { status: 'no-solution'; problemId: number; problemTitle: string }
  | { status: 'ready'; mode: 'pattern' | 'solution'; contextLabel: string; referenceCode: string; targetSeconds: number; problemId: number | null }

// Templates don't have an official target time in the curriculum data —
// only problems do. This heuristic (45s/line) exists purely so the timer
// has SOMETHING to color-shift against; it's labeled as an estimate in
// the UI rather than presented as a real target.
function estimateTemplateTargetSeconds(template: string): number {
  return template.split('\n').length * 45
}

const resolved = computed<Resolved>(() => {
  if (props.kind === 'pattern') {
    const pattern = patterns.find((p) => p.id === props.id)
    if (!pattern) return { status: 'not-found' }
    return {
      status: 'ready',
      mode: 'pattern',
      contextLabel: `${pattern.name} — template`,
      referenceCode: pattern.template,
      targetSeconds: estimateTemplateTargetSeconds(pattern.template),
      problemId: null,
    }
  }

  if (props.kind === 'solution') {
    const problemId = Number(props.id)
    const problem = problems.find((p) => p.id === problemId)
    if (!problem) return { status: 'not-found' }

    const solutionCode = store.getState(problemId).solutionCode
    if (solutionCode.trim() === '') return { status: 'no-solution', problemId, problemTitle: problem.title }

    return {
      status: 'ready',
      mode: 'solution',
      contextLabel: `#${problem.id} ${problem.title}`,
      referenceCode: solutionCode,
      targetSeconds: problem.targetMinutes * 60,
      problemId,
    }
  }

  return { status: 'not-found' }
})

function handleLogRep(payload: { result: RepResult; seconds: number; stuckLine: string | null; usedReference: boolean }) {
  if (resolved.value.status !== 'ready' || resolved.value.problemId === null) return
  const problemId = resolved.value.problemId
  const repNumber = deriveCurrentRepNumber(store.getState(problemId).reps)
  store.addRep(problemId, { problemId, repNumber, date: todayISO(), ...payload })
}

// Reactive status line for solution mode — reads straight from the
// store, so it updates the instant handleLogRep runs, with no local
// "just logged" state of its own to keep in sync.
const liveProblemState = computed(() => {
  if (resolved.value.status !== 'ready' || resolved.value.problemId === null) return null
  return store.getState(resolved.value.problemId)
})
</script>

<template>
  <div v-if="resolved.status === 'not-found'">
    <p>{{ t('trainerView.notFound', { kind, id }) }}</p>
    <RouterLink to="/patterns">{{ t('common.backToPatterns') }}</RouterLink>
  </div>

  <div v-else-if="resolved.status === 'no-solution'">
    <h1>{{ t('trainerView.noSolutionTitle') }}</h1>
    <p>
      {{ t('trainerView.noSolutionBody', { id: resolved.problemId, title: resolved.problemTitle }) }}
    </p>
    <RouterLink :to="`/problems/${resolved.problemId}`">{{ t('trainerView.goToProblemDetail') }}</RouterLink>
  </div>

  <div v-else>
    <div v-if="liveProblemState" class="status-line">
      <Pill tone="neutral">{{ liveProblemState.status }}</Pill>
      <span v-if="liveProblemState.nextDueDate">{{ t('trainerView.nextDue', { date: liveProblemState.nextDueDate }) }}</span>
      <span v-else-if="liveProblemState.status === 'graduated'">{{ t('trainerView.graduatedNote') }}</span>
      <span>{{ t('trainerView.repsLoggedCount', liveProblemState.reps.length) }}</span>
    </div>

    <MotorTrainer
      :key="`${kind}-${id}`"
      :mode="resolved.mode"
      :reference-code="resolved.referenceCode"
      :target-seconds="resolved.targetSeconds"
      :context-label="resolved.contextLabel"
      @log-rep="handleLogRep"
    />
  </div>
</template>

<style scoped>
.status-line {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}
</style>
