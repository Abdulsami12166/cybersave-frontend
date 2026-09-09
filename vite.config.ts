import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://cybersave-6tfo.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run/')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/recharts/')) {
              return 'vendor-charts';
            }
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
  },
})
