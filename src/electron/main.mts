// src/electron/main.mts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Required for __dirname/__filename in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    // webPreferences: {
    //   preload: path.join(__dirname, 'preload.cjs'), // Still needs to be CommonJS for now
    // },
  });

  if (process.env.NODE_ENV === 'development') {
    await win.loadURL('http://localhost:5173');
  } else {
    const indexHtml = path.join(app.getAppPath(), 'dist/index.html');
    await win.loadFile(indexHtml);
  }
}

app.whenReady().then(createWindow);
