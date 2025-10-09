
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/auth/AuthProvider';
import { useUserCodes } from '@/hooks/useUserCodes';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';
import { NotificationSoundSettings } from '@/components/settings/NotificationSoundSettings';
import { Copy, Settings, User } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfileProps {
  user: any;
  profile: any;
}

export const UserProfile = ({ user, profile }: UserProfileProps) => {
  const { signOut } = useAuth();
  const { userCode } = useUserCodes();

  const copyUserCode = () => {
    if (userCode) {
      navigator.clipboard.writeText(userCode);
      toast.success('Código copiado!');
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <Dialog>
        <DialogTrigger asChild>
          <div className="cursor-pointer">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Perfil do Usuário</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="space-y-4">
              <ProfilePictureUpload />
              
              {/* User Code Display */}
              <div>
                <label className="text-sm font-medium">Seu Código</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="font-mono text-lg tracking-wider bg-muted p-2 rounded flex-1 text-center">
                    {userCode || 'Carregando...'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyUserCode}
                    disabled={!userCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Compartilhe este código para que outros possam te adicionar
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <NotificationSoundSettings />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {profile?.full_name || 'Usuário'}
          </p>
          <Badge variant="secondary" className="text-xs">Online</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {user?.email}
        </p>
        {userCode && (
          <p className="text-xs text-muted-foreground font-mono">
            Código: {userCode}
          </p>
        )}
      </div>
      
      <Button variant="ghost" size="sm" onClick={signOut} className="text-xs">
        Sair
      </Button>
    </div>
  );
};
