import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import rollupPluginObfuscator from 'rollup-plugin-obfuscator';

// https://vite.dev/config/
const env = loadEnv(process.env.NODE_ENV, process.cwd());
export default defineConfig({
  base: '/wal/',
  plugins: [
    react(),
    tailwindcss(),
    rollupPluginObfuscator({
      global: true,
      options: {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        stringArray: true,
      },
    }),
  ],
  resolve: {
    alias: [{ find: '@', replacement: '/src' }],
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    open: true,
  },
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
