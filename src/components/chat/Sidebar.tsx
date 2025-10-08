import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Video, Phone, Trophy, Users } from "lucide-react";
import { useVideoCall } from "@/hooks/useVideoCall";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  status: string;
  last_seen?: string;
}

interface ChatSidebarProps {
  contacts: Profile[];
  selectedContact: Profile | null;
  onContactSelect: (contact: Profile) => void;
}

export function ChatSidebar({ contacts, selectedContact, onContactSelect }: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { startCall, isLoading } = useVideoCall();
  const { toast } = useToast();

  const filteredContacts = contacts.filter(contact =>
    contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVideoCall = async (contactId: string) => {
    try {
      const contact = contacts.find(c => c.id === contactId);
      if (contact?.status === 'offline') {
        toast({
          title: "Usuário Offline",
          description: "Não é possível chamar um usuário offline",
          variant: "destructive"
        });
        return;
      }
      await startCall(contactId, 'video');
    } catch (error) {
      console.error('Error starting video call:', error);
      toast({
        title: "Erro na Chamada",
        description: "Não foi possível iniciar a videochamada",
        variant: "destructive"
      });
    }
  };

  const handleVoiceCall = async (contactId: string) => {
    try {
      const contact = contacts.find(c => c.id === contactId);
      if (contact?.status === 'offline') {
        toast({
          title: "Usuário Offline",
          description: "Não é possível chamar um usuário offline",
          variant: "destructive"
        });
        return;
      }
      await startCall(contactId, 'audio');
    } catch (error) {
      console.error('Error starting voice call:', error);
      toast({
        title: "Erro na Chamada",
        description: "Não foi possível iniciar a chamada de voz",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "busy": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online": return "Online";
      case "busy": return "Ocupado";
      default: return "Offline";
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Undoing</h1>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-50 dark:bg-gray-700 border-0"
          />
        </div>
      </div>

      {/* Seção Ranking com Botões de Chamada - BOTÕES ADICIONADOS AQUI */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Ranking
          </h3>
          
          {/* BOTÕES DE CHAMADA AO LADO DO RANKING */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => contacts[0] && handleVideoCall(contacts[0].id)}
              disabled={isLoading || contacts.length === 0}
              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Videochamada"
            >
              <Video className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => contacts[0] && handleVoiceCall(contacts[0].id)}
              disabled={isLoading || contacts.length === 0}
              className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              title="Chamada de Voz"
            >
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Visualize o ranking de usuários ativos
        </div>
      </div>

      {/* Lista de Contatos */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhum contato encontrado</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className={`flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors group ${
                selectedContact?.id === contact.id 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => onContactSelect(contact)}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={contact.avatar_url} />
                    <AvatarFallback className="bg-gray-200 dark:bg-gray-600">
                      {contact.full_name?.charAt(0) || contact.username?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(contact.status)}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {contact.full_name || contact.username}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                    >
                      {getStatusText(contact.status)}
                    </Badge>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {contact.last_seen ? `Visto por último há ${contact.last_seen}` : 'Nunca visto'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões de chamada para cada contato */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVideoCall(contact.id);
                  }}
                  disabled={isLoading || contact.status === 'offline'}
                  className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="Videochamada"
                >
                  <Video className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVoiceCall(contact.id);
                  }}
                  disabled={isLoading || contact.status === 'offline'}
                  className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                  title="Chamada de Voz"
                >
                  <Phone className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}