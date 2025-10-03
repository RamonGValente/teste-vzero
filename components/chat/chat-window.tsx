"use client"

import { useEffect, useRef, useState } from "react"
import type { Profile } from "@/lib/supabase"
import { useMessages } from "@/hooks/useMessages"
import { useTyping } from "@/hooks/useTyping"
import { ChatHeader } from "./chat-header"
import { MessageBubble } from "./message-bubble"
import { MessageInput } from "./message-input"
import { ShakeAnimation } from "@/components/ui/shake-animation"

interface ChatWindowProps {
  contact: Profile
  conversationId: string
  onBack: () => void
}

export function ChatWindow({ contact, conversationId, onBack }: ChatWindowProps) {
  const [shakeAlert, setShakeAlert] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, deleteMessage } = useMessages(conversationId)
  const { typingUsers } = useTyping(conversationId)

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle alert messages
  useEffect(() => {
    const alertMessage = messages[messages.length - 1]
    if (alertMessage?.message_type === "alert" && alertMessage.sender_id !== contact.id) {
      setShakeAlert(true)
    }
  }, [messages, contact.id])

  const handleMessageDestruct = (messageId: string) => {
    // Message will be automatically removed by the auto-destruct component
    console.log("Message destructed:", messageId)
  }

  return (
    <ShakeAnimation trigger={shakeAlert} onComplete={() => setShakeAlert(false)}>
      <div className="flex flex-col h-full">
        <ChatHeader contact={contact} onBack={onBack} typingUsers={typingUsers} />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onDelete={deleteMessage}
              onDestruct={handleMessageDestruct}
            />
          ))}

          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <MessageInput conversationId={conversationId} />
      </div>
    </ShakeAnimation>
  )
}
