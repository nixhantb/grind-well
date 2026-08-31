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

const app = createApp(App)

app.use(createPinia()) // registers Pinia so every component can call useXStore()
app.use(router)        // registers the router so <RouterView> / <RouterLink> work
app.use(i18n)          // registers vue-i18n so every component can call useI18n()

app.mount('#app')
