// VUE CONCEPT: a composable.
// A plain function, named `useXxx` by convention, that bundles reactive
// state + lifecycle hooks into one reusable unit — call it from any
// component's <script setup> and get back live refs, same as calling
// `useAppStore()` does. The difference from a store: a composable's state
// is NOT shared between callers (each call makes its own fresh refs and
// listener), whereas a Pinia store is a genuine singleton. Closest C#
// analogy: a small scoped-lifetime helper class you `new` up per use,
// versus a store's registered singleton service.
//
// This one owns exactly one global `keydown` listener for the whole app,
// attached once here rather than once per screen — "global event
// listeners done correctly" means exactly two things: skip it while the
// user is typing anywhere, and remove it in onUnmounted so navigating
// away (or, in tests, unmounting) can never leave a dangling listener.
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProgressStore } from '../stores/progress'

export interface ShortcutEntry {
  keys: string
  description: string
}

// The key itself ('1', 's', '?', 'Esc') isn't translatable text, only the
// description is — so this is a computed built from `t()`, not a static
// array, and lives in its own small composable (`useShortcuts`) separate
// from the listener logic below, since only the ShortcutsOverlay needs it.
export function useShortcuts() {
  const { t } = useI18n()
  return computed<ShortcutEntry[]>(() => [
    { keys: '1', description: t('shortcuts.goToDashboard') },
    { keys: '2', description: t('shortcuts.goToPatterns') },
    { keys: '3', description: t('shortcuts.goToRepQueue') },
    { keys: '4', description: t('shortcuts.goToProtocols') },
    { keys: '5', description: t('shortcuts.goToData') },
    { keys: 's', description: t('shortcuts.startNextRep') },
    { keys: '?', description: t('shortcuts.toggleOverlay') },
    { keys: 'Esc', description: t('shortcuts.closeOverlay') },
  ])
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export function useGlobalShortcuts() {
  const router = useRouter()
  const progressStore = useProgressStore()
  const showHelp = ref(false)

  function handleKeydown(event: KeyboardEvent) {
    // Never hijack keys while the user is typing a rep, a solution, or a
    // note — and leave modifier combos alone entirely, so Ctrl+F/Cmd+C/
    // etc. are never intercepted. This guard is the entire "done
    // correctly" part of a global listener; skipping it is the standard
    // way these features become a nuisance instead of a convenience.
    if (isTypingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return

    if (event.key === '?') {
      showHelp.value = !showHelp.value
      return
    }

    switch (event.key) {
      case '1':
        router.push('/')
        break
      case '2':
        router.push('/patterns')
        break
      case '3':
        router.push('/queue')
        break
      case '4':
        router.push('/protocols')
        break
      case '5':
        router.push('/data')
        break
      case 's': {
        const next = progressStore.dueQueue[0]
        router.push(next ? `/train/solution/${next.item.problem.id}` : '/queue')
        break
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

  return { showHelp }
}
