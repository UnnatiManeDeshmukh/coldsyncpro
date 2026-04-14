import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'ColdSync Pro',
        short_name: 'ColdSync',
        description: 'Cold Drink Agency Management System — Shree Ganesh Agency',
        theme_color: '#C00000',
        background_color: '#07091A',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'Dashboard', url: '/customer-dashboard', icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }] },
          { name: 'My Orders', url: '/customer-orders',    icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }] },
          { name: 'Shop',      url: '/catalog',            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }] },
        ],
      },
      workbox: {
        // Offline fallback page
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/admin\//],
        // Cache API responses for offline support
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/products\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-products',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 24h
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/analytics\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-analytics',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 10 }, // 10 min
              networkTimeoutSeconds: 8,
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/notifications\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-notifications',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 5 }, // 5 min
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 }, // 1h
              networkTimeoutSeconds: 10,
            },
          },
        ],
        // Skip waiting — update immediately
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false, // Disabled in dev — causes white screen due to SW cache
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api/notifications/stream': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // SSE needs no timeout — keep connection alive
        timeout: 0,
        proxyTimeout: 0,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000,
      },
      '^/admin/': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    }
  },
  preview: {
    port: 3007,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
