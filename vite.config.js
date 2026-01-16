import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
const env = loadEnv(process.env.NODE_ENV, process.cwd());
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [{ find: '@', replacement: '/src' }],
  },
  server: {
    host: '0.0.0.0',
    port: 5001,
    open: true,
    proxy: {
      '/img': {
        target: env.VITE_IMAGE_API_URL,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/img/, ''),
      },
    },
  },
});
