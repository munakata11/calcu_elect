interface Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
  electronAPI: {
    calculate: (expression: string) => Promise<{
      result?: string;
      error?: string;
    }>;
  };
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
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    electronAPI: {
      calculate: (expression: string) => Promise<{
        result?: string;
        error?: string;
      }>;
    };
  }
} 