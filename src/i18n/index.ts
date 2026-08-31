// VUE CONCEPT: a plugin. `createI18n` builds an object with an `install`
// method; `app.use(i18n)` (in main.ts) calls that once at startup and every
// component gets `useI18n()` for free afterwards — the same registration
// shape as Pinia (`app.use(createPinia())`) and the router.
//
// `legacy: false` opts into the Composition-API form (`useI18n()` inside
// `<script setup>`) instead of the older `this.$t` Options API style, to
// match how the rest of this app is written. Only one locale exists today
// — `en` — but every string in every component already goes through
// `t('namespace.key')` rather than a literal, so a second locale later is
// "write src/i18n/fr.ts and add it to `messages`", not a hunt-and-replace.
import { createI18n } from 'vue-i18n'
import { en } from './en'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
})
