<script setup lang="ts">
// The root component — the one thing main.ts mounts. Lays out the shell
// (nav + content area), renders whichever route is active via
// <RouterView>, and carries the active theme.
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Zap,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  BookOpen,
  Database,
  Keyboard,
  Sun,
  Moon,
  ShieldCheck,
  Menu,
  X,
} from '@lucide/vue'
import { useAppStore } from './stores/app'
import { useProgressStore } from './stores/progress'
import { useBackupStore } from './stores/backup'
import { backupNudgeKind, daysSinceExport } from './lib/backupNudge'
import Badge from './components/Badge.vue'
import ShortcutsOverlay from './components/ShortcutsOverlay.vue'
import { useGlobalShortcuts, useShortcuts } from './composables/useGlobalShortcuts'

const { t } = useI18n()
const store = useAppStore()
const progressStore = useProgressStore()
const backupStore = useBackupStore()
const { showHelp } = useGlobalShortcuts()
const shortcuts = useShortcuts()
const route = useRoute()

// Below 768px the sidebar becomes an off-canvas drawer instead of the
// permanent column; this ref only matters under that breakpoint (CSS
// reads `.shell__nav--open`).
const navOpen = ref(false)
watch(
  () => route.fullPath,
  () => {
    navOpen.value = false
  },
)

// The progress store only carries a {reason, key} code (no i18n access
// there); this is where that becomes real text for the banner below.
const storageWarningCode = computed(() => progressStore.storageWarning)
const storageWarning = computed(() => {
  const code = storageWarningCode.value
  if (!code) return null
  return t(`storage.${code.reason}`, { key: code.key })
})

// The Data page already shows its own "last exported" line — suppressing
// the nudge there avoids saying the same thing twice on the one screen
// where the user is already looking right at it.
const backupNudgeKindValue = computed(() => {
  if (route.path === '/data') return null
  return backupNudgeKind(Object.keys(progressStore.problemStates).length, backupStore.lastExportedAt, new Date().toISOString())
})
const backupNudgeDays = computed(() => {
  if (backupNudgeKindValue.value !== 'stale' || backupStore.lastExportedAt === null) return 0
  return daysSinceExport(backupStore.lastExportedAt, new Date().toISOString())
})

const navLinks = computed(() => [
  { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
  { to: '/patterns', label: t('nav.patterns'), icon: LayoutGrid },
  { to: '/queue', label: t('nav.repQueue'), icon: ListChecks, badge: progressStore.dueQueue.length },
  { to: '/protocols', label: t('nav.protocols'), icon: BookOpen },
  { to: '/data', label: t('nav.data'), icon: Database },
])
</script>

<template>
  <!-- No :data-theme binding here — useColorMode (stores/app.ts) applies
       that attribute to <html> directly, and tokens.css's
       [data-theme="light"] selector is unscoped, so it still cascades
       down through everything below. -->
  <div class="shell">
    <!-- Only visible under the mobile breakpoint (CSS-hidden otherwise) —
         the permanent sidebar has its own brand mark, so this bar would be
         pure duplication on desktop/tablet. -->
    <header class="shell__mobile-bar">
      <button type="button" class="shell__menu-btn" :aria-expanded="navOpen" aria-label="Open navigation" @click="navOpen = true">
        <Menu :size="20" />
      </button>
      <div class="shell__brand">
        <span class="shell__brand-mark"><Zap :size="16" /></span>
        <strong>{{ t('nav.brand') }}</strong>
      </div>
    </header>

    <!-- The backdrop only exists (and only intercepts clicks) while the
         drawer is open — closing on an outside tap is expected mobile-menu
         behavior, same idea as Modal.vue's backdrop click. -->
    <div v-if="navOpen" class="shell__backdrop" @click="navOpen = false" />

    <nav class="shell__nav" :class="{ 'shell__nav--open': navOpen }">
      <div class="shell__nav-top">
        <div class="shell__brand">
          <span class="shell__brand-mark"><Zap :size="16" /></span>
          <strong>{{ t('nav.brand') }}</strong>
        </div>
        <button type="button" class="shell__menu-btn shell__menu-btn--close" aria-label="Close navigation" @click="navOpen = false">
          <X :size="20" />
        </button>
      </div>

      <RouterLink v-for="link in navLinks" :key="link.to" :to="link.to" class="shell__link">
        <component :is="link.icon" :size="18" class="shell__link-icon" />
        <span class="shell__link-label">{{ link.label }}</span>
        <Badge v-if="link.badge" :count="link.badge" />
      </RouterLink>

      <div class="shell__group-label">{{ t('nav.shortcutsGroup') }}</div>
      <button type="button" class="shell__link shell__link--button" @click="showHelp = true">
        <Keyboard :size="18" class="shell__link-icon" />
        <span class="shell__link-label">{{ t('nav.keyboardShortcuts') }}</span>
        <kbd class="shell__key-hint">?</kbd>
      </button>

      <div class="shell__spacer" />

      <button type="button" class="shell__theme-toggle" @click="store.toggleTheme()">
        <Sun v-if="store.theme === 'dark'" :size="16" />
        <Moon v-else :size="16" />
        <span>{{ store.theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode') }}</span>
      </button>

      <p class="shell__footnote">
        <ShieldCheck :size="14" class="shell__footnote-icon" />
        {{ t('nav.localFirstNote') }}
      </p>
    </nav>
    <main class="shell__content">
      <p v-if="storageWarning" class="storage-warning">⚠️ {{ storageWarning }}</p>
      <p v-if="backupNudgeKindValue === 'never'" class="backup-nudge">
        <i18n-t keypath="backup.nudgeNever">
          <template #link><RouterLink to="/data">{{ t('backup.nudgeLink') }}</RouterLink></template>
        </i18n-t>
      </p>
      <p v-else-if="backupNudgeKindValue === 'stale'" class="backup-nudge">
        <i18n-t keypath="backup.nudgeStale" :plural="backupNudgeDays">
          <template #link><RouterLink to="/data">{{ t('backup.nudgeLink') }}</RouterLink></template>
        </i18n-t>
      </p>
      <RouterView />
    </main>
    <ShortcutsOverlay v-if="showHelp" :shortcuts="shortcuts" @close="showHelp = false" />
  </div>
</template>

<style scoped>
/* Two breakpoints, used consistently across every view in the app:
   768px (tablet — the shell switches from a permanent sidebar to a
   drawer) and 480px (phone — spacing tightens further, multi-column
   grids collapse to one). */
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
}
.shell__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 224px;
  flex-shrink: 0;
  padding: var(--space-5) var(--space-3);
  background: var(--color-surface);
  border-right: var(--border-width) solid var(--color-border);
}
.shell__nav-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}
.shell__brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-2);
  font-size: var(--text-lg);
}
.shell__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: var(--gradient-accent);
  color: #fff;
}

