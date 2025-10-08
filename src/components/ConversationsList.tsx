"use client"

import { Button } from "@/components/ui/button"
import { Video, Phone, Trophy } from "lucide-react"
import { useVideoCall } from "@/hooks/useVideoCall"

interface ConversationsListProps {
  contacts: any[]
  selectedContact: any
  onContactSelect: (contact: any) => void
}

export function ConversationsList({ contacts, selectedContact, onContactSelect }: ConversationsListProps) {
  const { startCall, isLoading } = useVideoCall()

  const handleVideoCall = async (contactId: string) => {
    try {
      await startCall(contactId, 'video')
    } catch (error) {
      console.error('Error starting video call:', error)
    }
  }

  const handleVoiceCall = async (contactId: string) => {
    try {
      await startCall(contactId, 'audio')
    } catch (error) {
      console.error('Error starting voice call:', error)
    }
  }

  return (
    <div className="w-80 border-r bg-white dark:bg-gray-800 h-full flex flex-col">
      {/* Header do menu lateral */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Conversas</h2>
      </div>

      {/* Seção Ranking com botões de chamada */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-700 dark:text-gray-300">Ranking</h3>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVideoCall(contacts[0]?.id)} // Chama o primeiro contato ou ajuste conforme necessidade
              disabled={isLoading() || contacts.length === 0}
              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="Videochamada"
            >
              <Video className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVoiceCall(contacts[0]?.id)}
              disabled={isLoading() || contacts.length === 0}
              className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              title="Chamada de Voz"
            >
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Trophy className="h-4 w-4" />
          <span>Ver ranking de usuários</span>
        </div>
      </div>

      {/* Lista de contatos */}
      <div className="flex-1 overflow-y-auto">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
              selectedContact?.id === contact.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
            onClick={() => onContactSelect(contact)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {contact.full_name?.charAt(0) || contact.username?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    contact.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div>
                  <h4 className="font-medium">{contact.full_name || contact.username}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {contact.last_seen ? `Visto por último há ${contact.last_seen}` : 'Nunca visto'}
                  </p>
                </div>
              </div>
              
              {/* Botões de chamada para cada contato */}
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleVideoCall(contact.id)
                  }}
                  disabled={isLoading()}
                  className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="Videochamada"
                >
                  <Video className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleVoiceCall(contact.id)
                  }}
                  disabled={isLoading()}
                  className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                  title="Chamada de Voz"
                >
                  <Phone className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}