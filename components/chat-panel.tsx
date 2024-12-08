"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Send, Paperclip, Mic, Camera, X } from 'lucide-react'
import { ColorScheme, colorSchemes } from "./themes"

interface ChatPanelProps {
  isDarkMode: boolean;
  colorScheme: ColorScheme;
  getButtonClass: (type: keyof typeof colorSchemes[ColorScheme]) => string;
}

interface AttachedFile {
  name: string;
  size: number;
  type: string;
}

export function ChatPanel({ isDarkMode, colorScheme, getButtonClass }: ChatPanelProps) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "こんにちは！計算のお手伝いをさせていただきます。" }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileAttach = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }))
      setAttachedFiles(prev => [...prev, ...newFiles])
    }
    // Reset input value to allow selecting the same file again
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
        <form onSubmit={handleSendMessage} className="flex gap-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
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
            className="bg-blue-500 hover:bg-blue-600 text-white w-12"
            disabled={isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            size="icon" 
            className="bg-blue-500 hover:bg-blue-600 text-white w-12"
            disabled={isLoading}
            onClick={handleFileAttach}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            size="icon" 
            className="bg-blue-500 hover:bg-blue-600 text-white w-12"
            disabled={isLoading}
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            size="icon" 
            className="bg-blue-500 hover:bg-blue-600 text-white w-12"
            disabled={isLoading}
          >
            <Mic className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
} 