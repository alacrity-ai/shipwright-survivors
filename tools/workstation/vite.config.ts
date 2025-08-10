import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// We set the Vite "root" to your workstation folder so your existing HTML files Just Work™
// We also remap publicDir to your existing `tools/utilities/public` so you don't have to move assets.
const root = resolve(__dirname, 'tools/workstation');

export default defineConfig({
  root,

  // Your public assets (JSON, images) live here; they’ll be served at the web root:
  //   /BlockRegistry.json, /atlas.png
  publicDir: resolve(root, 'tools/utilities/public'),

  server: {
    port: 5173,
    open: '/index.html',
    // CORS is enabled by default; Vite serves via http:// which resolves your file:// CORS issue.
  },

  // Multi-page build: explicitly list every HTML you want to ship.
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(root, 'index.html'),

        // image tools
        atlas: resolve(root, 'tools/image/atlas.html'),
        blemish: resolve(root, 'tools/image/blemish.html'),
        colors: resolve(root, 'tools/image/colors.html'),
        splitter: resolve(root, 'tools/image/splitter.html'),
        transparentbackground: resolve(root, 'tools/image/transparentbackground.html'),

        // utilities
        blockeditor: resolve(root, 'tools/utilities/blockeditor.html'),
        shippreviewer: resolve(root, 'tools/utilities/shippreviewer.html'),
        skilltree: resolve(root, 'tools/utilities/skilltree.html')
        // (Intentionally omitting shippreviewer.bak.html from production)
      }
    }
  }
});
