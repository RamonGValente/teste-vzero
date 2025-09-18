
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBlockedContacts } from '@/hooks/useBlockedContacts';
import { UserX, Shield } from 'lucide-react';

export const BlockedContacts = () => {
  const { blockedContacts, loading, unblockContact } = useBlockedContacts();

  if (loading) {
    return <div className="p-4">Carregando contatos bloqueados...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Contatos Bloqueados
        </CardTitle>
      </CardHeader>
      <CardContent>
        {blockedContacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum contato bloqueado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {blockedContacts.map((blocked) => (
              <div
                key={blocked.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={blocked.profiles?.avatar_url} />
                    <AvatarFallback>
                      {blocked.profiles?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {blocked.profiles?.full_name || 'Usuário'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {blocked.profiles?.email}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unblockContact(blocked.blocked_user_id)}
                >
                  Desbloquear
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
