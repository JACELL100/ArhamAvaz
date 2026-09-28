import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // In the browser, Bolna's API blocks cross-origin calls, so dev requests go through this proxy.
  // On native (Capacitor), CapacitorHttp handles requests and no proxy is needed.
  server: {
    proxy: {
      '/bolna': {
        target: 'https://api.bolna.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bolna/, ''),
      },
    },
  },
})
