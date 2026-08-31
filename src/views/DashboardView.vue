<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  LayoutDashboard,
  ListChecks,
  CalendarClock,
  GraduationCap,
  Target,
  Sparkles,
  TrendingUp,
  LayoutGrid,
  BookOpen,
  Database,
  ChevronRight,
} from '@lucide/vue'
import { useProgressStore } from '../stores/progress'
import { patterns, problems } from '../content'
import { suggestNextProblem } from '../lib/suggestNextProblem'
import { weeklyColdReproductionRates } from '../lib/scheduler'
import Button from '../components/Button.vue'
import Card from '../components/Card.vue'
import Pill from '../components/Pill.vue'
import PageHeader from '../components/PageHeader.vue'
import StatCard from '../components/StatCard.vue'

const { t } = useI18n()
const store = useProgressStore()

// "What do I do right now" is three questions, answered top to bottom:
// what's due, what's new, and am I actually getting better. Total solved
// is deliberately NOT one of the top questions: it's the vanity metric
// that measures activity, not retention, so it only appears small and
// muted near the bottom.

// ---------- 1. reps due today, split overdue vs due-today ----------
const dueCount = computed(() => store.dueQueue.length)
const overdueCount = computed(() => store.dueQueue.filter((e) => e.dueStatus === 'overdue').length)
const dueTodayCount = computed(() => store.dueQueue.filter((e) => e.dueStatus === 'due-today').length)
const dueSublabel = computed(() => {
  if (dueCount.value === 0) return t('dashboard.statRepsDueCaughtUp')
  return t('dashboard.statRepsDueSplit', { overdue: overdueCount.value, dueToday: dueTodayCount.value })
})

// ---------- 2. today's suggested new problem ----------
const touchedIds = computed(() => {
  const ids = new Set<number>()
  for (const problem of problems) {
    if (store.getState(problem.id).status !== 'not-started') ids.add(problem.id)
  }
  return ids
})
const suggestedProblem = computed(() => suggestNextProblem(problems, touchedIds.value))

// A stand-in for the real "paste your accepted solution" flow, which
// doesn't exist yet. `window.prompt` is a deliberately crude, zero-new-UI
// way to collect the text — saving an EMPTY solution here would leave a
// dead end at the trainer, which needs real code to drill against.
function markSuggestedSolved() {
  if (!suggestedProblem.value) return
  const code = window.prompt(t('dashboard.promptTitle'), t('dashboard.promptPlaceholder'))
  if (code === null || code.trim() === '') return
  store.saveSolution(suggestedProblem.value.id, code)
}

// ---------- 3. cold reproduction rate — the hero stat ----------
const repsAttempted = computed(() => store.allReps.length)
const ratePercent = computed(() => Math.round(store.overallColdReproductionRate * 100))

const weeklyRates = computed(() => weeklyColdReproductionRates(store.allReps))
const thisWeekAttempted = computed(() => weeklyRates.value.at(-1)?.attempted ?? 0)

