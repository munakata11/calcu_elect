interface Window {
  electronAPI: {
    calculate: (data: any) => Promise<any>;
    resizeWindow: (width: number, height: number) => Promise<void>;
    togglePanelSize: (isOpen: boolean) => Promise<void>;
    startVoiceRecognition: () => Promise<void>;
    stopVoiceRecognition: () => Promise<void>;
    takeScreenshot: () => Promise<any>;
    toggleAlwaysOnTop: (shouldPin: boolean) => void;
    onVoiceRecognitionResult: (callback: (result: string) => void) => void;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

declare global {
  interface Window {
    electronAPI: {
      calculate: (data: any) => Promise<any>;
      resizeWindow: (width: number, height: number) => Promise<void>;
      togglePanelSize: (isOpen: boolean) => Promise<void>;
      startVoiceRecognition: () => Promise<void>;
      stopVoiceRecognition: () => Promise<void>;
      takeScreenshot: () => Promise<any>;
      toggleAlwaysOnTop: (shouldPin: boolean) => void;
      onVoiceRecognitionResult: (callback: (result: string) => void) => void;
    }
  }
} 