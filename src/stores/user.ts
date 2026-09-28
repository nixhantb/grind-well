// No backend, no accounts — a display name is just a string in
// localStorage, same as the theme. `useStorage` (VueUse) is a reactive
// ref backed by localStorage: read on creation, written on every change,
// no separate load/save plumbing needed for something this low-stakes.
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export const useUserStore = defineStore('user', () => {
  const username = useStorage('fluency:username:v1', '')
  return { username }
})
