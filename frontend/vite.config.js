import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // We register the SW manually in src/main.jsx
      injectRegister: null,
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifestFilename: 'manifest.webmanifest',
      includeAssets: ['capsule.svg', 'capsule-corp.svg', 'pwa-icon.svg'],
      manifest: {
        name: 'Capsule',
        short_name: 'Capsule',
        description: 'Your personal capsule for tracking work and life',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}'],
      },
      devOptions: {
        // Disable SW in dev; use `npm run build && npm run preview` to test offline.
        enabled: false,
      },
    }),
  ],
})
