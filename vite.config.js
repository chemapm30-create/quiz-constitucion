import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Carga .env files Y process.env (necesario para Cloudflare Pages CI)
  const env = loadEnv(mode, process.cwd(), '')

  const firebaseVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ]

  const define = {}
  firebaseVars.forEach(key => {
    const value = env[key] || process.env[key] || ''
    define[`import.meta.env.${key}`] = JSON.stringify(value)
  })

  return {
    plugins: [react()],
    define,
    build: {
      chunkSizeWarningLimit: 2600,
    },
  }
})
