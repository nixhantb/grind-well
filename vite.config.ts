import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // "Local-first: everything stays on this device" is already the whole
    // app's premise (see stores/app.ts) — installable + offline-capable is
    // that same premise carried one step further, not a bolt-on. `autoUpdate`
    // (rather than the prompt-to-reload flavor) matches the app's existing
    // update posture: nothing else here asks the user to confirm a refresh.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'GrindWell',
        short_name: 'GrindWell',
        description: 'DSA C# implementation-fluency trainer — local-first, no account, no server.',
        theme_color: '#0b0b10',
        background_color: '#0b0b10',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything this app needs is already same-origin per the CSP in
        // index.html (connect-src 'self', no API calls at all) — precaching
        // the build output is the entire offline story, no runtime caching
        // strategy needed for a remote API that doesn't exist.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})
