// Pure serialization logic for the single-JSON-file backup — no DOM APIs
// here (no Blob, no <a download>), so it's testable the same way as the
// rest of lib/. DataView.vue handles turning this into an actual file
// download / upload.
import type { Theme } from '../stores/app'
import { isProblemStatesMap, type ProblemStatesMap } from '../stores/progressTypes'

export interface ExportBundle {
  version: 1
  exportedAt: string
  theme: Theme
  problemStates: ProblemStatesMap
}

export function buildExportBundle(theme: Theme, problemStates: ProblemStatesMap): ExportBundle {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    theme,
    // A defensive plain-object copy: `problemStates` from the live store
    // is a reactive Proxy, and this bundle may be held onto (e.g. handed
    // to JSON.stringify later) well after the store has moved on.
    problemStates: { ...problemStates },
  }
}

function isTheme(v: unknown): v is Theme {
  return v === 'dark' || v === 'light'
}

export function isExportBundle(v: unknown): v is ExportBundle {
  if (typeof v !== 'object' || v === null) return false
  const b = v as Record<string, unknown>
  return (
    b.version === 1 &&
    typeof b.exportedAt === 'string' &&
    isTheme(b.theme) &&
    isProblemStatesMap(b.problemStates)
  )
}

export function exportFileName(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10) // YYYY-MM-DD
  return `grindwell-backup-${iso}.json`
}
