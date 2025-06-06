// src/shared/types/electron-api.d.ts

export interface ElectronAPI {
  ping: () => string;
  getPlatform: () => string;
  toggleFullscreen: () => void;
  setFullscreen?: (flag: boolean) => void;
  closeGame: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
