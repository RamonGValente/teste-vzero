"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMessages } from "@/hooks/useMessages"
import { useTyping } from "@/hooks/useTyping"
import { Send, AlertTriangle, Flame } from "lucide-react"

interface MessageInputProps {
  conversationId: string
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage } = useMessages(conversationId)
  const { setTyping } = useTyping(conversationId)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 200) + "px"
  }, [message])

  useEffect(() => {
    setTyping(!!message.trim())
    return () => setTyping(false)
  }, [message, setTyping])

  const handleSend = async () => {
    if (!message.trim()) return
    const content = message.trim()
    setMessage("")
    setTyping(false)
    await sendMessage(content, "text")
  }

  const handleSendAlert = async () => {
    await sendMessage("⚠️ Chamar Atenção", "alert")
  }

  const handleSendSelfDestruct = async () => {
    await sendMessage("💥 Mensagem autodestrutiva", "self_destruct", undefined, undefined, 120)
  }

  return (
    <div className="p-4 border-t">
      <div className="flex items-end space-x-2">
        {/* Left action buttons (media removed) now only safety/attention */}
        <div className="flex space-x-1">
          <Button size="sm" variant="ghost" onClick={handleSendAlert} className="text-red-600">
            <AlertTriangle className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleSendSelfDestruct} title="Mensagem autodestrutiva (2 min)">
            <Flame className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            placeholder="Digite uma mensagem..."
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" && !e.shiftKey)) {
                e.preventDefault()
                handleSend()
              }
            }}
            className="min-h-[44px] max-h-[200px] resize-none"
          />
        </div>
        <div>
          <Button size="sm" onClick={handleSend} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
