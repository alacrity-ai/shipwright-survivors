// src/electron/main.mts

import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ipcMain, dialog } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    // autoHideMenuBar: true,   // TODO: Dev: Enable this on release | Hides the menu bar
    frame: true,
    webPreferences: {
      contextIsolation: true, // required for ESM preload
      sandbox: false,         // must be off to allow ESM preload
      preload: path.join(app.getAppPath(), 'dist-electron/preload.mjs'),
    },
  });
  // win.setMenu(null);  // TODO: Dev: Enable this on release

  if (process.env.NODE_ENV === 'development') {
    await win.loadURL('http://localhost:5173');
  } else {
    const indexHtml = path.join(app.getAppPath(), 'dist/index.html');
    await win.loadFile(indexHtml);
  }
}

app.whenReady().then(createWindow);


ipcMain.on('toggle-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setFullScreen(!win.isFullScreen());
  }
});

ipcMain.on('close-game', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const result = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Yes', 'Cancel'],
      defaultId: 0,
      message: 'Are you sure you want to quit?',
    });

    if (result.response === 0) {
      if (win) {
        win.close();
      } else {
        app.quit();
      }
    }
  }
});