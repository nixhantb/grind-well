// VUE CONCEPT: a Pinia store.
// Think of this as a singleton service you'd register in DI as .AddSingleton<T>() —
// one instance shared by the whole app, injected wherever it's needed, instead of
// passed down through component props by hand. `defineStore` is the registration;
// `useAppStore()` (called from inside a component's <script setup>) is the injection.
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { readFromStorage, writeToStorage, debounce, type StorageWarning } from '../lib/storage'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'fluency:theme:v1'

function isTheme(v: unknown): v is Theme {
  return v === 'dark' || v === 'light'
}

function systemPrefersLight(): boolean {
  // matchMedia is a browser API, not a Vue one — guarded because it (and
  // `window`) doesn't exist during a server-side render or in tests.
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
}

export const useAppStore = defineStore('app', () => {
  // Dark is the app's default look; an explicit OS-level light preference
  // is honored only the FIRST time there's nothing saved yet — once you've
  // toggled it once, that choice wins over the OS setting on every future
  // load.
  const { value: initialTheme, warning } = readFromStorage(
    STORAGE_KEY,
    isTheme,
    systemPrefersLight() ? 'light' : 'dark',
  )

  // `ref()` makes a value reactive: Vue tracks reads of `.value` and re-renders
  // any template that used it whenever it changes. Roughly: a field that raises
  // PropertyChanged on every set, and templates auto-subscribe by using it.
  const theme = ref<Theme>(initialTheme)

  // Surfaced by App.vue as a visible banner — "fall back to defaults" must
  // never happen silently. Kept as a structured code, not a message: this
  // store has no i18n access, so App.vue turns it into real text.
  const storageWarning = ref<StorageWarning | null>(warning)

  // VUE CONCEPT: `watch`.
  // Closest C# analogy: subscribing a handler to a PropertyChanged event —
  // `watch(theme, cb)` runs `cb` every time `theme.value` is reassigned.
  // This is how a `ref` triggers a SIDE EFFECT (writing to localStorage)
  // rather than just re-rendering a template; `computed` couldn't do this,
  // it can only derive a value, never reach outside itself.
  const saveTheme = debounce((value: Theme) => writeToStorage(STORAGE_KEY, value), 300)
  watch(theme, (value) => saveTheme(value))

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return { theme, toggleTheme, storageWarning }
})
