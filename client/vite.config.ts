import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Base URL for GitHub Pages deployment
    base: mode === 'production' ? '/' : '/',

    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        }
      }
    },

    build: {
      target: 'esnext',
      outDir: 'dist'
    },

    // Make env variables available to the client
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        env.VITE_API_BASE_URL || '/api'
      )
    }
  };
});
