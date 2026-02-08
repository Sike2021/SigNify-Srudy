import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Ensure we are picking up GEMINI_API_KEY from the system env if loadEnv doesn't find it
    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      },
      server: {
        port: 3000,
        open: true
      },
      build: {
        outDir: 'dist',
        sourcemap: true
      }
    };
});