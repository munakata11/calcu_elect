"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Send, Mic, ChevronRight, ChevronLeft, History, ClipboardCopy, Paperclip, Copy, Camera } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Decimal from 'decimal.js'
import { ChatPanel } from "./chat-panel"


// ここでColorSchemeにmonochromeを追加
type AIModel = 'gpt4' | 'gpt35' | 'claude'
type ColorScheme = 'light' | 'dark' | 'system' | 'monochrome';

// ここでmonochromeテーマを定義
// 他のテーマ(light/dark/system)は既存であると仮定。ここでは例として記載
// 必要に応じて他テーマも定義済みである
const colorSchemes: Record<ColorScheme, { display: string; primary: string; secondary: string; accent: string }> = {
  light: {
    display: "bg-gray-100",
    primary: "bg-blue-500 hover:bg-blue-600",
    secondary: "bg-slate-100 hover:bg-slate-200",
    accent: "bg-orange-500 hover:bg-orange-600"
  },
  dark: {
    display: "bg-gray-700",
    primary: "bg-blue-600 hover:bg-blue-500",
    secondary: "bg-slate-100 hover:bg-slate-200",
    accent: "bg-orange-600 hover:bg-orange-500"
  },
  system: {
    display: "bg-gray-200",
    primary: "bg-blue-400 hover:bg-blue-500",
    secondary: "bg-slate-100 hover:bg-slate-200",
    accent: "bg-orange-400 hover:bg-orange-500"
  },
  // 追加：monochromeテーマ
  // primary(青)→薄めの黒, accent(オレンジ)→さらに薄い黒
  monochrome: {
    display: "bg-gray-100",
    primary: "bg-gray-600 hover:bg-gray-700",
    secondary: "bg-slate-100 hover:bg-slate-200",
    accent: "bg-gray-400 hover:bg-gray-500"
  }
};

// Web Speech APIの型定義
interface Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

// 数式から空白を削除する
const removeSpaces = (expr: string) => {
  return expr.replace(/\s+/g, '');
};

// 括弧の対応をチェックする関数
const checkParentheses = (expr: string): boolean => {
  let count = 0;
  for (const char of expr) {
    if (char === '(') count++;
    if (char === ')') count--;
    if (count < 0) return false; // 閉じ括弧が多すぎる
  }
  return count === 0; // 開き括弧と閉じ括弧の数が一致
};

