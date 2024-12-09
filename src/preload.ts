contextBridge.exposeInMainWorld('electronAPI', {
  takeScreenshot: async () => {
    try {
      const result = await ipcRenderer.invoke('take-screenshot');
      return result;
    } catch (error) {
      console.error('Screenshot error:', error);
      return { status: 'error', message: error.message };
    }
  },
}); 