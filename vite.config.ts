import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@main': path.resolve(__dirname, './src/main'),
      '@tools': path.resolve(__dirname, './src/tools'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  base: './',
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 手动分割代码，减少主 bundle 大小
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd'],
          zustand: ['zustand'],
        },
      },
    },
    // 增加 chunk 大小警告阈值为 1000KB（由于工具应用的特性）
    chunkSizeWarningLimit: 1000,
  },
});
