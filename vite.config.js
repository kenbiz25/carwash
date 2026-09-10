import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Fix SPA 404s when running `npm run dev`
  server: {
    historyApiFallback: true,
  },

  // Fix SPA 404s when running `npm run preview`
  preview: {
    historyApiFallback: true,
  },

  build: {
    rollupOptions: {
      output: {
        // Split large vendors into separate cacheable chunks
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase')) return 'firebase-vendor';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('leaflet')) return 'leaflet';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@radix-ui')) return 'ui-vendor';
          if (id.includes('lucide')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
});
