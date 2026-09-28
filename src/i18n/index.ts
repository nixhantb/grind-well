// `legacy: false` opts into the Composition-API form (`useI18n()` inside
// `<script setup>`). Only `en` exists today, but every string already
// goes through `t('namespace.key')`, so a second locale later is "write
// src/i18n/fr.ts and add it to `messages`", not a hunt-and-replace.
import { createI18n } from 'vue-i18n'
import { en } from './en'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
})
