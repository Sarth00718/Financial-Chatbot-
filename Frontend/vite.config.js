import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL || 'http://localhost:8000'

  return {
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Proxy ALL /api and /socket.io requests to the backend
      // This makes cookies same-origin (no cross-origin cookie issues)
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
    fs: {
      strict: false,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui-vendor';
          if (id.includes('framer-motion')) return 'motion-vendor';
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'chart-vendor';
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('docx') || id.includes('file-saver')) return 'pdf-vendor';
          if (id.includes('react') && (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/'))) return 'react-vendor';
        },
      },
    },
    minify: 'esbuild',
    esbuildOptions: {
      drop: ['console', 'debugger'],
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'socket.io-client'],
  },
  preview: {
    port: 4173,
    open: true,
  },
  }
})
