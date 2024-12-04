const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  calculate: (expression) => ipcRenderer.invoke('calculate', expression),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height)
});

contextBridge.exposeInMainWorld('electronAPI', {
  calculate: (expression) => ipcRenderer.invoke('calculate', expression),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
  togglePanelSize: (isOpen) => ipcRenderer.invoke('toggle-panel-size', isOpen),
}); 