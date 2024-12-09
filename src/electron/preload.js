const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  calculate: (expression) => ipcRenderer.invoke('calculate', expression),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
  startVoiceRecognition: () => ipcRenderer.invoke('start-voice-recognition'),
  stopVoiceRecognition: () => ipcRenderer.invoke('stop-voice-recognition'),
  onVoiceRecognitionResult: (callback) => {
    ipcRenderer.on('voice-recognition-result', (_, result) => callback(result));
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  calculate: (expression) => ipcRenderer.invoke('calculate', expression),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
  togglePanelSize: (isOpen) => ipcRenderer.invoke('toggle-panel-size', isOpen),
  startVoiceRecognition: () => ipcRenderer.invoke('start-voice-recognition'),
  stopVoiceRecognition: () => ipcRenderer.invoke('stop-voice-recognition'),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
}); 