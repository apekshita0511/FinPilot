import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // babel.config.cjs exists only for Jest (see jest.config.cjs). This
  // version of @vitejs/plugin-react is oxc-based, not Babel — it never
  // reads project Babel config, so the two toolchains can't interfere.
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