.shell__link,
.shell__theme-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--hit-target);
  padding: 0 var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  text-decoration: none;
  font: inherit;
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard);
}
.shell__link--button {
  width: 100%;
  justify-content: flex-start;
}
.shell__link-icon {
  flex-shrink: 0;
  opacity: 0.85;
}
.shell__link-label {
  flex: 1;
  text-align: left;
}
.shell__link:hover,
.shell__theme-toggle:hover {
  background: var(--color-surface-raised);
  color: var(--color-text);
}
.shell__link.router-link-active {
  background: var(--color-accent);
  color: var(--color-accent-text);
  font-weight: 600;
}
.shell__link.router-link-active .shell__link-icon {
  opacity: 1;
}

.shell__key-hint {
  padding: 1px var(--space-1);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}
.shell__group-label {
  margin: var(--space-4) var(--space-3) var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-faint);
}
.shell__spacer {
  flex: 1;
}
.shell__footnote {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin: var(--space-4) var(--space-2) 0;
  padding-top: var(--space-4);
  border-top: var(--border-width) solid var(--color-border);
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  color: var(--color-text-faint);
}
.shell__footnote-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.shell__content {
  flex: 1;
  min-width: 0; /* lets the table's own overflow-x:auto do its job */
  padding: var(--space-8);
}
.storage-warning {
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-6);
  background: var(--color-hard-bg);
  color: var(--color-hard);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}
/* Informational, not urgent — a stale backup is a nudge, not the same
   severity as a corrupted-storage warning, so it gets the --color-info
   tone (already used for the dashboard's "reps due" stat) rather than
   reusing storage-warning's --color-hard. */
.backup-nudge {
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-6);
  background: var(--color-info-bg);
  color: var(--color-info);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}
.backup-nudge :deep(a) {
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
}

/* ---- mobile top bar + menu buttons ---- */
.shell__mobile-bar {
  display: none; /* shown only under the 768px breakpoint below */
}
.shell__menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--hit-target);
  height: var(--hit-target);
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}
.shell__menu-btn:hover {
  background: var(--color-surface-raised);
}
.shell__menu-btn--close {
  display: none; /* only shown inside the open drawer, on mobile */
}
.shell__backdrop {
  display: none; /* only rendered (v-if) and relevant on mobile */
}

/* ---- tablet: sidebar becomes an off-canvas drawer ---- */
@media (max-width: 768px) {
  .shell {
    flex-direction: column;
  }
  .shell__mobile-bar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface);
    border-bottom: var(--border-width) solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .shell__mobile-bar .shell__brand {
    padding: 0;
  }

  .shell__backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: var(--color-overlay);
    z-index: 30;
  }

  .shell__nav {
    position: fixed;
    inset: 0;
    /* `width` overrides `inset`'s implicit sizing here (a fixed element
       with both set is over-constrained), so this - not `right` - is what
       actually caps the drawer at 75% of the screen, never full-width. */
    width: 75%;
    max-width: 300px;
    z-index: 40;
    border-right: var(--border-width) solid var(--color-border);
    box-shadow: var(--shadow-lg);
    transform: translateX(-100%);
    transition: transform var(--duration-base) var(--ease-standard);
    overflow-y: auto;
  }
  .shell__nav--open {
    transform: translateX(0);
  }
  .shell__menu-btn--close {
    display: inline-flex;
  }

  .shell__content {
    padding: var(--space-4);
  }
}

@media (max-width: 480px) {
  .shell__content {
    padding: var(--space-3);
  }
}

/* `prefers-reduced-motion` already zeroes every transition duration
   globally (tokens.css) — the drawer's slide-in respects that for free. */
</style>
