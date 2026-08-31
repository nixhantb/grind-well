<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { patterns, problems } from '../content'
import { useProgressStore } from '../stores/progress'
import { renderInlineMarkdown } from '../lib/markdownLite'
import { problemFlags } from '../lib/problemFlags'
import type { ProblemStatus } from '../stores/progressTypes'
import Button from '../components/Button.vue'
import Pill from '../components/Pill.vue'
import Card from '../components/Card.vue'
import Table from '../components/Table.vue'
import CodeBlock from '../components/CodeBlock.vue'

const { t } = useI18n()
const store = useProgressStore()

const STATUS_LABEL_KEY: Record<ProblemStatus, string> = {
  'not-started': 'patternDetail.statusNotStarted',
  'in-progress': 'patternDetail.statusInProgress',
  solved: 'patternDetail.statusSolved',
  graduated: 'patternDetail.statusGraduated',
}
const STATUS_TONE: Record<ProblemStatus, 'neutral' | 'accent' | 'easy'> = {
  'not-started': 'neutral',
  'in-progress': 'accent',
  solved: 'accent',
  graduated: 'easy',
}

// This route is registered with `props: true` (router/index.ts), so `id`
// arrives as a normal prop — not read via `useRoute().params.id`. That
// matters for what happens when you navigate from /patterns/3 straight to
// /patterns/4: Vue Router reuses this same component instance (both URLs
// match the same route record), and because `id` is a prop, it updates
// reactively just like any other prop change would — no extra code, and
// no `watch` needed to notice the param changed.
interface Props {
  id: string
}
const props = defineProps<Props>()

// `computed` re-runs only when `props.id` changes, and caches the result
// between renders otherwise — the same reasoning as PatternsView's
// problemCounts, just keyed on a prop instead of static data.
const pattern = computed(() => patterns.find((p) => p.id === props.id))
const patternProblems = computed(() => problems.filter((p) => p.patternId === props.id))
</script>

<template>
  <div v-if="pattern">
    <p class="eyebrow">{{ t('patternDetail.eyebrow', { order: pattern.order }) }}</p>
    <h1>{{ pattern.name }}</h1>
    <p class="one-liner" v-html="renderInlineMarkdown(pattern.oneLiner)" />

    <div class="triggers">
      <Pill v-for="signal in pattern.triggerSignals" :key="signal" tone="neutral">
        <span v-html="renderInlineMarkdown(signal)" />
      </Pill>
    </div>

    <Card class="section">
      <template #header>{{ t('patternDetail.templateHeader') }}</template>
      <CodeBlock :code="pattern.template" />
      <RouterLink :to="`/train/pattern/${pattern.id}`" class="drill-link">
        <Button variant="primary">{{ t('patternDetail.drillButton') }}</Button>
      </RouterLink>
    </Card>

    <Card class="section">
      <template #header>{{ t('patternDetail.mechanicsHeader') }}</template>
      <ul class="mechanics">
        <li v-for="(mechanic, i) in pattern.mechanics" :key="i" v-html="renderInlineMarkdown(mechanic)" />
      </ul>
    </Card>

    <Card class="section">
      <template #header>{{ t('patternDetail.problemsHeader') }}</template>
      <Table>
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t('patternDetail.colProblem') }}</th>
            <th>{{ t('patternDetail.colDifficulty') }}</th>
            <th>{{ t('patternDetail.colSubSkill') }}</th>
            <th>{{ t('patternDetail.colLoc') }}</th>
            <th>{{ t('patternDetail.colTarget') }}</th>
            <th>{{ t('patternDetail.colStatus') }}</th>
            <th>{{ t('patternDetail.colLeetCode') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="problem in patternProblems" :key="problem.id">
            <td>{{ problem.id }}</td>
            <td class="problem-cell">
              <RouterLink :to="`/problems/${problem.id}`" class="problem-link">{{ problem.title }}</RouterLink>
              <div class="flags">
                <Pill v-for="flag in problemFlags(problem)" :key="flag.kind + (flag.repOf ?? '')" :tone="flag.tone">
                  {{ t(`problemFlags.${flag.kind}`, { id: flag.repOf }) }}
                </Pill>
              </div>
            </td>
            <td>
              <Pill :tone="problem.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'">
                {{ problem.difficulty }}
              </Pill>
            </td>
            <td class="sub-skill" v-html="renderInlineMarkdown(problem.subSkill)" />
            <td>{{ problem.expectedLoc }}</td>
            <td>{{ t('patternDetail.targetMinutes', { minutes: problem.targetMinutes }) }}</td>
            <td>
              <Pill :tone="STATUS_TONE[store.getState(problem.id).status]">
                {{ t(STATUS_LABEL_KEY[store.getState(problem.id).status]) }}
              </Pill>
            </td>
            <td>
              <a :href="problem.url" target="_blank" rel="noopener noreferrer">{{ t('patternDetail.openLeetCode') }}</a>
            </td>
          </tr>
        </tbody>
      </Table>
    </Card>
  </div>

  <div v-else>
    <p>{{ t('patternDetail.notFound', { id }) }}</p>
    <RouterLink to="/patterns">{{ t('common.backToPatterns') }}</RouterLink>
  </div>
</template>

<style scoped>
.eyebrow {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  margin-bottom: var(--space-1);
}
.one-liner {
  font-size: var(--text-lg);
  color: var(--color-text-muted);
  margin-bottom: var(--space-6);
}
.triggers {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-8);
}
.section {
  margin-bottom: var(--space-6);
}
.drill-link {
  display: inline-block;
  margin-top: var(--space-4);
  text-decoration: none;
}

.mechanics {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
.mechanics li {
  padding-left: var(--space-8);
  position: relative;
  line-height: var(--leading-normal);
}
.mechanics li::before {
  content: '☐';
  position: absolute;
  left: 0;
  color: var(--color-text-faint);
}
.mechanics li :deep(code) {
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  background: var(--color-bg);
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
}

.problem-cell {
  white-space: normal !important; /* same Table-vs-consumer specificity note as PatternsView */
  min-width: 260px;
}
.problem-link {
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
}
.problem-link:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}
.flags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-1);
}
.sub-skill {
  white-space: normal !important;
  min-width: 280px;
  color: var(--color-text-muted);
}
.sub-skill :deep(code) {
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  background: var(--color-bg);
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
}
</style>
