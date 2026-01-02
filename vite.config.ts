import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from the current directory.
  // Passing an empty string as the third argument allows loading all variables, not just those prefixed with VITE_.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Shims process.env for browser compatibility as required by the Gemini API instructions.
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY || process.env.API_KEY || '')
      }
    },
    build: {
      target: 'esnext'
    }
  };
});