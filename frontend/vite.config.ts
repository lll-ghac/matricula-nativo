import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Escuchar en todas las interfaces para acceso en red
    strictPort: false,
    cors: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'intranet.local',
      '.local', // Permite cualquier dominio .local
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5003', // Usar IP directa
        changeOrigin: true,
        secure: false,
        timeout: 10000, // 10 segundos de timeout
        proxyTimeout: 10000,
        ws: true, // WebSocket support
        // Logs verbosos deshabilitados para mejor performance
      },
    },
  },
})
