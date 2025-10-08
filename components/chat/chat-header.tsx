"use client"

import type { Profile } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MoreVertical, Video, Phone } from "lucide-react"
import { useVideoCall } from "@/hooks/useVideoCall"
import { useToast } from "@/hooks/use-toast"

interface ChatHeaderProps {
  contact: Profile
  onBack: () => void
  typingUsers: any[]
}

export function ChatHeader({ contact, onBack, typingUsers }: ChatHeaderProps) {
  const { startCall, isLoading } = useVideoCall()
  const { toast } = useToast()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "busy":
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "Online"
      case "busy":
        return "Ocupado"
      default:
        return "Offline"
    }
  }

  const handleVideoCall = async () => {
    try {
      if (contact.status === 'offline') {
        toast({
          title: "Usuário Offline",
          description: "Não é possível chamar um usuário offline",
          variant: "destructive"
        })
        return
      }

      await startCall(contact.id, 'video')
    } catch (error) {
      console.error('Error starting video call:', error)
      toast({
        title: "Erro na Chamada",
        description: "Não foi possível iniciar a videochamada",
        variant: "destructive"
      })
    }
  }

  const handleVoiceCall = async () => {
    try {
      if (contact.status === 'offline') {
        toast({
          title: "Usuário Offline",
          description: "Não é possível chamar um usuário offline",
          variant: "destructive"
        })
        return
      }

      await startCall(contact.id, 'audio')
    } catch (error) {
      console.error('Error starting voice call:', error)
      toast({
        title: "Erro na Chamada",
        description: "Não foi possível iniciar a chamada de voz",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-800">
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="relative">
          <Avatar>
            <AvatarImage src={contact.avatar_url || undefined} />
            <AvatarFallback>{contact.full_name?.charAt(0) || contact.username?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div
            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(contact.status)}`}
          />
        </div>

        <div>
          <h3 className="font-semibold">{contact.full_name || contact.username}</h3>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {getStatusText(contact.status)}
            </Badge>
            {typingUsers.length > 0 && <span className="text-xs text-blue-600 animate-pulse">digitando...</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Botão Videochamada */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleVideoCall}
          disabled={isLoading || contact.status === 'offline'}
          className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="Iniciar Videochamada"
        >
          <Video className="h-4 w-4" />
        </Button>

        {/* Botão Chamada de Voz */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleVoiceCall}
          disabled={isLoading || contact.status === 'offline'}
          className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          title="Iniciar Chamada de Voz"
        >
          <Phone className="h-4 w-4" />
        </Button>

        {/* Botão Menu */}
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}