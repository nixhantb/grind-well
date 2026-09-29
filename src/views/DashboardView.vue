<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  LayoutDashboard,
  ListChecks,
  CalendarClock,
  GraduationCap,
  Target,
  Sparkles,
  TrendingUp,
  Flame,
  LayoutGrid,
  BookOpen,
  Database,
  ChevronRight,
  Pencil,
  Shuffle,
} from '@lucide/vue'
// GitHub/LeetCode-style activity calendar — a battle-tested SVG component
// rather than a hand-rolled grid, so date-bucketing, month/day labels, and
// tooltips aren't reinvented here.
import { CalendarHeatmap } from 'vue3-calendar-heatmap'
import 'vue3-calendar-heatmap/dist/style.css'
import 'tippy.js/dist/tippy.css'
import { useProgressStore } from '../stores/progress'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { patterns, problems, type Problem } from '../content'
import { suggestNextProblem } from '../lib/suggestNextProblem'
import { pickColdAuditSample } from '../lib/coldAudit'
import { weeklyColdReproductionRates, computeStreaks } from '../lib/scheduler'
import { todayISO, parseLocalDateISO } from '../lib/date'
import Button from '../components/Button.vue'
import Card from '../components/Card.vue'
import CodeEditor from '../components/CodeEditor.vue'
import Modal from '../components/Modal.vue'
import Pill from '../components/Pill.vue'
import PageHeader from '../components/PageHeader.vue'
import StatCard from '../components/StatCard.vue'

const { t } = useI18n()
const store = useProgressStore()
const appStore = useAppStore()
const userStore = useUserStore()

// ---------- username: input while editing, avatar + name once set ----------
// Starts in edit mode only if there's nothing saved yet; Enter commits and
// switches to the read-only avatar view, the pencil button switches back.
const isEditingUsername = ref(userStore.username.trim() === '')
const usernameInputRef = ref<HTMLInputElement | null>(null)

function commitUsername() {
  if (userStore.username.trim() === '') return
  isEditingUsername.value = false
}
function editUsername() {
  isEditingUsername.value = true
  nextTick(() => usernameInputRef.value?.focus())
}

// Total solved is deliberately de-emphasized: it's the vanity metric that
// measures activity, not retention, so it only appears small and muted
// near the bottom.

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

// ---------- solve modal: the same paste-a-solution flow Problem Detail
// uses (CodeEditor, store.saveSolution), just reachable without leaving
// the dashboard. Target is captured into its own ref rather than read
// live off `suggestedProblem` — the modal must keep showing the problem
// it was opened for even if the suggestion itself changes underneath it.
const solveModalTarget = ref<Problem | null>(null)
const solveDraftCode = ref('')

