import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Proxy API requests during development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Output directory
    outDir: 'dist',
    // No sourcemaps in production (reduces build size)
    sourcemap: false,
    // Suppress chunk size warning for larger chunks
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        /**
         * Manual chunks for optimal long-term caching:
         * - Vendor bundles rarely change → cached forever by browsers
         * - App code changes frequently → short cache TTL
         */
        manualChunks: (id) => {
          // MUI + Emotion
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'mui-vendor';
          }
          // Framer Motion
          if (id.includes('framer-motion')) {
            return 'motion-vendor';
          }
          // Chart.js
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'chart-vendor';
          }
          // PDF generation
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('docx') || id.includes('file-saver')) {
            return 'pdf-vendor';
          }
          // React core
          if (id.includes('react') && (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/')
          )) {
            return 'react-vendor';
          }
          // Icon libraries
          if (id.includes('lucide-react')) {
            return 'ui-vendor';
          }
        },
      },
    },
    // Use esbuild for fast minification; strip logs in production
    minify: 'esbuild',
    esbuildOptions: {
      drop: ['console', 'debugger'],
    },
  },
  // Pre-bundle key dependencies for faster dev server startup
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'socket.io-client'],
  },
  // Preview server config
  preview: {
    port: 4173,
    open: true,
  },
})
