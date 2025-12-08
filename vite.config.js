// vite.config.js (EC2 주소는 54.152.105.176:8080으로 설정합니다.)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3006,
    proxy: {
      '/api': { 
        target: 'http://smartsourcing-alb-new-409803492.us-east-1.elb.amazonaws.com/',
        changeOrigin: true,
        secure: false, 
        // 🔥 이 rewrite 코드가 반드시 필요합니다.
        rewrite: (path) => path.replace(/^\/api/, ''), 
      }
    }
  }
})