export function Calculator() {
  const [display, setDisplay] = useState("0")
  const [memory, setMemory] = useState(0)
  const [calculatorHistory, setCalculatorHistory] = useState<string[]>([])
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [newNumber, setNewNumber] = useState(true)
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "こんにちは！計算のお手伝いをさせていただきます。" }
  ])
  const [input, setInput] = useState("")
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [rightPanelView, setRightPanelView] = useState<'chat' | 'history' | 'extended-display'>('chat')
  const [chatView, setChatView] = useState<'chat' | 'history'>('chat')
  const [aiModel, setAIModel] = useState<AIModel>('gpt4')
  const [previousResult, setPreviousResult] = useState<string | null>(null)
  const [expression, setExpression] = useState<string>("")
  const [currentInput, setCurrentInput] = useState("0")
  const [calculatedResult, setCalculatedResult] = useState("0")
  const [quickInput, setQuickInput] = useState("")
  const [isMillimeter, setIsMillimeter] = useState(true)
  const [isMillimeterSquare, setIsMillimeterSquare] = useState(true)
  const [fullExpression, setFullExpression] = useState<string>("")
  const [isDisplayOverflowing, setIsDisplayOverflowing] = useState(false)
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);

  // Pythonバックエンドに計算をリクエストする関数
  interface CalculationResult {
    result?: string;
    error?: string;
    intermediate?: string;
  }

  const calculateWithPython = async (expression: string): Promise<{ result: string; intermediate: string | null }> => {
    try {
      const normalizedExpression = expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/');

      // @ts-ignore - window.electronAPI は preload.js 定義
      const result: CalculationResult = await window.electronAPI.calculate(normalizedExpression);
      if (!result) {
        throw new Error('計算エラーが発生しました');
      }

      return {
        result: result.result || expression,
        intermediate: result.intermediate || null
      };
    } catch (error) {
      console.error('計算エラー:', error);
      throw error;
    }
  };

  const convertUnit = async (value: number, conversionType: string): Promise<number> => {
    try {
      // @ts-ignore - window.electronAPI は preload.js で定義
      const result = await window.electronAPI.calculate(JSON.stringify({
        value,
        conversion: conversionType
      }));
      if (!result || result.error) {
        throw new Error(result?.error || '単位が発生しました');
      }
      if (!result.result) {
        throw new Error('単位変換結果が不正です');
      }
      return parseFloat(result.result);
    } catch (error) {
      console.error('単位変換エラー:', error);
      throw error;
    }
  };

  const appendNumber = async (number: string) => {
    if (currentInput === "0" && number === "00") {
      return;
    }

    if (expression.includes('=')) {
      clear();
      setCurrentInput(number);
      setExpression(number);
      setCalculatedResult(number);
      setNewNumber(false);
      return;
    }

    let newInput: string;
    if (newNumber) {
      newInput = number;
    } else {
      const hasTrigFunction = ['sin', 'cos', 'tan'].some(func => currentInput.includes(func));
      if (hasTrigFunction) {
        newInput = currentInput + number;
      } else {
        newInput = currentInput + number;
      }
    }
    
    let newExpression: string;
    if (expression.startsWith('(') && currentInput === "0") {
      newExpression = expression + number;
    } else if (operation || expression.includes('(')) {
      newExpression = expression + number;
    } else {
      newExpression = expression === "" ? newInput : expression + number;
    }

    setCurrentInput(newInput);
    setExpression(newExpression);

    try {
      const result = await calculateWithPython(newExpression);
      if (result && result.intermediate) {
        setCalculatedResult(result.intermediate);
      } else {
        setCalculatedResult(newInput);
      }
    } catch (error) {
      console.error('計算エラー:', error);
      setCalculatedResult(newInput);
    }
    
    setNewNumber(false);
  };

  const setOperator = async (op: string) => {
    try {
      if (expression.includes('=')) {
        const parts = expression.split('=');
        const prevExpression = parts[0].trim();
        const prevResult = calculatedResult;
        
        const newExpression = prevExpression + op;
        setExpression(newExpression);
        setFullExpression(newExpression);
        setPreviousValue(parseFloat(prevResult));
        
        try {
          const result = await calculateWithPython(newExpression);
          if (result && result.intermediate) {
            setCalculatedResult(result.intermediate);
          }
        } catch (error) {
          console.error('計算エラー:', error);
          setCalculatedResult(prevResult);
        }
      } else if (previousValue === null) {
        const current = currentInput;
        setPreviousValue(parseFloat(current));
        const newExpression = expression === "" ? current + op : expression + op;
        setExpression(newExpression);
        setFullExpression(fullExpression === "" ? current : `${fullExpression}${op}`);
        
        try {
          const result = await calculateWithPython(newExpression);
          if (result && result.intermediate) {
            setCalculatedResult(result.intermediate);
          }
        } catch (error) {
          console.error('計算エラー:', error);
          setCalculatedResult(current);
        }
      } else {
        const lastChar = expression.slice(-1);
        if (['+', '-', '×', '÷'].includes(lastChar)) {
          const newExpression = expression.slice(0, -1) + op;
          setExpression(newExpression);
          setOperation(op);
          return;
        }
        
        setExpression(`${expression}${op}`);
        setFullExpression(`${fullExpression}${op}`);
        
        try {
          const result = await calculateWithPython(expression + op);
          if (result && result.intermediate) {
            setCalculatedResult(result.intermediate);
          }
        } catch (error) {
          console.error('計算エラー:', error);
        }
      }
      setOperation(op);
      setNewNumber(true);
    } catch (error) {
      console.error('演算子設定エラー:', error);
      setExpression('');
      setOperation(null);
      setPreviousValue(null);
      setNewNumber(true);
      setFullExpression('');
    }
  };

  const calculateResult = async () => {
    if (currentInput === "0" && expression === "") {
      return;
    }

    try {
      let expressionToCalculate = expression || currentInput;
      if (/[+\-×÷]$/.test(expressionToCalculate)) {
        expressionToCalculate = expressionToCalculate.slice(0, -1);
      }

      const result = await calculateWithPython(expressionToCalculate);
      
      let displayResult = "";
      if (result.intermediate && result.intermediate !== "Error") {
        displayResult = result.intermediate;
      } else if (result.result) {
        displayResult = result.result;
      }

      if (displayResult) {
        setCalculatedResult(displayResult);
        const cleanExpression = expressionToCalculate.replace(/[+\-×÷]$/, '');
        setExpression(`${cleanExpression} = ${displayResult}`);
        setFullExpression(`${cleanExpression} = ${displayResult}`);
        
        const historyEntry = `${cleanExpression} = ${displayResult}`;
        setCalculatorHistory(prev => [...prev, historyEntry]);
      }
      
      setNewNumber(true);
      setPreviousValue(null);
      setOperation(null);
    } catch (error) {
      console.error('計算エラー:', error);
      setCalculatedResult("エラー");
    }
  };

  useEffect(() => {
    const calculateRealTime = async () => {
      if (!expression) return;
      
      try {
        const result = await calculateWithPython(expression);
        if (result.intermediate) {
          setCalculatedResult(result.intermediate);
        } else if (result.result) {
          setCalculatedResult(result.result);
        }
      } catch (error) {
        console.error('リアルタイム計算エラー:', error);
      }
    };

    const trigFunctions = ['sin', 'cos', 'tan'];
    const hasTrigFunction = trigFunctions.some(func => expression.includes(func));
    
    if (hasTrigFunction || (operation && !expression.includes('='))) {
      calculateRealTime();
    }
  }, [expression, operation]);

  const handleInput = async (value: string) => {
    if (newNumber) {
      setCurrentInput(value);
      setNewNumber(false);
      setExpression("");
      setFullExpression("");
    } else {
      setCurrentInput(prev => prev + value);
    }

    const newExpression = newNumber ? value : currentInput + value;
    setExpression(newExpression);

    const trigFunctions = ['sin', 'cos', 'tan'];
    if (trigFunctions.some(func => newExpression.includes(func))) {
      try {
        const result = await calculateWithPython(newExpression);
        if (result.intermediate) {
          setCalculatedResult(result.intermediate);
        } else if (result.result) {
          setCalculatedResult(result.result);
        }
      } catch (error) {
        console.error('リアルタイム計算エラー:', error);
        setCalculatedResult(newExpression);
      }
    }
  };

  const mmToM = async () => {
    try {
      if (expression.includes('=') || (operation && !expression.includes('='))) {
        setExpression("");
        setFullExpression("");
        setCalculatorHistory([]);
      }

      const value = parseFloat(calculatedResult);
      let result: number;
      
      if (isMillimeter) {
        result = value / 1000;
      } else {
        result = value * 1000;
      }
      
      setCalculatedResult(String(result));
      setCurrentInput(String(result));
      setIsMillimeter(!isMillimeter);
      
      setNewNumber(true);
      setPreviousValue(null);
      setOperation(null);
    } catch (error) {
      console.error('単位変換エラー:', error);
    }
  };

  const mmSquareToMSquare = async () => {
    try {
      if (expression.includes('=') || (operation && !expression.includes('='))) {
        setExpression("");
        setFullExpression("");
        setCalculatorHistory([]);
      }

      const value = parseFloat(calculatedResult);
      let result: number;
      
      if (isMillimeterSquare) {
        result = value / 1000000;
      } else {
        result = value * 1000000;
      }
      
      setCalculatedResult(String(result));
      setCurrentInput(String(result));
      setIsMillimeterSquare(!isMillimeterSquare);
      
      setNewNumber(true);
      setPreviousValue(null);
      setOperation(null);
    } catch (error) {
      console.error('単位変換エラー:', error);
    }
  };

  const clear = () => {
    const lastCalculation = calculatorHistory[calculatorHistory.length - 1];
    if (lastCalculation && lastCalculation.includes('=')) {
      const [lastExpression, lastResult] = lastCalculation.split('=').map(s => s.trim());
      
      if (expression && expression.length > lastExpression.length && expression.startsWith(lastExpression)) {
        setExpression(lastExpression);
        setCurrentInput(lastResult);
        setCalculatedResult(lastResult);
        setPreviousValue(parseFloat(lastResult));
        setOperation(null);
        setNewNumber(true);
        return;
      }
    }

    setCurrentInput("0");
    setCalculatedResult("0");
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
    setExpression("");
    setQuickInput("");
  }

  const clearAll = (shouldClearHistory: boolean = false) => {
    setCurrentInput("0");
    setCalculatedResult("0");
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
    setExpression("");
    setFullExpression("");
    setMemory(0);
    setQuickInput("");

    if (shouldClearHistory) {
      setCalculatorHistory([]);
    }
  }

  const del = async () => {
    const trigFunctions = ["sin", "cos", "tan"];
    const lastThree = expression.slice(-3);

    if (trigFunctions.includes(lastThree)) {
      const newExpression = expression.slice(0, -3);
      setExpression(newExpression);
      try {
        const result = await calculateWithPython(newExpression);
        if (result && result.intermediate) {
          setCalculatedResult(result.intermediate);
          setCurrentInput(result.intermediate);
        } else {
          setCalculatedResult(newExpression || "0");
          setCurrentInput(newExpression || "0");
        }
      } catch (error) {
        console.error('計算エラー:', error);
        setCalculatedResult(newExpression || "0");
        setCurrentInput(newExpression || "0");
      }
      return;
    }

    if (expression.length > 1) {
      const newExpression = expression.slice(0, -1);
      setExpression(newExpression);
      
      try {
        const result = await calculateWithPython(newExpression);
        if (result && result.intermediate) {
          setCalculatedResult(result.intermediate);
          setCurrentInput(result.intermediate);
        } else {
          setCalculatedResult(newExpression || "0");
          setCurrentInput(newExpression || "0");
        }
      } catch (error) {
        console.error('計算エラー:', error);
        setCalculatedResult(newExpression || "0");
        setCurrentInput(newExpression || "0");
      }
    } else {
      clear();
    }
  };

  const square = async () => {
    try {
      const newExpression = expression === "" ? currentInput + "^2" : expression + "^2";
      setExpression(newExpression);
      
      const result = await calculateWithPython(newExpression);
      if (result && result.intermediate) {
        setCalculatedResult(result.intermediate);
        setCurrentInput(result.intermediate);
      } else if (result && result.result) {
        setCalculatedResult(result.result);
        setCurrentInput(result.result);
      }
      
      setNewNumber(true);
    } catch (error) {
      console.error("計算エラー:", error);
    }
  }

  const sin = () => {
    if (currentInput === "0" && !expression) {
      setExpression('sin');
      setCurrentInput('sin');
    } else {
      const currentExpr = expression || currentInput;
      const newExpression = currentExpr + 'sin';
      setExpression(newExpression);
      setCurrentInput(newExpression);

      calculateWithPython(newExpression).then(result => {
        if (result.intermediate) {
          setCalculatedResult(result.intermediate);
        } else if (result.result) {
          setCalculatedResult(result.result);
        }
      }).catch(error => {
        console.error('計算エラー:', error);
      });
    }
    setNewNumber(false);
  };

  const cos = () => {
    if (currentInput === "0" && !expression) {
      setExpression('cos');
      setCurrentInput('cos');
    } else {
      const currentExpr = expression || currentInput;
      const newExpression = currentExpr + 'cos';
      setExpression(newExpression);
      setCurrentInput(newExpression);

      calculateWithPython(newExpression).then(result => {
        if (result.intermediate) {
          setCalculatedResult(result.intermediate);
        } else if (result.result) {
          setCalculatedResult(result.result);
        }
      }).catch(error => {
        console.error('計算エラー:', error);
      });
    }
    setNewNumber(false);
  };

  const tan = () => {
    if (currentInput === "0" && !expression) {
      setExpression('tan');
      setCurrentInput('tan');
    } else {
      const currentExpr = expression || currentInput;
      const newExpression = currentExpr + 'tan';
      setExpression(newExpression);
      setCurrentInput(newExpression);

      calculateWithPython(newExpression).then(result => {
        if (result.intermediate) {
          setCalculatedResult(result.intermediate);
        } else if (result.result) {
          setCalculatedResult(result.result);
        }
      }).catch(error => {
        console.error('計算エラー:', error);
      });
    }
    setNewNumber(false);
  };

  const isAfterNumber = () => {
    if (!expression) return false;
    const lastChar = expression.slice(-1);
    return /[0-9]/.test(lastChar);
  }

  const circleArea = async () => {
    try {
      if (!isAfterNumber()) {
        return;
      }

      const newExpression = expression + "^2×π÷4";
      setExpression(newExpression);
      
      const result = await calculateWithPython(newExpression);
      if (result && result.intermediate) {
        setCalculatedResult(result.intermediate);
        setCurrentInput(result.intermediate);
      } else if (result && result.result) {
        setCalculatedResult(result.result);
        setCurrentInput(result.result);
      }
      
      setNewNumber(true);
    } catch (error) {
      console.error("計算エラー:", error);
    }
  }

  const multiplyBy = async (factor: number) => {
    try {
      const current = parseFloat(currentInput);
      const calcExpression = currentInput === "0" ? `0×${factor}` : `${current}×${factor}`;
      const normalizedExpression = calcExpression.replace('×', '*');
      const result = await calculateWithPython(normalizedExpression);
      
      const resultValue = result.result || String(current * factor);
      const displayValue = result.intermediate || resultValue;
      
      if (expression.includes('=')) {
        const parts = expression.split('=');
        const prevDisplay = parts[1]; 
        setExpression(`${prevDisplay}×${factor}`);
      } else {
        setExpression(calcExpression);
      }
      
      setCalculatedResult(displayValue);
      setCurrentInput(resultValue);
      setNewNumber(true);
    } catch (error) {
      console.error('計算エラー:', error);
    }
  };

  const toggleUnit = (type: 'length' | 'volume') => {
    if (type === 'length') {
      setIsMillimeter(!isMillimeter)
    } else {
      setIsMillimeterSquare(!isMillimeterSquare)
    }
  }

  const getButtonClass = (type: keyof typeof colorSchemes[ColorScheme]) => {
    const baseClasses = "transition-colors duration-200"
    const colorClass = colorSchemes[colorScheme][type]
    const textColor = type === 'secondary' ? 'text-slate-800' : 'text-white'
    return `${baseClasses} ${colorClass} ${textColor} ${isDarkMode ? 'dark' : ''}`
  }

  // toggleColorSchemeをモノクロテーマへの切り替え動作へ変更
  const toggleColorScheme = () => {
    setColorScheme(current => {
      if (current === 'monochrome') {
        return 'light';
      } else {
        return 'monochrome';
      }
    })
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: "user" as const, content: input }
    let response = { role: "assistant" as const, content: "" }
    
    try {
      const result = eval(input.replace('×', '*').replace('÷', '/'))
      if (typeof result === 'number' && !isNaN(result)) {
        response.content = `計算結果は ${result} です`
      } else {
        response.content = "申し訳ありません。式が理解できませんでした。"
      }
    } catch {
      response.content = "申し訳ありません。式が理解できませんした"
    }

    setMessages([...messages, userMessage, response])
    setInput("")
  }

  const handleVoiceInput = async () => {
    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported');
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.start();
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };
    } catch (error) {
      console.error('Speech recognition not supported');
    }
  };

  const usePreviousResult = () => {
    const lastCalculation = calculatorHistory[calculatorHistory.length - 1];
    if (lastCalculation && lastCalculation.includes('=')) {
      const [lastExpression, lastResult] = lastCalculation.split('=').map(s => s.trim());
      
      clear();
      
      setExpression(lastExpression);
      setCurrentInput(lastResult);
      setCalculatedResult(lastResult);
      setPreviousValue(parseFloat(lastResult));
      setNewNumber(true);
    }
  }

  const hasCalculationHistory = () => {
    return calculatorHistory.length > 0 && calculatorHistory[calculatorHistory.length - 1].includes('=');
  }

  const handleQuickSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim()) return

    try {
      const displayExpression = quickInput
        .replace(/\*/g, '×')
        .replace(/\//g, '÷')
        .replace(/sin(\d+)/g, 'sin$1°')
        .replace(/cos(\d+)/g, 'cos$1°')
        .replace(/tan(\d+)/g, 'tan$1°')
      setExpression(displayExpression)
      
      if (/^\d+$/.test(quickInput)) {
        const decimal = new Decimal(quickInput)
        setCalculatedResult(decimal.toString())
        setCalculatorHistory(prev => [...prev, `${displayExpression} = ${decimal.toString()}`])
        setQuickInput("")
        return
      }
      
      let calcExpression = quickInput
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        
      calcExpression = calcExpression
        .replace(/sin(\d+)/g, (_, angle) => Math.sin(`${angle} * Math.PI / 180`))
        .replace(/cos(\d+)/g, (_, angle) => Math.cos(`${angle} * Math.PI / 180`))
        .replace(/tan(\d+)/g, (_, angle) => Math.tan(`${angle} * Math.PI / 180`))

      const result = eval(calcExpression)

      if (typeof result === 'number' && !isNaN(result)) {
        const formattedResult = formatNumber(result)
        setCalculatedResult(formattedResult)
        setCalculatorHistory(prev => [...prev, `${displayExpression} = ${formattedResult}`])
      }
    } catch (error) {
      setMessages([...messages, 
        { role: "user", content: quickInput },
        { role: "assistant", content: "計算式が正しくありません。" }
      ])
    }

    setQuickInput("")
  }

  const handleQuickInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value

    if (/^\d+$/.test(value)) {
      try {
        const decimal = new Decimal(value)
        value = decimal.toString()
      } catch (error) {
        console.error("値変換エラー:", error)
      }
    }

    const lastChar = value.slice(-1)

    if (['+', '-', '×', '÷', '*', '/'].includes(lastChar)) {
      const trigMatch = value.slice(0, -1).match(/(sin|cos|tan)(\d+)$/)
      if (trigMatch) {
        const [fullMatch, func, angle] = trigMatch
        value = value.slice(0, -1 - fullMatch.length) + `${func}${angle}` + lastChar
      }
    } else {
      const trigMatch = value.match(/(sin|cos|tan)(\d+)$/)
      if (trigMatch) {
        const [fullMatch, func, angle] = trigMatch
        value = value.slice(0, -trigMatch[0].length) + `${func}${angle}`
      } else {
        if (['s', 'c', 't'].includes(lastChar.toLowerCase())) {
          const prefix = value.slice(0, -1)
          switch (lastChar.toLowerCase()) {
            case 's':
              value = prefix + 'sin'
              break
            case 'c':
              value = prefix + 'cos'
              break
            case 't':
              value = prefix + 'tan'
              break
          }
        }
      }
    }

    if (value === '' || /^[\d+\-×÷*/\s.sincostan]+$/.test(value)) {
      setQuickInput(value)
    }
  }

  const appendParenthesis = async (type: '(' | ')') => {
    if (type === '(') {
      const newExpression = expression + type;
      setExpression(newExpression);
      setCurrentInput(type);
      try {
        const result = await calculateWithPython(newExpression);
        if (result && result.intermediate) {
          setCalculatedResult(result.intermediate);
        } else {
          setCalculatedResult(currentInput);
        }
      } catch (error) {
        console.error('計算エラー:', error);
        setCalculatedResult(currentInput);
      }
    } else {
      const openParenCount = (expression.match(/\(/g) || []).length;
      const closeParenCount = (expression.match(/\)/g) || []).length;
      
      if (openParenCount > closeParenCount) {
        const newExpression = expression + type;
        setExpression(newExpression);
        setCurrentInput(currentInput + type);
        try {
          const result = await calculateWithPython(newExpression);
          if (result && result.intermediate) {
            setCalculatedResult(result.intermediate);
          } else {
            setCalculatedResult(currentInput);
          }
        } catch (error) {
          console.error('計算エラー:', error);
          setCalculatedResult(currentInput);
        }
      }
    }
    setNewNumber(true);
  };

  const isCloseParenDisabled = () => {
    const openParenCount = (expression.match(/\(/g) || []).length;
    const closeParenCount = (expression.match(/\)/g) || []).length;
    return openParenCount <= closeParenCount;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      e.preventDefault();

      if (e.key === 'Tab') {
        e.preventDefault();
        if (rightPanelView === 'chat') {
          setRightPanelView('history');
        } else if (rightPanelView === 'history') {
          setRightPanelView('chat');
        }
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        appendNumber(e.key);
      }
      else if (e.key === '.') {
        appendDecimal();
      }
      else if (e.key === '+' || e.key === '-') {
        setOperator(e.key);
      }
      else if (e.key === '*' || e.key === 'x' || e.key === '×') {
        setOperator('×');
      }
      else if (e.key === '/' || e.key === '÷') {
        setOperator('÷');
      }
      else if (e.key.toLowerCase() === 's') {
        sin();
      }
      else if (e.key.toLowerCase() === 'c') {
        cos();
      }
      else if (e.key.toLowerCase() === 't') {
        tan();
      }
      else if (e.key.toLowerCase() === 'q') {
        appendNumber("45");
      }
      else if (e.key.toLowerCase() === 'w') {
        appendNumber("22.5");
      }
      else if (e.key.toLowerCase() === 'e') {
        appendNumber("11.25");
      }
      else if (e.key.toLowerCase() === 'r') {
        appendNumber("5.625");
      }
      else if (e.key.toLowerCase() === 'o') {
        multiplyBy(5);
      }
      else if (e.key.toLowerCase() === 'p') {
        multiplyBy(2.5);
      }
      else if (e.key === '@') {
        multiplyBy(0.2);
      }
      else if (e.key === '[') {
        multiplyBy(0.4);
      }
      else if (e.key === '\\') {
        appendPi();
      }
      else if (e.key === '^') {
        square();
      }
      else if (e.key === '(') {
        appendParenthesis('(');
      }
      else if (e.key === ')') {
        appendParenthesis(')');
      }
      else if (e.key === 'Enter' || e.key === '=') {
        calculateResult();
      }
      else if (e.key === 'Backspace') {
        del();
      }
      else if (e.key === 'Escape') {
        clearAll(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expression, currentInput, previousValue, operation, rightPanelView]);

  const formatNumber = (num: number | string): string => {
    try {
      const decimal = new Decimal(num)
      return decimal.toFixed()
    } catch {
      return String(num)
    }
  }

  const appendDecimal = async () => {
    if (/[+\-×÷]$/.test(expression)) {
      return;
    }

    if (!currentInput.includes(".")) {
      const newInput = currentInput + ".";
      setCurrentInput(newInput);
      setCalculatedResult(newInput);
      
      if (!expression.includes('=')) {
        setExpression(expression + ".");
      }
    }
  };

  const appendPi = async () => {
    if (!expression || /[+\-×÷]$/.test(expression)) {
      setExpression("π");
      setCurrentInput("π");
      try {
        const result = await calculateWithPython("π");
        if (result && result.intermediate) {
          setCalculatedResult(result.intermediate);
        } else {
          setCalculatedResult("π");
        }
      } catch (error) {
        console.error('計算エラー:', error);
        setCalculatedResult("π");
      }
    } else {
      const newExpression = `${expression}π`;
      setExpression(newExpression);
      setCurrentInput(currentInput + "π");
      try {
        const result = await calculateWithPython(newExpression);
        if (result && result.intermediate) {
          setCalculatedResult(result.intermediate);
        } else {
          setCalculatedResult(newExpression);
        }
      } catch (error) {
        console.error('計算エラー:', error);
        setCalculatedResult(newExpression);
      }
    }
    setNewNumber(true);
  };

  const handleResize = useCallback(async () => {
    const container = document.querySelector('.calculator-container');
    const mainContent = document.querySelector('main');
    if (container && mainContent) {
      try {
        const contentHeight = Math.max(
          container.scrollHeight,
          mainContent.scrollHeight,
          container.clientHeight,
          mainContent.clientHeight
        );

        const contentWidth = isRightPanelOpen 
          ? mainContent.clientWidth 
          : container.clientWidth;

        // @ts-ignore
        await window.electron.resizeWindow(contentWidth, contentHeight);
        
      } catch (error) {
        console.error('リサイズエラー:', error);
      }
    }
  }, [isRightPanelOpen]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      setTimeout(handleResize, 100);
    });

    const container = document.querySelector('.calculator-container');
    const mainContent = document.querySelector('main');

    if (container) resizeObserver.observe(container);
    if (mainContent) resizeObserver.observe(mainContent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [handleResize]);

  useEffect(() => {
    const timeoutId = setTimeout(handleResize, 300);
    return () => clearTimeout(timeoutId);
  }, [isRightPanelOpen, handleResize]);

  useEffect(() => {
    handleResize();
  }, [calculatedResult, handleResize]);

  const toggleRightPanel = useCallback(async () => {
    try {
      const willBeOpen = !isRightPanelOpen;
      
      if (!willBeOpen && rightPanelView === 'extended-display') {
        setRightPanelView('chat');
      }
      
      // @ts-ignore
      await window.electronAPI.togglePanelSize(willBeOpen);
      setIsRightPanelOpen(willBeOpen);
    } catch (error) {
      console.error('パネル切り替えエラー:', error);
    }
  }, [isRightPanelOpen, rightPanelView]);

  useEffect(() => {
    const displayElement = document.querySelector('.calculator-display');
    if (displayElement) {
      const resizeObserver = new ResizeObserver(async (entries) => {
        for (const entry of entries) {
          const isOverflowing = entry.target.scrollWidth > entry.target.clientWidth;
          setIsDisplayOverflowing(isOverflowing);
          if (isOverflowing) {
            setRightPanelView('extended-display');
            if (!isRightPanelOpen) {
              setIsRightPanelOpen(true);
              // @ts-ignore
              await window.electronAPI.togglePanelSize(true);
            }
          }
        }
      });

      resizeObserver.observe(displayElement);
      return () => resizeObserver.disconnect();
    }
  }, [expression, isRightPanelOpen]);

  const handleExtendedDisplayClick = async () => {
    if (rightPanelView === 'extended-display') {
      setRightPanelView('chat');
      setIsRightPanelOpen(false);
      // @ts-ignore
      await window.electronAPI.togglePanelSize(false);
    } else if (isDisplayOverflowing) {
      setRightPanelView('extended-display');
      if (!isRightPanelOpen) {
        setIsRightPanelOpen(true);
        // @ts-ignore
        await window.electronAPI.togglePanelSize(true);
      }
    }
  };

  const handleCalculate = async (shouldAddToHistory = true) => {
    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expression: currentInput }),
      });

      const data = await response.json();
      
      if (data.error || data.intermediate) {
        setCalculatedResult(data.intermediate || "エラー");
        return;
      }

      const result = data.result;
      setCalculatedResult(result);
      
      if (shouldAddToHistory) {
        const historyEntry = `${currentInput} = ${result}`;
        setCalculatorHistory(prev => [...prev, historyEntry]);
      }

      setExpression(`${currentInput} = `);
      setFullExpression(`${currentInput} = ${result}`);
      setNewNumber(true);
    } catch (error) {
      console.error('計算エラー:', error);
      setCalculatedResult("エラー");
    }
  };

  const appendTrigFunction = (func: string) => {
    let newExpression: string;
    if (currentInput === "0" && !expression) {
      newExpression = func;
      setExpression(newExpression);
      setCurrentInput(newExpression);
    } else {
      const currentExpr = expression || currentInput;
      newExpression = currentExpr + func;
      setExpression(newExpression);
      setCurrentInput(newExpression);
    }
    
    calculateWithPython(newExpression).then(result => {
      if (result.intermediate) {
        setCalculatedResult(result.intermediate);
      } else if (result.result) {
        setCalculatedResult(result.result);
      }
    }).catch(error => {
      console.error('計算エラー:', error);
    });
  };

  const useHistoryEntry = (entry: string) => {
    if (entry.includes('=')) {
      const [expression, result] = entry.split('=').map(s => s.trim());
      
      clear();
      
      setExpression(expression);
      setCurrentInput(result);
      setCalculatedResult(result);
      setPreviousValue(parseFloat(result));
      setNewNumber(true);
    }
  }

  const takeScreenshot = async () => {
    try {
      // @ts-ignore - window.electronAPI は preload.js で定義
      const result = await window.electronAPI.takeScreenshot();
      if (result.status === 'success') {
        setScreenshots(prev => [...prev, result.image]);
        
        // チャットパネルを開く
        setIsRightPanelOpen(true);
        setRightPanelView('chat');
      }
    } catch (error) {
      console.error('スクリーンショットエラー:', error);
    }
  };

  const handlePin = () => {
    const newPinState = !isPinned;
    setIsPinned(newPinState);
    // @ts-ignore - window.electronAPI は preload.js で定義
    window.electronAPI.toggleAlwaysOnTop(newPinState);
  };

  const handleExtension = async () => {
    try {
      // @ts-ignore - window.electronAPI は preload.js で定義
      const result = await window.electronAPI.executeExtension();
      if (result.status === 'success' && result.distance) {
        const distance = result.distance;
        setCurrentInput(distance.toString());
        setCalculatedResult(distance.toString());
        setCalculatorHistory(prev => [...prev, `延長: ${distance}`]);
      }
    } catch (error) {
      console.error('延長機能エラー:', error);
    }
  };

  const handleUnitConversion = async (fromUnit: string, toUnit: string, shouldToggleState: boolean = true) => {
    try {
      if (!calculatedResult || calculatedResult === "0") return;

      // 現在の状態に基づいて正しい変換方向を設定
      const conversionData = {
        command: "convert_unit",
        value: calculatedResult,
        from_unit: fromUnit,
        to_unit: toUnit
      };

      // @ts-ignore - window.electronAPI は preload.js で定義
      const result = await window.electronAPI.calculate(JSON.stringify(conversionData));

      if (result.error) {
        console.error('単位変換エラー:', result.error);
        return;
      }

      // 計算履歴に追加（intermediateを直接使用）
      if (result.intermediate) {
        setCalculatorHistory(prev => [...prev, result.intermediate]);
      }

      // 結果を表示
      if (result.result) {
        setCalculatedResult(result.result);
        setCurrentInput(result.result);
        setExpression(result.result);
      }
      
      // 状態を更新（オプション）
      if (shouldToggleState) {
        if (fromUnit === 'm' || fromUnit === 'mm') {
          setIsMillimeter(!isMillimeter);
        } else if (fromUnit === 'm2' || fromUnit === 'mm2') {
          setIsMillimeterSquare(!isMillimeterSquare);
        }
      }

      setNewNumber(true);
      setPreviousValue(null);
      setOperation(null);

    } catch (error) {
      console.error('単位変換エラー:', error);
    }
  };

  return (
    <div className={`flex gap-0 ${isDarkMode ? 'dark bg-slate-900' : 'bg-white'}`}>
      <div className="flex">
        <Card className={`w-96 ${isDarkMode ? 'dark bg-slate-800 border-slate-700' : ''} ${isRightPanelOpen ? 'rounded-r-none border-r-0' : ''} rounded-none`}>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handlePin}
                title={isPinned ? "固定解除" : "ウィンドウを固定"}
              >
                {isPinned ? "固定解除" : "固定"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={toggleColorScheme}
              >
                {colorScheme === 'monochrome' ? 'カラー' : 'モノクロ'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleExtension}
              >
                延長
              </Button>
              <Button
                variant="outline"
                className="w-full"
              >
                CAD読込
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1 mb-3">
              <div className="flex gap-0.5">
                <Button 
                  className={`${getButtonClass('secondary')} flex-grow h-10`} 
                  onClick={() => handleUnitConversion(
                    isMillimeter ? 'm' : 'mm',
                    isMillimeter ? 'mm' : 'm',
                    false
                  )}
                >
                  {isMillimeter ? 'm → mm' : 'mm → m'}
                </Button>
                <Button 
                  size="sm"
                  variant="outline" 
                  className="px-2 h-10" 
                  onClick={() => setIsMillimeter(!isMillimeter)}
                >
                  ⇄
                </Button>
              </div>
              <div className="flex gap-0.5">
                <Button 
                  className={`${getButtonClass('secondary')} flex-grow h-10`} 
                  onClick={() => handleUnitConversion(
                    isMillimeterSquare ? 'm2' : 'mm2',
                    isMillimeterSquare ? 'mm2' : 'm2',
                    false
                  )}
                >
                  {isMillimeterSquare ? 'm² → mm²' : 'mm² → m²'}
                </Button>
                <Button 
                  size="sm"
                  variant="outline" 
                  className="px-2 h-10" 
                  onClick={() => setIsMillimeterSquare(!isMillimeterSquare)}
                >
                  ⇄
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <div className={`flex-1 rounded-lg ${isDarkMode ? 'bg-slate-700' : colorSchemes[colorScheme].display} p-4 h-[100px] shadow-inner overflow-hidden`}>
                <div className={`text-right text-sm text-muted-foreground min-h-[1.25rem] whitespace-nowrap overflow-x-auto calculator-display ${isDisplayOverflowing ? 'opacity-0' : ''}`}
                  style={{ userSelect: 'text' }}
                >
                  {removeSpaces(expression)}
                </div>
                <div className={`text-right text-4xl font-bold tabular-nums overflow-y-hidden overflow-x-auto whitespace-nowrap ${rightPanelView === 'extended-display' && isDisplayOverflowing ? 'opacity-0' : ''}`}
                  style={{ userSelect: 'text' }}
                >
                  {formatNumber(calculatedResult)}
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2 h-auto self-stretch"
                      onClick={() => {
                        navigator.clipboard.writeText(calculatedResult)
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>クリップボーンにコピー</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              <Button variant="ghost" className="bg-slate-100 hover:bg-slate-200 text-slate-800" onClick={() => appendNumber("45")}>45°</Button>
              <Button className={getButtonClass('primary')} onClick={() => appendNumber("7")}>7</Button>
              <Button className={getButtonClass('primary')} onClick={() => appendNumber("8")}>8</Button>
              <Button className={getButtonClass('primary')} onClick={() => appendNumber("9")}>9</Button>
              <Button className={`${getButtonClass('secondary')} text-xl`} onClick={() => setOperator("÷")}>÷</Button>

              <Button variant="ghost" className="bg-slate-100 hover:bg-slate-200 text-slate-800" onClick={() => appendNumber("22.5")}>22°</Button>
              <Button className={getButtonClass('primary')} onClick={() => appendNumber("4")}>4</Button>
              <Button className={getButtonClass('primary')} onClick={() => appendNumber("5")}>5</Button>
              <Button className={getButtonClass('primary')} onClick={() => appendNumber("6")}>6</Button>
              <Button className={`${getButtonClass('secondary')} text-xl`} onClick={() => setOperator("×")}>&#215;</Button>

              <Button variant="ghost" className="bg-slate-100 hover:bg-slate-200 text-slate-800" onClick={() => appendNumber("11.25")}>11°</Button>
              <Button className={getButtonClass('primary')} onClick={() => appendNumber("1")}>1</Button>
              <Button className={getButtonClass('primary')} onClick={() => appendNumber("2")}>2</Button>
              <Button className={getButtonClass('primary')} onClick={() => appendNumber("3")}>3</Button>
              <Button className={`${getButtonClass('secondary')} text-xl`} onClick={() => setOperator("-")}>-</Button>

              <Button variant="ghost" className="bg-slate-100 hover:bg-slate-200 text-slate-800" onClick={() => appendNumber("5.625")}>5°</Button>
              <Button className={getButtonClass('primary')} onClick={() => appendNumber("0")}>0</Button>
              <Button className={getButtonClass('primary')} onClick={appendDecimal}>.</Button>
              <Button className={getButtonClass('primary')} onClick={appendPi}>π</Button>
              <Button className={`${getButtonClass('secondary')} text-xl`} onClick={() => setOperator("+")}>+</Button>

              <Button variant="ghost" className="bg-slate-100 hover:bg-slate-200 text-slate-800" onClick={() => appendNumber("00")}>00</Button>
              <Button className={getButtonClass('accent')} onClick={del}>DEL</Button>
              <Button className={getButtonClass('accent')} onClick={clear}>C</Button>
              <Button className={getButtonClass('accent')} onClick={() => clearAll(false)}>AC</Button>
              <Button className={getButtonClass('accent')} onClick={calculateResult}>=</Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button className={getButtonClass('accent')} onClick={square}>x²</Button>
              <Button className={getButtonClass('accent')} onClick={() => appendTrigFunction('sin')}>sin</Button>
              <Button className={getButtonClass('accent')} onClick={() => appendTrigFunction('cos')}>cos</Button>
              
              <Button className={getButtonClass('accent')} onClick={() => appendTrigFunction('tan')}>tan</Button>
              <Button 
                className={getButtonClass('accent')}
                onClick={() => appendParenthesis('(')}
              >(</Button>
              <Button 
                className={getButtonClass('accent')}
                onClick={() => appendParenthesis(')')}
              >)</Button>

              <Button 
                className={getButtonClass('accent')} 
                onClick={circleArea}
                disabled={!isAfterNumber()}
              >
                円面積
              </Button>
              <Button className={getButtonClass('accent')} onClick={() => multiplyBy(5)}>×5</Button>
              <Button className={getButtonClass('accent')} onClick={() => multiplyBy(2.5)}>×2.5</Button>
              <Button className={getButtonClass('accent')} onClick={() => multiplyBy(0.2)}>×0.2</Button>
              <Button className={getButtonClass('accent')} onClick={() => multiplyBy(0.4)}>×0.4</Button>
              <Button 
                className={`${getButtonClass('accent')} ${!hasCalculationHistory() ? 'opacity-50 cursor-not-allowed' : ''}`} 
                onClick={usePreviousResult}
                disabled={!hasCalculationHistory()}
              >
                直前履歴
              </Button>
            </div>

            <div className="mt-4 flex gap-2">
              <Input
                placeholder="計算式を入力してください"
                value={quickInput}
                onChange={handleQuickInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleQuickSend(e)
                  }
                }}
                className={isDarkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
              <Button onClick={handleQuickSend} size="icon" className={getButtonClass('primary')}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {isRightPanelOpen && (
          <Card className={`w-96 ${isDarkMode ? 'dark bg-slate-800 border-slate-700' : ''} rounded-none relative`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`${rightPanelView === 'chat' ? 'bg-slate-100 dark:bg-slate-700' : ''} hover:bg-slate-100 dark:hover:bg-slate-700`}
                    onClick={() => setRightPanelView('chat')}
                  >
                    チャット
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`${rightPanelView === 'history' ? 'bg-slate-100 dark:bg-slate-700' : ''} hover:bg-slate-100 dark:hover:bg-slate-700`}
                    onClick={() => setRightPanelView('history')}
                  >
                    計算履歴
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`${rightPanelView === 'extended-display' ? 'bg-slate-100 dark:bg-slate-700' : ''} hover:bg-slate-100 dark:hover:bg-slate-700`}
                    onClick={handleExtendedDisplayClick}
                  >
                    拡張表示
                  </Button>
                </div>
              </div>

              {rightPanelView === 'extended-display' && isDisplayOverflowing ? (
                <div className={`rounded-lg ${isDarkMode ? 'bg-slate-700' : colorSchemes[colorScheme].display} p-4 shadow-inner overflow-hidden mb-4`}>
                  <div className="text-right text-sm text-muted-foreground min-h-[1.25rem] break-all whitespace-pre-wrap"
                    style={{ userSelect: 'text' }}
                  >
                    {removeSpaces(expression)}
                  </div>
                  <div className="text-right text-4xl font-bold tabular-nums overflow-y-hidden overflow-x-auto whitespace-nowrap"
                    style={{ direction: 'ltr', userSelect: 'text' }}
                  >
                    {formatNumber(calculatedResult)}
                  </div>
                </div>
              ) : rightPanelView === 'chat' ? (
                <ChatPanel
                  isDarkMode={isDarkMode}
                  colorScheme={colorScheme}
                  getButtonClass={getButtonClass}
                  setRightPanelView={setRightPanelView}
                  takeScreenshot={takeScreenshot}
                />
              ) : (
                <ScrollArea className="h-[550px]">
                  {calculatorHistory.map((entry, index) => (
                    <div 
                      key={index} 
                      className="mb-2 text-sm text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded transition-colors" 
                      style={{ direction: 'ltr', userSelect: 'text' }}
                      onClick={() => useHistoryEntry(entry)}
                    >
                      {entry}
                    </div>
                  ))}
                </ScrollArea>
              )}
            </CardContent>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`absolute right-[-40px] top-0 bottom-0 h-full flex items-center justify-center w-10 ${isDarkMode ? 'text-white hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              onClick={toggleRightPanel}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Card>
        )}

        {!isRightPanelOpen && (
          <Button 
            variant="ghost" 
            size="sm" 
            className={`${isDarkMode ? 'text-white hover:bg-slate-700' : 'hover:bg-slate-100'} h-full flex items-center justify-center w-10`}
            onClick={toggleRightPanel}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
