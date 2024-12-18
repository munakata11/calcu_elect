const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  calculate: async (data) => {
    try {
      const result = await ipcRenderer.invoke('calculate', data);
      return result;
    } catch (error) {
      console.error('計算エラー:', error);
      throw error;
    }
  },
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
  togglePanelSize: (isOpen) => ipcRenderer.invoke('toggle-panel-size', isOpen),
  startVoiceRecognition: () => ipcRenderer.invoke('start-voice-recognition'),
  stopVoiceRecognition: () => ipcRenderer.invoke('stop-voice-recognition'),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  toggleAlwaysOnTop: (shouldPin) => ipcRenderer.send('toggle-always-on-top', shouldPin),
  onVoiceRecognitionResult: (callback) => {
    ipcRenderer.on('voice-recognition-result', (_, result) => callback(result));
  }
}); 