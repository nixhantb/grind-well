// Pure serialization logic for the single-JSON-file backup — no DOM APIs
// here (no Blob, no <a download>), so it's testable the same way as the
// rest of lib/. DataView.vue handles turning this into an actual file
// download / upload.
import { z } from 'zod'
import { themeSchema, type Theme } from '../stores/app'
import { problemStatesMapSchema, type ProblemStatesMap } from '../stores/progressTypes'

export const exportBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  theme: themeSchema,
  problemStates: problemStatesMapSchema,
})
export type ExportBundle = z.infer<typeof exportBundleSchema>

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

export function isExportBundle(v: unknown): v is ExportBundle {
  return exportBundleSchema.safeParse(v).success
}

export function exportFileName(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10) // YYYY-MM-DD
  return `grindwell-backup-${iso}.json`
}
