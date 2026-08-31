<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookOpen } from '@lucide/vue'
import { ladder } from '../content'
import { retypingProtocol, blankPageRitual, pseudocodeBridge, weeklySchedule, cheatSheet } from '../content/protocols'
import { renderInlineMarkdown } from '../lib/markdownLite'
import Card from '../components/Card.vue'
import Table from '../components/Table.vue'
import InteractiveChecklist from '../components/InteractiveChecklist.vue'
import PageHeader from '../components/PageHeader.vue'

const { t } = useI18n()

const sections = computed(() => [
  { id: 'retyping', label: t('protocols.navRetyping') },
  { id: 'blank-page', label: t('protocols.navBlankPage') },
  { id: 'pseudocode', label: t('protocols.navPseudocode') },
  { id: 'ladder', label: t('protocols.navLadder') },
  { id: 'weekly', label: t('protocols.navWeekly') },
  { id: 'cheat-sheet', label: t('protocols.navCheatSheet') },
])
</script>

<template>
  <PageHeader :title="t('protocols.title')" :subtitle="t('protocols.subtitle')">
    <template #icon><BookOpen :size="20" /></template>
  </PageHeader>

  <nav class="jump-nav" aria-label="Jump to section">
    <a v-for="s in sections" :key="s.id" :href="`#${s.id}`">{{ s.label }}</a>
  </nav>

  <Card id="retyping" class="section">
    <template #header>{{ t('protocols.sectionRetyping') }}</template>
    <p v-html="renderInlineMarkdown(retypingProtocol.intro)" />
    <p v-html="renderInlineMarkdown(retypingProtocol.setup)" />

    <Table>
      <thead>
        <tr>
          <th>{{ t('protocols.colRep') }}</th>
          <th>{{ t('protocols.colWhen') }}</th>
          <th>{{ t('protocols.colNotesAllowed') }}</th>
          <th>{{ t('protocols.colDoneWhen') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in retypingProtocol.repSchedule" :key="row.rep">
          <td>{{ row.rep }}</td>
          <td class="wrap">{{ row.when }}</td>
          <td>{{ row.notesAllowed }}</td>
          <td class="wrap" v-html="renderInlineMarkdown(row.doneWhen)" />
        </tr>
      </tbody>
    </Table>

    <p class="prose" v-html="renderInlineMarkdown(retypingProtocol.graduates)" />
    <p class="prose" v-for="(rule, i) in retypingProtocol.hardRules" :key="i" v-html="renderInlineMarkdown(rule)" />
    <p class="prose" v-html="renderInlineMarkdown(retypingProtocol.csharpAddition)" />
    <p class="prose" v-html="renderInlineMarkdown(retypingProtocol.masterCopies)" />
  </Card>

  <Card id="blank-page" class="section">
    <template #header>{{ t('protocols.sectionBlankPage') }}</template>
    <InteractiveChecklist :checklist="blankPageRitual" />
  </Card>

  <Card id="pseudocode" class="section">
    <template #header>{{ t('protocols.sectionPseudocode') }}</template>
    <InteractiveChecklist :checklist="pseudocodeBridge" />
  </Card>

  <Card id="ladder" class="section">
    <template #header>{{ t('protocols.sectionLadder') }}</template>
    <p class="prose">{{ t('protocols.ladderIntro') }}</p>
    <ol class="ladder-list">
      <li v-for="step in ladder" :key="step.minute">
        <strong>{{ t('protocols.ladderStepTitle', { minute: step.minute, title: step.title }) }}</strong>
        <span v-html="renderInlineMarkdown(' ' + step.description)" />
      </li>
    </ol>
  </Card>

  <Card id="weekly" class="section">
    <template #header>{{ t('protocols.sectionWeekly') }}</template>
    <p class="prose" v-html="renderInlineMarkdown(weeklySchedule.split)" />

    <h3>{{ t('protocols.weeklyMondaySaturday') }}</h3>
    <Table>
      <thead>
        <tr>
          <th>{{ t('protocols.colTime') }}</th>
          <th>{{ t('protocols.colBlock') }}</th>
          <th>{{ t('protocols.colWhatExactly') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in weeklySchedule.mondaySaturday" :key="row.time">
          <td>{{ row.time }}</td>
          <td v-html="renderInlineMarkdown(row.block)" />
          <td class="wrap" v-html="renderInlineMarkdown(row.detail ?? '')" />
        </tr>
      </tbody>
    </Table>
    <p class="prose" v-html="renderInlineMarkdown(weeklySchedule.mondaySaturdayNote)" />

    <h3>{{ t('protocols.weeklySunday') }}</h3>
    <Table>
      <thead>
        <tr>
          <th>{{ t('protocols.colTime') }}</th>
          <th>{{ t('protocols.colBlock') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in weeklySchedule.sunday" :key="row.time">
          <td>{{ row.time }}</td>
          <td class="wrap" v-html="renderInlineMarkdown(row.block)" />
        </tr>
      </tbody>
    </Table>

    <h3>{{ t('protocols.pacingHeader') }}</h3>
    <p class="prose" v-html="renderInlineMarkdown(weeklySchedule.pacing)" />

    <h3>{{ t('protocols.metricHeader') }}</h3>
    <blockquote class="metric" v-html="renderInlineMarkdown(weeklySchedule.metric)" />
    <p class="prose" v-html="renderInlineMarkdown(weeklySchedule.metricFollowup)" />
  </Card>

  <Card id="cheat-sheet" class="section">
    <template #header>{{ t('protocols.sectionCheatSheet') }}</template>
    <p class="prose" v-html="renderInlineMarkdown(cheatSheet.intro)" />
    <Table>
      <thead>
        <tr>
          <th>{{ t('protocols.cheatSheetColOperation') }}</th>
          <th>{{ t('protocols.cheatSheetColLine') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in cheatSheet.rows" :key="row.operation">
          <td>{{ row.operation }}</td>
          <td class="wrap" v-html="renderInlineMarkdown(row.line)" />
        </tr>
      </tbody>
    </Table>

    <h3>{{ t('protocols.trapsHeader') }}</h3>
    <ol class="traps">
      <li v-for="(trap, i) in cheatSheet.rankedTraps" :key="i" v-html="renderInlineMarkdown(trap)" />
    </ol>
  </Card>
</template>

<style scoped>
.jump-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-4);
  border-bottom: var(--border-width) solid var(--color-border);
}
.jump-nav a {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  text-decoration: none;
  transition: border-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard);
}
.jump-nav a:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}
.section {
  margin-bottom: var(--space-8);
  scroll-margin-top: var(--space-6);
}
.prose {
  color: var(--color-text-muted);
  margin: var(--space-3) 0;
}
.wrap {
  white-space: normal !important; /* same Table-vs-consumer specificity note as elsewhere */
  min-width: 220px;
}
/* `:deep()` alone, with nothing in front of it, compiles to an
   UNSCOPED global `code { }` rule — it needs a real ancestor class from
   this component's own template to stay scoped. `.section` (the Card
   wrappers) is that ancestor; v-html content nested inside still isn't
   part of the compiled template, so :deep() is still required, just
   anchored correctly this time. */
.section :deep(code) {
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  background: var(--color-bg);
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
}
.ladder-list,
.traps {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  color: var(--color-text-muted);
  padding-left: var(--space-6);
  margin: var(--space-4) 0;
}
.metric {
  margin: var(--space-4) 0;
  padding: var(--space-3) var(--space-4);
  border-left: 3px solid var(--color-accent);
  background: var(--color-surface);
  font-size: var(--text-lg);
}
h3 {
  margin-top: var(--space-6);
}
</style>
