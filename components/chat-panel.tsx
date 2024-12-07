"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Send, Paperclip, Mic, Camera, X, History } from 'lucide-react'
import { ColorScheme, colorSchemes } from "./themes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ChatPanelProps {
  isDarkMode: boolean;
  colorScheme: ColorScheme;
  getButtonClass: (type: keyof typeof colorSchemes[ColorScheme]) => string;
  setRightPanelView: (view: string) => void;
}

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
  };
}

interface SpeechRecognitionError {
  error: string;
}

export function ChatPanel({ isDarkMode, colorScheme, getButtonClass, setRightPanelView }: ChatPanelProps) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "こんにちは！計算のお手伝いをさせていただきます。" }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedModel, setSelectedModel] = useState("gpt-3.5-turbo")
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleFileAttach = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      const file = files[0]
      const fileData: AttachedFile = {
        name: file.name,
        size: file.size,
        type: file.type
      }
      
      if (file.type.startsWith('image/')) {
        fileData.url = URL.createObjectURL(file)
      }
      
      setAttachedFiles([fileData])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (fileName: string) => {
    setAttachedFiles(prev => prev.filter(file => file.name !== fileName))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return

    const userMessage = { 
      role: "user" as const, 
      content: input,
      files: attachedFiles 
    }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setAttachedFiles([]) // Clear attached files after sending
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: selectedModel,
        }),
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.content }])
    } catch (error) {
      console.error('Chat API error:', error)
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "申し訳ありません。エラーが発生しました。" 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const resetChat = () => {
    setMessages([
      { role: "assistant", content: "こんにちは！計算のお手伝いをさせていただきます。" }
    ]);
    setInput("");
    setAttachedFiles([]);
  };

  const toggleVoiceInput = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setIsListening(false);
      }
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // @ts-ignore
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported');
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.continuous = true;
      recognition.interimResults = true;

      // グローバルな文字列バッファ
      let finalTranscript = '';

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setInput(finalTranscript + interimTranscript);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended, restarting...');
        // isListeningがtrueの場合のみ再起動
        if (isListening) {
          try {
            recognition.start();
          } catch (error) {
            console.error('Failed to restart recognition:', error);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionError) => {
        console.error('Speech recognition error:', event.error);
        // no-speechエラーは無視して継続
        if (event.error === 'no-speech') {
          return;
        }
        // その他のエラーの場合は停止
        setIsListening(false);
        recognitionRef.current = null;
      };

      // 初回起動
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);

    } catch (error) {
      console.error('Speech recognition setup error:', error);
      setIsListening(false);
      recognitionRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      attachedFiles.forEach(file => {
        if (file.url) {
          URL.revokeObjectURL(file.url)
        }
      })
    }
  }, [attachedFiles])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    };
  }, []);

  return (
    <div className="relative h-full">
      <ScrollArea className="h-[600px] mb-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                message.role === "user"
                  ? getButtonClass('primary')
                  : isDarkMode ? 'bg-slate-700' : 'bg-slate-100'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className={`rounded-lg px-4 py-2 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              応答を生成中...
            </div>
          </div>
        )}
      </ScrollArea>
      <div className="absolute bottom-0 left-0 right-0">
        {attachedFiles.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {attachedFiles.map((file, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                    isDarkMode ? 'bg-slate-700' : 'bg-slate-100'
                  }`}
                >
                  {file.type.startsWith('image/') && file.url && (
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                      <img 
                        src={file.url} 
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <span className="truncate max-w-[150px]">
                    {file.name} ({formatFileSize(file.size)})
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => removeFile(file.name)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mb-2 flex items-center gap-2">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className={`w-[200px] ${isDarkMode ? 'bg-slate-700 border-slate-600' : ''}`}>
              <SelectValue placeholder="モデルを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              <SelectItem value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</SelectItem>
              <SelectItem value="gpt-4">GPT-4</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={resetChat}
            className={`${colorScheme === 'monochrome' ? 'bg-gray-500 hover:bg-gray-600' : 'bg-orange-500 hover:bg-orange-600'} text-white`}
            size="sm"
          >
            New Chat
          </Button>
          <Button
            onClick={() => setRightPanelView('history')}
            className={`${colorScheme === 'monochrome' ? 'bg-gray-500 hover:bg-gray-600' : 'bg-orange-500 hover:bg-orange-600'} text-white`}
            size="icon"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AIで計算します"
            className={isDarkMode ? 'bg-slate-700 border-slate-600' : ''}
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className={`${getButtonClass('primary')} w-12`}
            disabled={isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            size="icon" 
            className={`${getButtonClass('primary')} w-12`}
            disabled={isLoading}
            onClick={handleFileAttach}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            size="icon" 
            className={`${getButtonClass('primary')} w-12`}
            disabled={isLoading}
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            size="icon" 
            className={`${getButtonClass('primary')} w-12 transition-all duration-200 ${
              isListening 
                ? `${colorScheme === 'monochrome' 
                    ? 'bg-gray-600 hover:bg-gray-700' 
                    : 'bg-red-500 hover:bg-red-600'} ring-2 ring-offset-2 ${
                      isDarkMode ? 'ring-slate-700' : 'ring-white'
                    }`
                : ''
            }`}
            disabled={isLoading}
            onClick={toggleVoiceInput}
          >
            <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
          </Button>
        </form>
      </div>
    </div>
  )
} 