import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Routes /api/openai/* requests through the Vite dev server to OpenAI
      // This avoids browser CORS restrictions since the request goes server->server
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        secure: true,
      },
    },
  },
})

