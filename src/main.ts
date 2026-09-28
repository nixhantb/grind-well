import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Fonts and tokens are imported here, not linked from index.html, so Vite
// bundles the actual .woff2 files into dist/assets at build time — the
// browser never fetches a font (or anything else) from a CDN.
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './styles/tokens.css'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { useProgressStore } from './stores/progress'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Rep history lives in IndexedDB (async) rather than localStorage — wait
// for the one-time load/migration to finish before the first paint, so
// the Dashboard/Queue never flash an empty "nothing due" state. Passing
// `pinia` explicitly is what lets the store be used here, outside any
// component's setup().
useProgressStore(pinia).ready.then(() => app.mount('#app'))
