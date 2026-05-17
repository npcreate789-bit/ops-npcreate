import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appOrigin = (process.env.VITE_APP_URL ?? 'https://app.npcreate.co.th').replace(/\/$/, '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-app-origin',
      transformIndexHtml(html) {
        return html.replaceAll('__APP_ORIGIN__', appOrigin)
      },
    },
  ],
})
