// ============================================================
// Конфигурация Vite для фронтенда
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Папка сборки
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5201,
    open: true,
  },
});
