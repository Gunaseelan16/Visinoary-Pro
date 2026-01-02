import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Shims process.env to allow for dynamic runtime key selection OR static build-time secrets.
      // This prevents the key from being hard-coded to "" if it's missing during build.
      'process.env': {
        API_KEY: env.API_KEY || process.env.API_KEY || ''
      }
    },
    build: {
      target: 'esnext'
    }
  };
});