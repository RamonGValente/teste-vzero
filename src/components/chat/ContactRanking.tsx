import { useState } from 'react';
import { useContactRanking } from '@/hooks/useContactRanking';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Medal, Users, Sparkles } from 'lucide-react';

export const ContactRanking = () => {
  const [open, setOpen] = useState(false);
  const { rankings, loading, refreshRanking } = useContactRanking();

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">🥇 Mais Conectado</Badge>;
      case 1:
        return <Badge variant="secondary">🥈 2º Lugar</Badge>;
      case 2:
        return <Badge variant="outline">🥉 3º Lugar</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-muted-foreground hover:text-primary"
          onClick={refreshRanking}
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-xs">Ranking</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Top 20 Mais Conectados
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Calculando ranking...</p>
            </div>
          ) : rankings.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-4 px-1">
                👥 Baseado na quantidade de contatos adicionados
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {rankings.map((contact, index) => (
                  <div
                    key={contact.user_id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md
                      ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' : 'bg-card'}
                    `}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-8">
                      {getRankIcon(index)}
                    </div>
                    
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={contact.avatar_url} 
                        alt={contact.full_name}
                      />
                      <AvatarFallback className="text-sm">
                        {contact.full_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {contact.full_name}
                        </p>
                        {contact.status === 'online' && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                      
                      {getRankBadge(index)}
                      
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{contact.contact_count} contatos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};