import { contextBridge } from 'electron';
// You can safely expose limited APIs here
contextBridge.exposeInMainWorld('electronAPI', {
// Example: ping: () => ipcRenderer.invoke('ping')
});
