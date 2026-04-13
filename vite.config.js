import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // search.openfoodfacts.org omits Access-Control-Allow-Origin so browsers
      // CORS-block direct requests (server returns 200 but JS can't read it).
      // Running the request through the Vite dev server avoids CORS entirely.
      // Production uses the equivalent rewrite in vercel.json.
      '/off-search': {
        target: 'https://search.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/off-search/, '/search'),
      },
    },
  },
})
