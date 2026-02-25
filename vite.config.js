import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import rollupPluginObfuscator from 'rollup-plugin-obfuscator';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  const appBase = isProd ? env.VITE_APP_BASE || '/wal/' : '/';

  return {
    base: appBase,
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
  };
});
