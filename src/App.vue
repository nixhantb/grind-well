<script setup lang="ts">
// VUE CONCEPT: the Single-File Component (SFC).
// One .vue file = <script setup> (your code) + <template> (your markup) + <style>
// (CSS scoped to this file only). The Vite plugin compiles this into a plain JS
// module at build time — nothing ".vue" ships to the browser. `<script setup>` is
// the modern, terser form of the Composition API: everything you declare here
// (imports, refs, functions) is automatically available to the template below,
// with no manual "return { ... }" step.
//
// App.vue is the root component — the one thing main.ts mounts. Its only jobs
// right now are: lay out the shell (nav + content area), render whichever
// route is active via <RouterView>, and carry the active theme.
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Zap,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  BookOpen,
  Database,
  Palette,
  Keyboard,
  Sun,
  Moon,
  ShieldCheck,
} from '@lucide/vue'
import { useAppStore } from './stores/app'
import { useProgressStore } from './stores/progress'
import Badge from './components/Badge.vue'
import ShortcutsOverlay from './components/ShortcutsOverlay.vue'
import { useGlobalShortcuts, useShortcuts } from './composables/useGlobalShortcuts'

const { t } = useI18n()
const store = useAppStore()
const progressStore = useProgressStore()
const { showHelp } = useGlobalShortcuts()
const shortcuts = useShortcuts()

// "Validate on read and fall back to defaults with a visible warning" —
// this is the visible part, shown regardless of which screen a corrupted
// read happened to be noticed on. The store only carries a {reason, key}
// code (it has no i18n access); this is where that becomes real text.
const storageWarningCode = computed(() => store.storageWarning ?? progressStore.storageWarning)
const storageWarning = computed(() => {
  const code = storageWarningCode.value
  if (!code) return null
  return t(`storage.${code.reason}`, { key: code.key })
})

// `badge` is a count only the Rep Queue link carries — everything else is
// `undefined`, and Badge.vue itself renders nothing at 0/undefined anyway.
const navLinks = computed(() => [
  { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
  { to: '/patterns', label: t('nav.patterns'), icon: LayoutGrid },
  { to: '/queue', label: t('nav.repQueue'), icon: ListChecks, badge: progressStore.dueQueue.length },
  { to: '/protocols', label: t('nav.protocols'), icon: BookOpen },
  { to: '/data', label: t('nav.data'), icon: Database },
  { to: '/style-guide', label: t('nav.styleGuide'), icon: Palette },
])
</script>

<template>
  <!-- :data-theme is a reactive attribute binding: the moment
       store.theme changes, Vue updates this attribute, and tokens.css's
       [data-theme="light"] selector immediately overrides every color
       variable beneath it — no manual DOM code, no watcher needed. -->
  <div class="shell" :data-theme="store.theme">
    <nav class="shell__nav">
      <div class="shell__brand">
        <span class="shell__brand-mark"><Zap :size="16" /></span>
        <strong>{{ t('nav.brand') }}</strong>
      </div>

      <!-- v-for + :key: Vue needs a stable identity per item to diff the list
           efficiently across re-renders — the equivalent of why you'd give
           EF Core entities a primary key rather than relying on list position. -->
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
      <RouterView />
    </main>
    <ShortcutsOverlay v-if="showHelp" :shortcuts="shortcuts" @close="showHelp = false" />
  </div>
</template>

<style scoped>
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
.shell__brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-2);
  margin-bottom: var(--space-5);
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
</style>
