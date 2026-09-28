<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { BookOpen } from '@lucide/vue'
import { ladder } from '../content'
import { retypingProtocol, blankPageRitual, pseudocodeBridge, weeklySchedule, cheatSheet } from '../content/protocols'
import { renderInlineMarkdown } from '../lib/markdownLite'
import Table from '../components/Table.vue'
import InteractiveChecklist from '../components/InteractiveChecklist.vue'
import PageHeader from '../components/PageHeader.vue'

const { t } = useI18n()
</script>

<!--
  This used to be six full Cards rendered open, one after another, with a
  jump-nav strip up top to cope with the resulting scroll — a page built
  to be read start to finish, when in practice it's reference material:
  you want ONE of these six things, not all of them, most visits.
  `<details>`/`<summary>` (native, no JS, fully keyboard-accessible) turns
  that into "one line per topic, expand what you actually need right
  now" — only the re-typing protocol (the one with the actual rep
  schedule and hard rules) defaults open, everything else starts
  collapsed. The content itself is untouched: still the verbatim text
  from content/protocols.ts, per that file's own header comment.
-->
<template>
  <PageHeader :title="t('protocols.title')" :subtitle="t('protocols.subtitle')">
    <template #icon><BookOpen :size="20" /></template>
  </PageHeader>

  <details class="protocol" open>
    <summary>
      <span class="protocol__title">{{ t('protocols.sectionRetyping') }}</span>
      <span class="protocol__teaser">{{ t('protocols.teaserRetyping') }}</span>
    </summary>
    <div class="protocol__body">
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
    </div>
  </details>

  <details class="protocol">
    <summary>
      <span class="protocol__title">{{ t('protocols.sectionBlankPage') }}</span>
      <span class="protocol__teaser">{{ t('protocols.teaserBlankPage') }}</span>
    </summary>
    <div class="protocol__body">
      <InteractiveChecklist :checklist="blankPageRitual" />
    </div>
  </details>

  <details class="protocol">
    <summary>
      <span class="protocol__title">{{ t('protocols.sectionPseudocode') }}</span>
      <span class="protocol__teaser">{{ t('protocols.teaserPseudocode') }}</span>
    </summary>
    <div class="protocol__body">
      <InteractiveChecklist :checklist="pseudocodeBridge" />
    </div>
  </details>

  <details class="protocol">
    <summary>
      <span class="protocol__title">{{ t('protocols.sectionLadder') }}</span>
      <span class="protocol__teaser">{{ t('protocols.teaserLadder') }}</span>
    </summary>
    <div class="protocol__body">
      <ol class="ladder-list">
        <li v-for="step in ladder" :key="step.minute">
          <strong>{{ t('protocols.ladderStepTitle', { minute: step.minute, title: step.title }) }}</strong>
          <span v-html="renderInlineMarkdown(' ' + step.description)" />
        </li>
      </ol>
    </div>
  </details>

  <details class="protocol">
    <summary>
      <span class="protocol__title">{{ t('protocols.sectionWeekly') }}</span>
      <span class="protocol__teaser">{{ t('protocols.teaserWeekly') }}</span>
    </summary>
    <div class="protocol__body">
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
    </div>
  </details>

  <details class="protocol">
    <summary>
      <span class="protocol__title">{{ t('protocols.sectionCheatSheet') }}</span>
      <span class="protocol__teaser">{{ t('protocols.teaserCheatSheet') }}</span>
    </summary>
    <div class="protocol__body">
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
    </div>
  </details>
</template>

<style scoped>
.protocol {
  margin-bottom: var(--space-3);
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden; /* keeps the summary's corners rounded when collapsed */
}
.protocol > summary {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  padding: var(--space-4) var(--space-6);
  cursor: pointer;
  list-style: none; /* replaced by the ::before caret below */
}
.protocol > summary::-webkit-details-marker {
  display: none; /* Safari's default marker, hidden the same way */
}
.protocol > summary::before {
  content: '▸';
  flex-shrink: 0;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  transition: transform var(--duration-fast) var(--ease-standard);
}
.protocol[open] > summary::before {
  transform: rotate(90deg);
}
.protocol__title {
  font-size: var(--text-lg);
  font-weight: 600;
}
.protocol__teaser {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.protocol__body {
  padding: 0 var(--space-6) var(--space-6);
  border-top: var(--border-width) solid var(--color-border);
  padding-top: var(--space-4);
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
   this component's own template to stay scoped. `.protocol__body` is
   that ancestor; v-html content nested inside still isn't part of the
   compiled template, so :deep() is still required, just anchored
   correctly this time. */
.protocol__body :deep(code) {
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

@media (max-width: 480px) {
  .protocol > summary {
    padding: var(--space-3) var(--space-4);
  }
  .protocol__body {
    padding: 0 var(--space-4) var(--space-4);
  }
}
</style>
