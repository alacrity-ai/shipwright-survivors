// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron';
  const isProduction = mode === 'production' || isElectron; // electron implies prod

  console.log('Vite mode:', mode, '| isElectron:', isElectron);

  return {
    base: isElectron ? '' : isProduction ? '/shipwright-survivors/' : './',
    plugins: [react(), tsconfigPaths()],
    publicDir: 'public',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '/static': path.resolve(__dirname, 'public/static'),
      }
    }
  };
});
