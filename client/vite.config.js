import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Lets the app work with a same-origin fetch('/api/...') in local dev
      // even though VITE_API_URL is unset; production builds should set
      // VITE_API_URL to the deployed Railway backend instead.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
