const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  calculate: (expression) => ipcRenderer.invoke('calculate', expression),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height)
}); 