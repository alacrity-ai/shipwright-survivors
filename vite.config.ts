// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(), // <-- Use the imported plugin
  ],
  base: isProduction ? '/shipwars/' : './',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '/static': path.resolve(__dirname, 'public/static'),
    }
  },
});
