const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ... 他の既存のAPI ...
  
  // メインのスクリーンショット
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  
  // チャット用のスクリーンショット
  takeChatScreenshot: () => ipcRenderer.invoke('take-chat-screenshot'),
}) 