<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Database } from '@lucide/vue'
import { useAppStore } from '../stores/app'
import { useProgressStore } from '../stores/progress'
import { buildExportBundle, isExportBundle, exportFileName } from '../lib/exportImport'
import { stuckLineFrequency } from '../lib/stuckLines'
import { formatSeconds } from '../lib/format'
import { problems } from '../content'
import Button from '../components/Button.vue'
import Card from '../components/Card.vue'
import Pill from '../components/Pill.vue'
import Table from '../components/Table.vue'
import PageHeader from '../components/PageHeader.vue'

const { t } = useI18n()
const appStore = useAppStore()
const progressStore = useProgressStore()

const fileInput = ref<HTMLInputElement | null>(null)
const message = ref<{ kind: 'success' | 'error'; text: string } | null>(null)

const problemCount = computed(() => Object.keys(progressStore.problemStates).length)

// ---------- raw rep log + stuck-line frequency ----------
// Flattened across every problem, newest first — this is deliberately
// the least-processed view in the app: every other screen summarizes,
// this one is meant to be read raw, stuckLine column included.
const allRepsWithContext = computed(() => {
  const rows = Object.values(progressStore.problemStates).flatMap((state) =>
    state.reps.map((rep) => ({
      ...rep,
      problemTitle: problems.find((p) => p.id === rep.problemId)?.title ?? `#${rep.problemId}`,
    })),
  )
  return rows.sort((a, b) => b.date.localeCompare(a.date))
})

const stuckLines = computed(() => stuckLineFrequency(progressStore.allReps))

function handleExport() {
  const bundle = buildExportBundle(appStore.theme, progressStore.problemStates)
  const json = JSON.stringify(bundle, null, 2)

  // Vanilla browser file-download recipe: wrap the string in a Blob, give
  // it a temporary object URL, and "click" an <a download> that nothing
  // ever attaches to the page. This is a real desktop/browser app, not a
  // sandboxed preview, so this actually saves a file for the user.
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = exportFileName()
  link.click()
  URL.revokeObjectURL(url)

  message.value = { kind: 'success', text: t('data.exportedMessage', { filename: exportFileName() }) }
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // so selecting the same file again still fires @change

  if (!file) return

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)

    if (!isExportBundle(parsed)) {
      message.value = { kind: 'error', text: t('data.notBackupError', { brand: t('nav.brand') }) }
      return
    }

    progressStore.replaceAll(parsed.problemStates)
    appStore.theme = parsed.theme
    message.value = {
      kind: 'success',
      text: t('data.importedMessage', { date: new Date(parsed.exportedAt).toLocaleString() }),
    }
  } catch {
    message.value = { kind: 'error', text: t('data.invalidJsonError') }
  }
}

function handleReset() {
  const confirmed = window.confirm(t('data.resetConfirm'))
  if (!confirmed) return
  progressStore.resetAll()
  message.value = { kind: 'success', text: t('data.resetSuccess') }
}
</script>

<template>
  <PageHeader :title="t('data.title')" :subtitle="t('data.subtitle')">
    <template #icon><Database :size="20" /></template>
  </PageHeader>

  <Card class="section">
    <template #header>{{ t('data.backupHeader') }}</template>
    <div class="row">
      <Button variant="primary" @click="handleExport">{{ t('data.exportButton') }}</Button>
      <Button variant="secondary" @click="triggerImport">{{ t('data.importButton') }}</Button>
      <input
        ref="fileInput"
        type="file"
        accept="application/json"
        class="file-input"
        @change="handleFileSelected"
      />
    </div>
    <p v-if="message" class="message" :class="message.kind">{{ message.text }}</p>
  </Card>

  <Card class="section">
    <template #header>{{ t('data.resetHeader') }}</template>
    <p>{{ t('data.trackingProgress', problemCount) }}</p>
    <Button variant="ghost" @click="handleReset">{{ t('data.resetButton') }}</Button>
  </Card>

  <Card class="section">
    <template #header>{{ t('data.stuckLineHeader') }}</template>
    <p class="lede">{{ t('data.stuckLineIntro') }}</p>
    <p v-if="stuckLines.length === 0" class="lede">{{ t('data.stuckLineEmpty') }}</p>
    <ol v-else class="stuck-list">
      <li v-for="entry in stuckLines" :key="entry.line">
        <i18n-t keypath="data.stuckLineEntry" :plural="entry.count">
          <template #line><code>{{ entry.line }}</code></template>
        </i18n-t>
      </li>
    </ol>
  </Card>

  <Card class="section">
    <template #header>{{ t('data.rawRepLogHeader') }}</template>
    <p v-if="allRepsWithContext.length === 0" class="lede">{{ t('common.noRepsLogged') }}</p>
    <Table v-else>
      <thead>
        <tr>
          <th>{{ t('data.colProblem') }}</th>
          <th>{{ t('data.colRep') }}</th>
          <th>{{ t('data.colDate') }}</th>
          <th>{{ t('data.colResult') }}</th>
          <th>{{ t('data.colTime') }}</th>
          <th>{{ t('data.colPeeked') }}</th>
          <th>{{ t('data.colStuckLine') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="rep in allRepsWithContext" :key="`${rep.problemId}-${rep.repNumber}-${rep.date}-${rep.seconds}`">
          <td class="problem-cell">
            <RouterLink :to="`/problems/${rep.problemId}`">#{{ rep.problemId }} {{ rep.problemTitle }}</RouterLink>
          </td>
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
</template>

<style scoped>
.lede {
  color: var(--color-text-muted);
  margin-bottom: var(--space-6);
}
.section {
  margin-bottom: var(--space-6);
}
.row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
.file-input {
  display: none;
}
.message {
  margin-top: var(--space-4);
  margin-bottom: 0;
  font-size: var(--text-sm);
}
.message.success {
  color: var(--color-easy);
}
.message.error {
  color: var(--color-hard);
}
.stuck-list {
  margin: 0;
  padding-left: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.stuck-list code {
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  background: var(--color-bg);
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
}
.problem-cell {
  white-space: normal !important; /* same Table-vs-consumer specificity note as elsewhere */
  min-width: 220px;
}
.stuck-line-cell {
  white-space: normal !important;
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  min-width: 220px;
}
</style>
