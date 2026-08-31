<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { LayoutGrid, ChevronRight, ExternalLink } from '@lucide/vue'
import { patterns, problems } from '../content'
import { useProgressStore } from '../stores/progress'
import type { Problem } from '../content/types'
import Pill from '../components/Pill.vue'
import ProgressBar from '../components/ProgressBar.vue'
import PageHeader from '../components/PageHeader.vue'

const { t } = useI18n()
const store = useProgressStore()

// "Done" here means status !== 'not-started' — the same bar this app
// already used for "touched" elsewhere (Dashboard's suggestNextProblem
// input). It's deliberately NOT "graduated": graduated (3 clean reps) is
// a much stricter bar, already visualized on the Dashboard's pattern
// strip. This checklist answers a different, more casual question: "have
// I at least gotten a working solution in for this one yet", which is
// exactly what a checkbox can honestly represent.
function isDone(problemId: number): boolean {
  return store.getState(problemId).status !== 'not-started'
}

const problemsByPattern = computed(() => {
  const map = new Map<string, Problem[]>()
  for (const problem of problems) {
    const list = map.get(problem.patternId)
    if (list) list.push(problem)
    else map.set(problem.patternId, [problem])
  }
  return map
})

const patternRows = computed(() =>
  patterns.map((pattern) => {
    const patternProblems = problemsByPattern.value.get(pattern.id) ?? []
    const done = patternProblems.filter((p) => isDone(p.id)).length
    return { pattern, problems: patternProblems, done, total: patternProblems.length }
  }),
)

// ---------- overall progress card ----------
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const
const overallDone = computed(() => problems.filter((p) => isDone(p.id)).length)
const overallPercent = computed(() => (problems.length === 0 ? 0 : Math.round((overallDone.value / problems.length) * 100)))
const byDifficulty = computed(() =>
  DIFFICULTIES.map((d) => {
    const inDifficulty = problems.filter((p) => p.difficulty === d)
    return { difficulty: d, done: inDifficulty.filter((p) => isDone(p.id)).length, total: inDifficulty.length }
  }),
)

// The ring is one <circle> with a dash-offset trick — no chart library
// for a single percentage. r=26 -> circumference below.
const RING_CIRCUMFERENCE = 2 * Math.PI * 26
const ringOffset = computed(() => RING_CIRCUMFERENCE * (1 - overallPercent.value / 100))

// ---------- accordion open/closed ----------
const expanded = ref<Set<string>>(new Set())
function toggle(patternId: string) {
  const next = new Set(expanded.value)
  if (next.has(patternId)) next.delete(patternId)
  else next.add(patternId)
  expanded.value = next
}

// ---------- checking a box ----------
// Same stand-in as the Dashboard's "I solved this" flow, deliberately: one
// save path for "this problem now has a working solution attached", not a
// second, lighter-weight notion of "done". Cancelling the prompt (or
// leaving it empty) saves nothing, and since `:checked` is derived
// straight from the store (never a local ref), the box simply stays
// unchecked — no manual reset to write.
function markDone(problem: Problem) {
  if (isDone(problem.id)) return
  const code = window.prompt(
    t('patterns.markDonePrompt', { id: problem.id, title: problem.title }),
    t('patterns.promptPlaceholder'),
  )
  if (code === null || code.trim() === '') return
  store.saveSolution(problem.id, code)
}
</script>

<template>
  <PageHeader :title="t('patterns.title')" :subtitle="t('patterns.subtitle')">
    <template #icon><LayoutGrid :size="20" /></template>
  </PageHeader>

  <div class="overall-card">
    <div class="ring-wrap">
      <svg class="ring" viewBox="0 0 60 60" aria-hidden="true">
        <circle class="ring__track" cx="30" cy="30" r="26" />
        <circle
          class="ring__fill"
          cx="30"
          cy="30"
          r="26"
          :stroke-dasharray="RING_CIRCUMFERENCE"
          :stroke-dashoffset="ringOffset"
        />
      </svg>
      <span class="ring__label">{{ overallPercent }}%</span>
    </div>
    <div class="overall-text">
      <p class="overall-title">{{ t('patterns.overallProgress') }}</p>
      <p class="overall-count">{{ overallDone }} <span>/ {{ problems.length }}</span></p>
    </div>
    <div class="difficulty-breakdown">
      <span v-for="d in byDifficulty" :key="d.difficulty" class="difficulty-item">
        <span class="difficulty-dot" :class="`difficulty-dot--${d.difficulty.toLowerCase()}`" />
        {{ d.difficulty }} {{ d.done }}<span class="difficulty-total">/{{ d.total }}</span>
      </span>
    </div>
  </div>

  <ul class="pattern-list">
    <li v-for="row in patternRows" :key="row.pattern.id" class="pattern-item">
      <button
        type="button"
        class="pattern-row"
        :aria-expanded="expanded.has(row.pattern.id)"
        @click="toggle(row.pattern.id)"
      >
        <ChevronRight :size="18" class="pattern-row__chevron" :class="{ 'pattern-row__chevron--open': expanded.has(row.pattern.id) }" />
        <span class="pattern-row__name">{{ row.pattern.order }}. {{ row.pattern.name }}</span>
        <span class="pattern-row__bar"><ProgressBar :value="row.done" :max="row.total" /></span>
        <span class="pattern-row__count">{{ row.done }} / {{ row.total }}</span>
      </button>

      <div v-if="expanded.has(row.pattern.id)" class="pattern-panel">
        <p class="pattern-panel__one-liner">{{ row.pattern.oneLiner }}</p>
        <ul class="checklist">
          <li v-for="problem in row.problems" :key="problem.id" class="checklist-row">
            <label class="checklist-check">
              <input
                type="checkbox"
                :checked="isDone(problem.id)"
                :disabled="isDone(problem.id)"
                :aria-label="t('patterns.markDoneCheckboxLabel', { id: problem.id, title: problem.title })"
                @click.prevent="markDone(problem)"
              />
            </label>
            <RouterLink :to="`/problems/${problem.id}`" class="checklist-title">
              #{{ problem.id }} {{ problem.title }}
            </RouterLink>
            <Pill :tone="problem.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'">{{ problem.difficulty }}</Pill>
            <a :href="problem.url" target="_blank" rel="noopener noreferrer" class="checklist-open" :aria-label="t('patterns.openOnLeetCode')">
              <ExternalLink :size="15" />
            </a>
          </li>
        </ul>
        <RouterLink :to="`/patterns/${row.pattern.id}`" class="pattern-panel__full-link">
          {{ t('patterns.openFullPatternPage') }}
        </RouterLink>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.overall-card {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-5) var(--space-6);
  margin-bottom: var(--space-6);
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-lg);
}
.ring-wrap {
  position: relative;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}
.ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring__track {
  fill: none;
  stroke: var(--color-border);
  stroke-width: 5;
}
.ring__fill {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset var(--duration-base) var(--ease-standard);
}
.ring__label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: 700;
}
.overall-title {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.overall-count {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xl);
  font-weight: 700;
}
.overall-count span {
  font-size: var(--text-base);
  font-weight: 400;
  color: var(--color-text-faint);
}
.difficulty-breakdown {
  display: flex;
  gap: var(--space-5);
  margin-left: auto;
  font-size: var(--text-sm);
  color: var(--color-text);
}
.difficulty-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
}
.difficulty-total {
  color: var(--color-text-faint);
}
.difficulty-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.difficulty-dot--easy {
  background: var(--color-easy);
}
.difficulty-dot--medium {
  background: var(--color-medium);
}
.difficulty-dot--hard {
  background: var(--color-hard);
}

.pattern-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.pattern-item {
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.pattern-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-height: var(--hit-target);
  padding: var(--space-4) var(--space-5);
  background: none;
  border: none;
  font: inherit;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}
.pattern-row:hover {
  background: var(--color-surface);
}
.pattern-row__chevron {
  flex-shrink: 0;
  color: var(--color-text-faint);
  transition: transform var(--duration-base) var(--ease-standard);
}
.pattern-row__chevron--open {
  transform: rotate(90deg);
}
.pattern-row__name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pattern-row__bar {
  width: 140px;
  flex-shrink: 0;
}
.pattern-row__count {
  flex-shrink: 0;
  width: 56px;
  text-align: right;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.pattern-panel {
  padding: 0 var(--space-5) var(--space-5);
  border-top: var(--border-width) solid var(--color-border);
}
.pattern-panel__one-liner {
  margin: var(--space-4) 0 var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}
.checklist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.checklist-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: var(--border-width) solid var(--color-border);
}
.checklist-row:last-child {
  border-bottom: none;
}
.checklist-check {
  display: flex;
  flex-shrink: 0;
}
.checklist-check input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-easy);
  cursor: pointer;
}
.checklist-check input:disabled {
  cursor: default;
}
.checklist-title {
  flex: 1;
  min-width: 0;
  color: var(--color-text);
  text-decoration: none;
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.checklist-title:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}
.checklist-open {
  display: flex;
  flex-shrink: 0;
  color: var(--color-text-faint);
}
.checklist-open:hover {
  color: var(--color-text);
}
.pattern-panel__full-link {
  display: inline-block;
  margin-top: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-accent);
  text-decoration: none;
}
.pattern-panel__full-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .overall-card {
    flex-wrap: wrap;
    gap: var(--space-4);
    padding: var(--space-4);
  }
  .difficulty-breakdown {
    margin-left: 0;
    flex-basis: 100%;
    flex-wrap: wrap;
    gap: var(--space-3) var(--space-5);
  }
  .pattern-row {
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
  }
  .pattern-row__bar {
    width: 64px;
  }
}

@media (max-width: 480px) {
  /* At this width the bar is too thin to read anyway - the count number
     alone already carries the same information. */
  .pattern-row__bar {
    display: none;
  }
  .checklist-title {
    /* Ellipsis-truncating a long title made sense with room to spare;
       under 480px there isn't, so let it wrap onto a second line instead
       of hiding half the problem's name. */
    white-space: normal;
  }
}
</style>
