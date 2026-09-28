// One global `keydown` listener for the whole app, attached once here
// rather than once per screen. VueUse's `useEventListener` handles
// add/remove-on-unmount, so navigating away can't leave a dangling
// listener.
import { ref, computed } from 'vue'
import { useEventListener } from '@vueuse/core'
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

  useEventListener(window, 'keydown', handleKeydown)

  return { showHelp }
}
