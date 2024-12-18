import { contextBridge, ipcRenderer } from 'electron';

// APIをウィンドウオブジェクトに公開
contextBridge.exposeInMainWorld('electronAPI', {
  calculate: (expression: string) => ipcRenderer.invoke('calculate', expression),
  executeExtension: () => ipcRenderer.invoke('execute-extension'),
  toggleAlwaysOnTop: (value: boolean) => ipcRenderer.send('toggle-always-on-top', value),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  togglePanelSize: (isOpen: boolean) => ipcRenderer.invoke('toggle-panel-size', isOpen),
}); 