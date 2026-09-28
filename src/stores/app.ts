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
  // Dark is the app's default; an OS-level light preference is honored
  // only as the initial value when nothing is saved yet. `toggleTheme`
  // always writes a concrete 'dark'/'light', never useColorMode's own
  // 'auto', so that choice wins over the OS setting on every future load.
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