// A minimal hand-rolled sparkline — one polyline, no chart library. Only
// meaningful with at least two weeks of data; a single point isn't a trend.
const sparklinePoints = computed(() => {
  const rates = weeklyRates.value
  if (rates.length < 2) return ''
  const width = 220
  const height = 48
  const pad = 4
  return rates
    .map((week, i) => {
      const x = pad + (i / (rates.length - 1)) * (width - pad * 2)
      const y = pad + (1 - week.rate) * (height - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

// ---------- 4. pattern progress strip ----------
const patternProgress = computed(() =>
  patterns.map((pattern) => {
    const patternProblems = problems.filter((p) => p.patternId === pattern.id)
    const graduated = patternProblems.filter((p) => store.getState(p.id).status === 'graduated').length
    return { pattern, total: patternProblems.length, graduated }
  }),
)
const totalGraduated = computed(() => patternProgress.value.reduce((sum, p) => sum + p.graduated, 0))

// The de-emphasized vanity metric — shown, just small and last.
const totalSolved = computed(
  () => Object.values(store.problemStates).filter((s) => s.status !== 'not-started').length,
)

const quickLinks = computed(() => [
  { to: '/patterns', label: t('dashboard.quickLinkPatterns'), sublabel: t('dashboard.quickLinkPatternsSublabel'), icon: LayoutGrid },
  { to: '/queue', label: t('dashboard.quickLinkQueue'), sublabel: t('dashboard.quickLinkQueueSublabel'), icon: ListChecks },
  { to: '/protocols', label: t('dashboard.quickLinkProtocols'), sublabel: t('dashboard.quickLinkProtocolsSublabel'), icon: BookOpen },
  { to: '/data', label: t('dashboard.quickLinkData'), sublabel: t('dashboard.quickLinkDataSublabel'), icon: Database },
])
</script>

<template>
  <PageHeader :title="t('dashboard.title')" :subtitle="t('dashboard.subtitle')">
    <template #icon><LayoutDashboard :size="20" /></template>
  </PageHeader>

  <div class="stat-row">
    <StatCard :label="t('dashboard.statRepsDue')" :value="String(dueCount)" :sublabel="dueSublabel" tone="info">
      <template #icon><ListChecks :size="20" /></template>
    </StatCard>
    <StatCard
      :label="t('dashboard.statThisWeek')"
      :value="t('dashboard.statThisWeekValue', thisWeekAttempted)"
      :sublabel="t('dashboard.statThisWeekSublabel')"
      tone="neutral"
    >
      <template #icon><CalendarClock :size="20" /></template>
    </StatCard>
    <StatCard :label="t('dashboard.statGraduated')" :value="String(totalGraduated)" :sublabel="t('dashboard.statGraduatedSublabel')" tone="easy">
      <template #icon><GraduationCap :size="20" /></template>
    </StatCard>
  </div>

  <div class="dashboard-grid">
    <div class="dashboard-main">
      <Card class="section suggestion-card">
        <template #header>
          <Sparkles :size="16" class="suggestion-card__icon" />
          {{ t('dashboard.suggestionHeader') }}
        </template>
        <div v-if="suggestedProblem" class="suggestion">
          <div>
            <RouterLink :to="`/problems/${suggestedProblem.id}`" class="suggestion-link">
              #{{ suggestedProblem.id }} {{ suggestedProblem.title }}
            </RouterLink>
            <Pill :tone="suggestedProblem.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'">
              {{ suggestedProblem.difficulty }}
            </Pill>
          </div>
          <Button variant="secondary" @click="markSuggestedSolved">{{ t('dashboard.suggestionSolvedButton') }}</Button>
        </div>
        <p v-else class="due-clear">{{ t('dashboard.suggestionAllStarted') }}</p>
        <p class="stand-in-note">{{ t('dashboard.suggestionStandInNote') }}</p>
      </Card>

      <Card class="section">
        <template #header>
          <TrendingUp :size="16" class="suggestion-card__icon" />
          {{ t('dashboard.patternProgressHeader') }}
        </template>
        <div class="strip">
          <RouterLink
            v-for="p in patternProgress"
            :key="p.pattern.id"
            :to="`/patterns/${p.pattern.id}`"
            class="strip-cell"
            :title="`${p.pattern.name}: ${p.graduated}/${p.total} graduated`"
          >
            <span
              class="strip-fill"
              :style="{ height: `${p.total === 0 ? 0 : (p.graduated / p.total) * 100}%` }"
            />
          </RouterLink>
        </div>
        <p class="total-solved">{{ t('dashboard.totalSolved', { solved: totalSolved }) }}</p>
      </Card>
    </div>

    <div class="dashboard-rail">
      <div class="hero-card">
        <div class="hero-card__top">
          <Target :size="18" />
          <span>{{ t('dashboard.heroTitle') }}</span>
        </div>
        <template v-if="repsAttempted > 0">
          <p class="hero-card__value">{{ ratePercent }}%</p>
          <p class="hero-card__meta">{{ t('dashboard.heroRepsLogged', repsAttempted) }}</p>
          <svg v-if="sparklinePoints" class="sparkline" viewBox="0 0 220 48" aria-hidden="true">
            <polyline :points="sparklinePoints" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        </template>
        <p v-else class="hero-card__empty">{{ t('dashboard.heroEmpty') }}</p>
        <p class="hero-card__footnote">{{ t('dashboard.heroFootnote') }}</p>
      </div>

      <Card class="section quick-links">
        <template #header>{{ t('dashboard.quickLinksHeader') }}</template>
        <RouterLink v-for="link in quickLinks" :key="link.to" :to="link.to" class="quick-link">
          <component :is="link.icon" :size="18" class="quick-link__icon" />
          <span class="quick-link__text">
            <span class="quick-link__label">{{ link.label }}</span>
            <span class="quick-link__sublabel">{{ link.sublabel }}</span>
          </span>
          <ChevronRight :size="16" class="quick-link__chevron" />
        </RouterLink>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.section {
  margin-bottom: var(--space-6);
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-6);
  align-items: start;
}
.dashboard-main,
.dashboard-rail {
  min-width: 0;
}

.suggestion-card__icon {
  color: var(--color-accent);
  vertical-align: -3px;
  margin-right: var(--space-2);
}

.suggestion,
.due-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.due-clear {
  color: var(--color-text-muted);
  margin: 0;
}
.suggestion-link {
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
  margin-right: var(--space-3);
}
.suggestion-link:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}
.stand-in-note {
  margin: var(--space-3) 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.strip {
  display: flex;
  gap: var(--space-1);
  align-items: flex-end;
  height: 64px;
}
.strip-cell {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.strip-fill {
  width: 100%;
  min-height: 3px; /* every pattern stays visible even at 0 progress */
  background: var(--color-accent);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: height var(--duration-base) var(--ease-standard);
}
.total-solved {
  margin: var(--space-3) 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

/* The hero card is deliberately NOT built on <Card> — it needs the
   gradient background edge-to-edge, which fighting Card's own padding/
   border chrome isn't worth it for one card. */
.hero-card {
  padding: var(--space-5);
  margin-bottom: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--gradient-accent);
  color: #fff;
  box-shadow: var(--shadow-lg);
}
.hero-card__top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
  opacity: 0.9;
}
.hero-card__value {
  margin: var(--space-3) 0 0;
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}
.hero-card__meta {
  margin: var(--space-2) 0 var(--space-3);
  font-size: var(--text-sm);
  opacity: 0.85;
}
.hero-card__empty {
  margin: var(--space-3) 0 0;
  font-size: var(--text-sm);
  opacity: 0.9;
}
.hero-card__footnote {
  margin: var(--space-3) 0 0;
  padding-top: var(--space-3);
  border-top: 1px solid rgb(255 255 255 / 20%);
  font-size: var(--text-xs);
  opacity: 0.8;
}
.sparkline {
  display: block;
  width: 100%;
  height: 48px;
}

/* Card's own body padding (var(--space-6), 24px) is wider than this list
   wants — each row already pads itself, so tighten the outer padding via
   :deep() rather than fighting it with a wrapper. */
.quick-links :deep(.card__body) {
  padding: var(--space-3);
}
.quick-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-2);
  border-radius: var(--radius-md);
  color: var(--color-text);
  text-decoration: none;
  transition: background-color var(--duration-fast) var(--ease-standard);
}
.quick-link:hover {
  background: var(--color-surface);
}
.quick-link:not(:last-child) {
  margin-bottom: var(--space-1);
}
.quick-link__icon {
  flex-shrink: 0;
  color: var(--color-text-faint);
}
.quick-link__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.quick-link__label {
  font-size: var(--text-sm);
  font-weight: 600;
}
.quick-link__sublabel {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}
.quick-link__chevron {
  flex-shrink: 0;
  color: var(--color-text-faint);
}

@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .stat-row {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}

@media (max-width: 480px) {
  .stat-row {
    /* auto-fit at 180px still tries to force 2 cramped columns on a
       320-375px phone - one column per stat reads better than either
       overflow or squeezed text. */
    grid-template-columns: 1fr;
  }
  .hero-card__value {
    font-size: 2rem;
  }
  .suggestion,
  .due-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .suggestion > div {
    margin-bottom: var(--space-2);
  }
}
</style>
