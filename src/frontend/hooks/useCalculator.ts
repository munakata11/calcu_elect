import { useState } from 'react';

declare global {
  interface Window {
    electronAPI: {
      calculate: (expression: string) => Promise<{ result: number } | { error: string }>;
    }
  }
}

export const useCalculator = () => {
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculate = async (expression: string) => {
    try {
      const response = await window.electronAPI.calculate(expression);
      if ('result' in response) {
        setResult(response.result);
        setError(null);
      } else {
        setError(response.error);
        setResult(null);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setError(errorMessage);
      setResult(null);
    }
  };

  return { calculate, result, error };
}; 