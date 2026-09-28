// VUE CONCEPT: a Pinia store.
// Think of this as a singleton service you'd register in DI as .AddSingleton<T>() —
// one instance shared by the whole app, injected wherever it's needed, instead of
// passed down through component props by hand. `defineStore` is the registration;
// `useAppStore()` (called from inside a component's <script setup>) is the injection.
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'
import { z } from 'zod'

export const themeSchema = z.enum(['dark', 'light'])
export type Theme = z.infer<typeof themeSchema>

const STORAGE_KEY = 'fluency:theme:v1'

function systemPrefersLight(): boolean {
  // matchMedia is a browser API, not a Vue one — guarded because it (and
  // `window`) doesn't exist during a server-side render or in tests.
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
}

export const useAppStore = defineStore('app', () => {
  // useColorMode replaces the hand-rolled localStorage read/debounced-write
  // and the `data-theme` attribute is applied to <html> directly, instead
  // of a template binding. Dark is the app's default look; an explicit
  // OS-level light preference is honored only as the INITIAL value when
  // nothing is saved yet (`initialValue`, evaluated once at store
  // creation) — once toggled, `toggleTheme` always writes a concrete
  // 'dark'/'light', never useColorMode's own 'auto', so that choice wins
  // over the OS setting on every future load and is never re-derived from
  // it again.
  const mode = useColorMode({
    storageKey: STORAGE_KEY,
    initialValue: systemPrefersLight() ? 'light' : 'dark',
    attribute: 'data-theme',
    selector: 'html',
  })

  const theme = computed<Theme>({
    get: () => (mode.value === 'light' ? 'light' : 'dark'),
    set: (value) => (mode.value = value),
  })

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return { theme, toggleTheme }
})
