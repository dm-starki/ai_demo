// Конфигурация Vite для фронтенда
// Порт разработки: 3401
// REST API: 3402 (проксируется через /api)

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const restPort = env.VITE_API_PORT || '3402'
  const apiUrl = env.VITE_API_URL || `http://localhost:${restPort}`

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3401,
      open: true,
      proxy: {
        // Проксируем REST запросы на бэкенд
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            antd: ['antd', '@ant-design/icons'],
            redux: ['@reduxjs/toolkit', 'react-redux'],
            // Пикер эмодзи (~900 КБ данных) — выносим в изолированный чанк,
            // загружается только при первом открытии (lazy + preload on hover)
            emoji: ['emoji-picker-react'],
          },
        },
      },
    },
  }
})
