import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En DESARROLLO: el proxy redirige /api y /socket.io al backend local
// En PRODUCCIÓN: CloudFront enruta /api/* al ALB, no hace falta proxy
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,  // habilita proxy de WebSocket para Socket.IO
      },
    },
  },
})
