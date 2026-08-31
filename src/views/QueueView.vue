<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ListChecks } from '@lucide/vue'
import { useProgressStore } from '../stores/progress'
import { patterns } from '../content'
import Button from '../components/Button.vue'
import Pill from '../components/Pill.vue'
import Table from '../components/Table.vue'
import PageHeader from '../components/PageHeader.vue'

const { t } = useI18n()
const store = useProgressStore()

function patternName(patternId: string): string {
  return patterns.find((p) => p.id === patternId)?.name ?? patternId
}
</script>

<template>
  <PageHeader :title="t('queue.title')" :subtitle="t('queue.subtitle')">
    <template #icon><ListChecks :size="20" /></template>
  </PageHeader>

  <p v-if="store.dueQueue.length === 0" class="empty">{{ t('queue.empty') }}</p>

  <Table v-else>
    <thead>
      <tr>
        <th>{{ t('queue.colDue') }}</th>
        <th>{{ t('queue.colProblem') }}</th>
        <th>{{ t('queue.colPattern') }}</th>
        <th>{{ t('queue.colDifficulty') }}</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="entry in store.dueQueue" :key="entry.item.problem.id">
        <td>
          <Pill :tone="entry.dueStatus === 'overdue' ? 'hard' : 'accent'">
            {{ entry.dueStatus === 'overdue' ? t('queue.overdue') : t('queue.dueToday') }}
          </Pill>
        </td>
        <td class="problem-cell">
          <RouterLink :to="`/problems/${entry.item.problem.id}`" class="problem-link">
            #{{ entry.item.problem.id }} {{ entry.item.problem.title }}
          </RouterLink>
        </td>
        <td>{{ patternName(entry.item.problem.patternId) }}</td>
        <td>
          <Pill :tone="entry.item.problem.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'">
            {{ entry.item.problem.difficulty }}
          </Pill>
        </td>
        <td>
          <RouterLink :to="`/train/solution/${entry.item.problem.id}`">
            <Button variant="primary">{{ t('queue.startRep') }}</Button>
          </RouterLink>
        </td>
      </tr>
    </tbody>
  </Table>
</template>

<style scoped>
.empty {
  color: var(--color-text-muted);
}
.problem-cell {
  white-space: normal !important; /* same Table-vs-consumer specificity note as PatternDetailView */
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
</style>
