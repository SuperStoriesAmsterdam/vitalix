import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // In productie: build output gaat naar ../app/static zodat FastAPI het serveert
  // In Docker: NODE_BUILD_OUTDIR kan overschreven worden via env var
  build: {
    outDir: process.env.NODE_BUILD_OUTDIR ?? '../app/static',
    emptyOutDir: true,
  },
  // In development: proxy API-calls naar FastAPI op poort 8000
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/withings': 'http://localhost:8000',
      '/polar': 'http://localhost:8000',
      '/whoop': 'http://localhost:8000',
    },
  },
})
