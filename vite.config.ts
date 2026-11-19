import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    // App instalable: se guarda en el celular, abre al instante y carga aunque la señal sea mala.
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['iconos/apple-touch-icon.png'],
      manifest: {
        name: 'Aspirantazgo',
        short_name: 'Aspirantazgo',
        description: 'Aprende el uniforme de Conquistadores jugando y compite con tu club.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#173079',
        theme_color: '#173079',
        icons: [
          { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,webp,png,woff2,svg}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // La versión nueva toma el control enseguida; la app recarga sola cuando no estás jugando (main.tsx)
        skipWaiting: true,
        clientsClaim: true,
        // Nada de Supabase se guarda en caché: puntajes, salas y cuentas siempre van al servidor.
        navigateFallbackDenylist: [/^\/auth/],
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('@supabase')) return 'supabase'
        },
      },
    },
  },
})
