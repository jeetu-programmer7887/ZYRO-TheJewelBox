import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Libraries that change rarely get their own long-cached chunks, so a deploy
// that only touches app code doesn't force customers to re-download them.
// Only libraries every page needs are grouped here: Rollup also moves a
// grouped library's dependencies into its chunk, so grouping page-specific
// libraries (charts, animations) would drag them into the first page load.
// Those stay in their route's lazy chunk instead.
const vendorChunks = {
  'vendor-react': ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'],
  'vendor-ui': ['react-toastify', 'axios', '@react-oauth/google'],
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          for (const [chunk, pkgs] of Object.entries(vendorChunks)) {
            if (pkgs.some((pkg) => id.includes(`/node_modules/${pkg}/`))) return chunk
          }
        },
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  resolve: {
    alias: {
      // This forces everything to use the same React instance
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
})
