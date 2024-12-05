import { useState } from 'react';

declare global {
  interface Window {
    electronAPI: {
      calculate: (expression: string) => Promise<{
        result?: string;
        error?: string;
      }>;
    }
  }
}

export const useCalculator = () => {
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculate = async (expression: string) => {
    try {
      if (!window.electronAPI?.calculate) {
        throw new Error('計算機能が利用できません');
      }

      const response = await window.electronAPI.calculate(expression);
      
      if ('error' in response && response.error) {
        setError(response.error);
        setResult(null);
        return;
      }
      
      if ('result' in response && response.result) {
        const numericResult = parseFloat(response.result);
        if (isNaN(numericResult)) {
          setError('不正な計算結果です');
          setResult(null);
        } else {
          setResult(numericResult);
          setError(null);
        }
      } else {
        setError('計算結果が不正です');
        setResult(null);
      }
    } catch (error: unknown) {
      console.error('計算エラー:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : '計算中に予期せぬエラーが発生しました';
      setError(errorMessage);
      setResult(null);
    }
  };

  return { calculate, result, error };
}; 