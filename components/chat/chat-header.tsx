"use client"

import type { Profile } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MoreVertical } from "lucide-react"

interface ChatHeaderProps {
  contact: Profile
  onBack: () => void
  typingUsers: any[]
}

export function ChatHeader({ contact, onBack, typingUsers }: ChatHeaderProps) {
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
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
