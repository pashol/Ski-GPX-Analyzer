
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // CRITICAL: Use relative paths for Capacitor
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsDir: 'assets',
    cssCodeSplit: false, // Workaround for inline CSS issue
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet'] // Separate chunk for map library
        }
      }
    }
  }
});
