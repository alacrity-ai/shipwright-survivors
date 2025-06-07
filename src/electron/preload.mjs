// src/electron/preload.mjs

import { contextBridge, ipcRenderer } from 'electron';

// You can expose APIs like this:
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => 'pong',
  getPlatform: () => process.platform,
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  closeGame: () => ipcRenderer.send('close-game'),
  resizeGameViewport: (width, height) => {
    ipcRenderer.send('resize-game-viewport', width, height);
  }
});

