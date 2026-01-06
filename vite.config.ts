
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Use type assertion on process to access the cwd method in environments where types may be missing
  const root = typeof process !== 'undefined' && typeof (process as any).cwd === 'function' ? (process as any).cwd() : '';
  const env = loadEnv(mode, root, '');
  
  return {
    plugins: [react()],
    define: {
      // Specifically target process.env.API_KEY for replacement
      'process.env.API_KEY': JSON.stringify(env.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '') || '')
    },
    build: {
      target: 'esnext'
    }
  };
});
