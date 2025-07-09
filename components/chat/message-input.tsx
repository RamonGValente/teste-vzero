"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMessages } from "@/hooks/useMessages"
import { useTyping } from "@/hooks/useTyping"
import { useAudio } from "@/hooks/useAudio"
import { supabase } from "@/lib/supabase"
import { Send, ImageIcon, Mic, MicOff, AlertTriangle, Flame, X } from "lucide-react"

interface MessageInputProps {
  conversationId: string
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { sendMessage } = useMessages(conversationId)
  const { setTyping } = useTyping(conversationId)
  const { isRecording, audioBlob, duration, startRecording, stopRecording, cancelRecording } = useAudio()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  // Handle typing indicator
  useEffect(() => {
    if (message.trim()) {
      setTyping(true)
      const timer = setTimeout(() => setTyping(false), 1000)
      return () => clearTimeout(timer)
    } else {
      setTyping(false)
    }
  }, [message, setTyping])

  const handleSend = async () => {
    if (!message.trim()) return

    const content = message.trim()
    setMessage("")
    setTyping(false)

    await sendMessage(content)
  }

  const handleSendSelfDestruct = async () => {
    if (!message.trim()) return

    const content = message.trim()
    setMessage("")
    setTyping(false)

    await sendMessage(content, "self_destruct", undefined, undefined, 120) // 2 minutes
  }

  const handleSendAlert = async () => {
    await sendMessage("", "alert")
  }

  const handleFileUpload = async (file: File, type: "image" | "audio") => {
    setIsUploading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("chat-files").upload(fileName, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("chat-files").getPublicUrl(fileName)

      await sendMessage(
        "",
        type,
        data.publicUrl,
        file.name,
        120, // 2 minutes expiration
      )
    } catch (error) {
      console.error("Error uploading file:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      handleFileUpload(file, "image")
    }
    e.target.value = ""
  }

  const handleAudioSend = async () => {
    if (audioBlob) {
      const audioFile = new File([audioBlob], "audio.webm", { type: "audio/webm" })
      await handleFileUpload(audioFile, "audio")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="border-t bg-white dark:bg-gray-800 p-4">
      {/* Audio recording UI */}
      {isRecording && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-600 dark:text-red-400">Gravando... {formatDuration(duration)}</span>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={cancelRecording}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={stopRecording}>
              <MicOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Audio preview */}
      {audioBlob && !isRecording && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-between">
          <span className="text-green-600 dark:text-green-400">Áudio gravado ({formatDuration(duration)})</span>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={cancelRecording}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAudioSend}>
              Enviar
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-end space-x-2">
        {/* Action buttons */}
        <div className="flex space-x-1">
          <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <ImageIcon className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={isRecording ? stopRecording : startRecording}
            className={isRecording ? "text-red-600" : ""}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button size="sm" variant="ghost" onClick={handleSendAlert} className="text-red-600">
            <AlertTriangle className="h-4 w-4" />
          </Button>
        </div>

        {/* Message input */}
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="min-h-[40px] max-h-32 resize-none"
            rows={1}
          />
        </div>

        {/* Send buttons */}
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSendSelfDestruct}
            disabled={!message.trim()}
            className="text-orange-600"
          >
            <Flame className="h-4 w-4" />
          </Button>

          <Button size="sm" onClick={handleSend} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleImageSelect}
        className="hidden"
      />
    </div>
  )
}
