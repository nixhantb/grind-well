// Pure serialization logic for the single-JSON-file backup — no DOM APIs
// here (no Blob, no <a download>), so it's testable the same way as the
// rest of lib/. DataView.vue handles turning this into an actual file
// download / upload.
import { z } from 'zod'
import { themeSchema, type Theme } from '../stores/app'
import { problemStatesMapSchema, type ProblemStatesMap } from '../stores/progressTypes'

// Backups made before the username feature existed have no `username` key
// at all — `.default()` only kicks in for a genuinely missing/undefined
// value, so importing one of those fills in this placeholder rather than
// failing validation or leaving the field blank.
export const DEFAULT_USERNAME = 'John Doe'

export const exportBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  theme: themeSchema,
  username: z.string().default(DEFAULT_USERNAME),
  problemStates: problemStatesMapSchema,
})
export type ExportBundle = z.infer<typeof exportBundleSchema>

export function buildExportBundle(theme: Theme, username: string, problemStates: ProblemStatesMap): ExportBundle {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    theme,
    username,
    // A defensive plain-object copy: `problemStates` from the live store
    // is a reactive Proxy, and this bundle may be held onto (e.g. handed
    // to JSON.stringify later) well after the store has moved on.
    problemStates: { ...problemStates },
  }
}

export function isExportBundle(v: unknown): v is ExportBundle {
  return exportBundleSchema.safeParse(v).success
}

export function exportFileName(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10) // YYYY-MM-DD
  return `grindwell-backup-${iso}.json`
}
