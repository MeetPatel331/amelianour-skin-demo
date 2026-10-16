import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The camera (getUserMedia) requires a secure context. localhost counts as
// secure, so `npm run dev` works for camera testing without HTTPS. Production
// must be served over HTTPS (see README).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev proxy so the client can call the Node API at /api/* without CORS
    // juggling during local development. Optional for the simple prototype
    // (the client can also read the bundled products.json directly).
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
