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
  // Port pinned to 5183 to match CORS_ORIGIN in mpesa-server/whatsapp-server/app-data-server .env files.
  server: {
    port: 5183,
    strictPort: true,
    historyApiFallback: true,
  },

  // Fix SPA 404s when running `npm run preview`
  preview: {
    historyApiFallback: true,
  },

  build: {
    rollupOptions: {
      output: {
        // Only the libraries every page needs get their own long-cached
        // chunk. Everything else (charts, maps, PDF/Excel export, 3D, ...) is
        // left for Rollup to split alongside the lazy-loaded pages that use it
        // (see pages.config.js) - a catch-all "vendor" chunk here would force
        // all of it onto the landing page's first load.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\\/]/.test(id)) return 'react-vendor';
          if (id.includes('firebase')) return 'firebase-vendor';
        },
      },
    },
  },
});
