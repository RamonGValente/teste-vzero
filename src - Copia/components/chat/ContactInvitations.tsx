
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContactInvitations } from '@/hooks/useContactInvitations';
import { UserPlus, Check, X, Mail } from 'lucide-react';

export const ContactInvitations = () => {
  const [inviteEmail, setInviteEmail] = useState('');
  const { invitations, loading, sendInvitation, respondToInvitation } = useContactInvitations();

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    await sendInvitation(inviteEmail);
    setInviteEmail('');
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const receivedInvitations = pendingInvitations.filter(inv => inv.receiver_id === inv.receiver?.id);
  const sentInvitations = pendingInvitations.filter(inv => inv.sender_id === inv.sender?.id);

  if (loading) {
    return <div className="p-4">Carregando convites...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Send Invitation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Contato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="Digite o e-mail do usuário"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!inviteEmail.trim()}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Received Invitations */}
      {receivedInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Convites Recebidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {receivedInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={invitation.sender?.avatar_url} />
                    <AvatarFallback>
                      {invitation.sender?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {invitation.sender?.full_name || 'Usuário'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invitation.sender?.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => respondToInvitation(invitation.id, 'accepted')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respondToInvitation(invitation.id, 'rejected')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sent Invitations */}
      {sentInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Convites Enviados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sentInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={invitation.receiver?.avatar_url} />
                    <AvatarFallback>
                      {invitation.receiver?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {invitation.receiver?.full_name || 'Usuário'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invitation.receiver?.email}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Pendente</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pendingInvitations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhum convite pendente</p>
        </div>
      )}
    </div>
  );
};
