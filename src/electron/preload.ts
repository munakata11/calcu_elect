import { contextBridge, ipcRenderer } from 'electron';

// APIをウィンドウオブジェクトに公開
contextBridge.exposeInMainWorld('electronAPI', {
  calculate: (expression: string) => ipcRenderer.invoke('calculate', expression),
}); 