function openSolveModal() {
  if (!suggestedProblem.value) return
  solveModalTarget.value = suggestedProblem.value
  solveDraftCode.value = ''
}
function closeSolveModal() {
  solveModalTarget.value = null
}
function confirmSolveSuggested() {
  if (!solveModalTarget.value || solveDraftCode.value.trim() === '') return
  store.saveSolution(solveModalTarget.value.id, solveDraftCode.value)
  solveModalTarget.value = null
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

// ---------- activity heatmap — one square per day, rep count as the
// intensity, same idea as GitHub's/LeetCode's contribution calendar ----------
const heatmapValues = computed(() => {
  const byDate = new Map<string, number>()
  for (const rep of store.allReps) {
    byDate.set(rep.date, (byDate.get(rep.date) ?? 0) + 1)
  }
  // `date` MUST be a real Date built via parseLocalDateISO, not the raw
  // 'YYYY-MM-DD' string — the library buckets days using local getters, and
  // handing it a date-only string instead lets JS parse it as UTC midnight,
  // which reads back as the PREVIOUS local day for every timezone behind
  // UTC. Same rule applies whether `rep.date` came from a live rep today
  // or from years of history restored via Data > Import.
  return Array.from(byDate, ([date, count]) => ({ date: parseLocalDateISO(date), count }))
})
// The library's `values` array being empty renders fine, but its `endDate`
// still needs a real date to anchor the (empty) year of squares to. Same
// local-vs-UTC parsing caveat as above applies here too.
const heatmapEndDate = computed(() => parseLocalDateISO(todayISO()))

// The heatmap's companion stat — same "days with activity" data, just
// asking "how many IN A ROW" instead of "how many total." Built from the
// same allReps source, so it can never disagree with the calendar above it.
const streaks = computed(() => computeStreaks(store.allReps.map((rep) => rep.date), todayISO()))

// Matches the app's own color tokens via color-mix() instead of a second,
// hardcoded palette — the heatmap re-themes for free when dark/light toggles.
const heatmapRangeColor = [
  'var(--color-surface)',
  'color-mix(in srgb, var(--color-accent) 20%, var(--color-surface))',
  'color-mix(in srgb, var(--color-accent) 40%, var(--color-surface))',
  'color-mix(in srgb, var(--color-accent) 60%, var(--color-surface))',
  'color-mix(in srgb, var(--color-accent) 80%, var(--color-surface))',
  'var(--color-accent)',
]

// ---------- 4. pattern progress strip ----------
const patternProgress = computed(() =>
  patterns.map((pattern) => {
    const patternProblems = problems.filter((p) => p.patternId === pattern.id)
    const graduated = patternProblems.filter((p) => store.getState(p.id).status === 'graduated').length
    return { pattern, total: patternProblems.length, graduated }
  }),
)
const totalGraduated = computed(() => patternProgress.value.reduce((sum, p) => sum + p.graduated, 0))

// ---------- cold audit — graduated problems leave the rep queue for good
// (scheduler.ts: computeNextDueDate returns null once graduated), so
// without this they'd never come up again and quietly get forgotten. This
// is the Sunday "cold audit" ritual from protocols.ts made clickable: a
// random sample re-picked on demand, each one routing into the same
// retype-and-log flow as a normal rep (/train/solution/:id) — a failed
// attempt naturally falls back into the queue via the usual addRep logic,
// no separate code path needed.
const graduatedIds = computed(() => {
  const ids = new Set<number>()
  for (const problem of problems) {
    if (store.getState(problem.id).status === 'graduated') ids.add(problem.id)
  }
  return ids
})
const coldAuditSample = ref<Problem[]>([])
function shuffleColdAudit() {
  coldAuditSample.value = pickColdAuditSample(problems, graduatedIds.value, 3)
}
// Re-picks once IndexedDB finishes loading (graduatedIds is empty before
// that resolves), and again whenever the graduated set changes size —
// e.g. a cold-audit fail knocks one out, or a new problem graduates —
// so the sample doesn't keep offering a problem that's no longer eligible.
watch(() => `${store.isLoaded}:${graduatedIds.value.size}`, shuffleColdAudit, { immediate: true })

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
  <PageHeader :title="t('dashboard.title')">
    <template #icon><LayoutDashboard :size="20" /></template>
    <template #actions>
      <div v-if="isEditingUsername" class="username-widget">
        <input
          ref="usernameInputRef"
          v-model="userStore.username"
          class="username-input"
          :placeholder="t('dashboard.usernamePlaceholder')"
          :aria-label="t('dashboard.usernameAriaLabel')"
          maxlength="40"
          @keyup.enter="commitUsername"
          @blur="commitUsername"
        />
      </div>
      <div v-else class="username-widget">
        <span class="username-avatar" aria-hidden="true">{{ userStore.username.charAt(0).toUpperCase() }}</span>
        <span class="username-display">{{ userStore.username }}</span>
        <button
          type="button"
          class="username-edit-btn"
          :aria-label="t('dashboard.usernameEditAriaLabel')"
          @click="editUsername"
        >
          <Pencil :size="14" />
        </button>
      </div>
    </template>
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
          <Button variant="secondary" @click="openSolveModal">{{ t('dashboard.suggestionSolvedButton') }}</Button>
        </div>
        <p v-else class="due-clear">{{ t('dashboard.suggestionAllStarted') }}</p>
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

      <Card class="section cold-audit-card">
        <template #header>
          <GraduationCap :size="16" class="suggestion-card__icon" />
          {{ t('dashboard.coldAuditHeader') }}
          <button
            v-if="coldAuditSample.length > 0"
            type="button"
            class="cold-audit-shuffle"
            :aria-label="t('dashboard.coldAuditShuffleAriaLabel')"
            @click="shuffleColdAudit"
          >
            <Shuffle :size="14" />
            {{ t('dashboard.coldAuditShuffle') }}
          </button>
        </template>
        <p v-if="coldAuditSample.length === 0" class="due-clear">{{ t('dashboard.coldAuditEmpty') }}</p>
        <template v-else>
          <p class="cold-audit-sublabel">{{ t('dashboard.coldAuditSublabel') }}</p>
          <ul class="cold-audit-list">
            <li v-for="problem in coldAuditSample" :key="problem.id">
              <RouterLink :to="`/train/solution/${problem.id}`" class="suggestion-link">
                #{{ problem.id }} {{ problem.title }}
              </RouterLink>
              <Pill :tone="problem.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'">
                {{ problem.difficulty }}
              </Pill>
            </li>
          </ul>
        </template>
      </Card>

      <Card class="section">
        <template #header>
          <Flame :size="16" class="suggestion-card__icon" />
          {{ t('dashboard.activityHeader') }}
        </template>
        <p class="activity-streak">
          <span v-if="streaks.current > 0" class="activity-streak__current">{{ t('dashboard.currentStreak', { count: streaks.current }) }}</span>
          <span v-else class="activity-streak__current activity-streak__current--none">{{ t('dashboard.noStreak') }}</span>
          <span class="activity-streak__longest">{{ t('dashboard.longestStreak', streaks.longest) }}</span>
        </p>
        <CalendarHeatmap
          :values="heatmapValues"
          :end-date="heatmapEndDate"
          :range-color="heatmapRangeColor"
          :dark-mode="appStore.theme === 'dark'"
          :tooltip-unit="t('dashboard.activityTooltipUnit')"
          class="activity-heatmap"
        />
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

  <Modal v-if="solveModalTarget" labelled-by="solve-modal-title" @close="closeSolveModal">
    <h3 id="solve-modal-title" class="modal-title">
      {{ t('dashboard.solveModalTitle', { id: solveModalTarget.id, title: solveModalTarget.title }) }}
    </h3>
    <p class="modal-lede">{{ t('dashboard.solveModalLede') }}</p>
    <CodeEditor
      v-model="solveDraftCode"
      :ariaLabel="t('dashboard.solveModalAriaLabel')"
      :placeholder="t('dashboard.solveModalPlaceholder')"
      min-height="200px"
    />
    <div class="modal-actions">
      <Button variant="primary" :disabled="solveDraftCode.trim() === ''" @click="confirmSolveSuggested">
        {{ t('dashboard.solveModalConfirm') }}
      </Button>
      <Button variant="secondary" @click="closeSolveModal">{{ t('common.cancel') }}</Button>
    </div>
  </Modal>
</template>

<style scoped>
.username-widget {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.username-input {
  min-height: var(--hit-target);
  padding: 0 var(--space-3);
  background: var(--color-surface-raised);
  color: var(--color-text);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--text-sm);
  width: 160px;
  max-width: 100%;
}
.username-input:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}
.username-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--gradient-accent);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 700;
}
.username-display {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}
.username-edit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-faint);
  cursor: pointer;
}
.username-edit-btn:hover {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

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

.suggestion {
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

.cold-audit-card :deep(.card__header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.cold-audit-shuffle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
}
.cold-audit-shuffle:hover {
  background: var(--color-surface);
  color: var(--color-text);
}
.cold-audit-sublabel {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}
.cold-audit-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
.cold-audit-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.activity-streak {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
}
.activity-streak__current {
  font-weight: 600;
  color: var(--color-text);
}
.activity-streak__current--none {
  font-weight: 400;
  color: var(--color-text-muted);
}
.activity-streak__longest {
  color: var(--color-text-faint);
}

/* The library hardcodes its label/legend text fill (#767676, or white in
   dark-mode) — overridden here so it follows the same token every other
   piece of dashboard text uses instead of its own baked-in palette. */
.activity-heatmap :deep(text) {
  fill: var(--color-text-faint) !important;
}
/* Every square gets an outline so the grid reads as a grid even before
   any activity — the fill (color-mix against --color-accent above) is
   what actually turns on once a day has reps logged. */
.activity-heatmap :deep(rect.vch__day__square) {
  stroke: var(--color-border);
  stroke-width: 1px;
}
.activity-heatmap :deep(rect.vch__day__square:hover) {
  stroke: var(--color-border-strong);
  stroke-width: 2px;
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

.modal-title {
  margin-top: 0;
}
.modal-lede {
  color: var(--color-text-muted);
  margin: 0 0 var(--space-4);
}
.modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-4);
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
  .suggestion {
    flex-direction: column;
    align-items: flex-start;
  }
  .suggestion > div {
    margin-bottom: var(--space-2);
  }
}
</style>
