interface ElectronAPI {
  takeScreenshot: () => Promise<{
    status: 'success' | 'error';
    image?: string;
    message?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {}; 