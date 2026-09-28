// Tracks when the user last exported a backup — same low-stakes,
// single-value pattern as stores/user.ts (a plain useStorage ref, no Zod
// schema needed for one ISO timestamp string).
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export const useBackupStore = defineStore('backup', () => {
  const lastExportedAt = useStorage<string | null>('fluency:lastExportedAt:v1', null)

  function recordExport(atISO: string = new Date().toISOString()) {
    lastExportedAt.value = atISO
  }

  return { lastExportedAt, recordExport }
})
