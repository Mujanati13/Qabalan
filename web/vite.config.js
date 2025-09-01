import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3070,
    host: '0.0.0.0', // Allow external connections
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3015', // Backend API
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:3015', // WebSocket proxy
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
      }
    }
  }
})
