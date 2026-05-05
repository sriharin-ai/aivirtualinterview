import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => console.log('API proxy error:', err.message));
        },
      },
      '/socket.io': {
        target: 'http://0.0.0.0:3000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => console.log('Socket proxy error:', err.message));
        },
      },
    },
  },
})
