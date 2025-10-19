import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Contact {
  id: string;
  username: string;
  avatar_url: string | null;
  friend_code: string;
}

interface ContactsListProps {
  onStartChat: (friendId: string) => void;
}

export default function ContactsList({ onStartChat }: ContactsListProps) {
  const { data: contacts, isLoading, refetch } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Buscar todas as amizades (bidirecionais)
      const { data: allFriendships, error } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) {
        console.error("Error fetching friendships:", error);
        return [];
      }

      if (!allFriendships || allFriendships.length === 0) return [];

      // Extrair IDs dos amigos
      const friendIds = allFriendships.map(friendship => 
        friendship.user_id === user.id ? friendship.friend_id : friendship.user_id
      );

      // Remover duplicatas
      const uniqueFriendIds = [...new Set(friendIds)];

      if (uniqueFriendIds.length === 0) return [];

      const { data: friends, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, friend_code")
        .in("id", uniqueFriendIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return [];
      }

      return friends as Contact[];
    },
    refetchInterval: 5000, // Refetch a cada 5 segundos
  });

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Carregando contatos...</p>
      </div>
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="bg-muted/50 rounded-full p-6 mb-4">
          <MessageCircle className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhum contato ainda</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Adicione amigos usando o código UDG para poder iniciar conversas
        </p>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          <UserPlus className="h-4 w-4 mr-2" />
          Adicionar Amigos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-lg font-semibold mb-4">Contatos</h3>
      {contacts.map((contact) => (
        <Card
          key={contact.id}
          className="p-4 hover:bg-accent transition-colors cursor-pointer"
          onClick={() => {
            console.log('Contato clicado:', contact.id);
            onStartChat(contact.id);
          }}
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={contact.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {contact.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{contact.username}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {contact.friend_code}
              </p>
            </div>
            <Button size="sm" variant="ghost">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
