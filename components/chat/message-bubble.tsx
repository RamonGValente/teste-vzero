"use client"

import { useState } from "react"
import type { Message } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { AutoDestructMessage } from "@/components/ui/auto-destruct-message"
import { Play, Download, Trash2, AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface MessageBubbleProps {
  message: Message
  onDelete: (messageId: string, deleteFor: "me" | "everyone") => void
  onDestruct: (messageId: string) => void
}

export function MessageBubble({ message, onDelete, onDestruct }: MessageBubbleProps) {
  const { user } = useAuth()
  const [imageLoaded, setImageLoaded] = useState(false)
  const isOwn = message.sender_id === user?.id
  const isDeleted = message.is_deleted || (message.deleted_for?.includes(user?.id || "") ?? false)

  if (isDeleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
        <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 italic">
          Mensagem deletada
        </div>
      </div>
    )
  }

  const handlePlayAudio = () => {
    if (message.file_url) {
      const audio = new Audio(message.file_url)
      audio.play()
    }
  }

  const renderMessageContent = () => {
    switch (message.message_type) {
      case "alert":
        return (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4 animate-pulse" />
            <span className="font-semibold">ALERTA!</span>
          </div>
        )

      case "image":
        return (
          <div className="space-y-2">
            {message.file_url && (
              <div className="relative">
                <img
                  src={message.file_url || "/placeholder.svg"}
                  alt={message.file_name || "Imagem"}
                  className={`max-w-full h-auto rounded-lg transition-opacity ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setImageLoaded(true)}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                )}
              </div>
            )}
            {message.content && <p>{message.content}</p>}
          </div>
        )

      case "audio":
        return (
          <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <Button size="sm" variant="ghost" onClick={handlePlayAudio}>
              <Play className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div className="text-sm font-medium">Áudio</div>
              <div className="text-xs text-gray-500">{message.file_name || "audio.webm"}</div>
            </div>
            {message.file_url && (
              <Button size="sm" variant="ghost" asChild>
                <a href={message.file_url} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        )

      case "self_destruct":
        return <AutoDestructMessage message={message} onDestruct={() => onDestruct(message.id)} />

      default:
        return <p className="whitespace-pre-wrap">{message.content}</p>
    }
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4 group`}>
      <div className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} items-end space-x-2 max-w-xs lg:max-w-md`}>
        {!isOwn && (
          <Avatar className="w-8 h-8">
            <AvatarImage src={message.sender?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{message.sender?.full_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
        )}

        <div
          className={`relative px-4 py-2 rounded-lg ${
            isOwn ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          } ${message.message_type === "alert" ? "animate-pulse border-2 border-red-500" : ""}`}
        >
          {renderMessageContent()}

          <div className={`text-xs mt-1 ${isOwn ? "text-blue-100" : "text-gray-500"}`}>
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </div>

          {/* Delete button for own messages */}
          {isOwn && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDelete(message.id, "everyone")}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
