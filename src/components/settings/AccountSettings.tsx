import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';
import { Camera, Edit3, Phone, Mail, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AccountSettingsProps {
  user: any;
  profile: any;
}

export const AccountSettings = ({ user, profile }: AccountSettingsProps) => {
  const [editingName, setEditingName] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [about, setAbout] = useState(profile?.about || 'Olá! Estou usando o UndoinG.');
  const [phone, setPhone] = useState(profile?.phone || '');

  const handleSaveField = async (field: string, value: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Perfil atualizado com sucesso!');
      
      // Reset editing states
      setEditingName(false);
      setEditingAbout(false);
      setEditingPhone(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Profile Picture Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Foto do perfil
          </CardTitle>
          <CardDescription>
            Sua foto será visível para seus contatos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-2xl">
                {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <ProfilePictureUpload />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informações pessoais</CardTitle>
          <CardDescription>
            Suas informações básicas de perfil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Nome</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingName(!editingName)}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
            {editingName ? (
              <div className="flex gap-2">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                />
                <Button
                  size="sm"
                  onClick={() => handleSaveField('full_name', fullName)}
                >
                  Salvar
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                {profile?.full_name || 'Não informado'}
              </p>
            )}
          </div>

          <Separator />

          {/* About */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sobre</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingAbout(!editingAbout)}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
            {editingAbout ? (
              <div className="space-y-2">
                <Textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Adicione uma mensagem sobre você"
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={() => handleSaveField('about', about)}
                >
                  Salvar
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                {profile?.about || about}
              </p>
            )}
          </div>

          <Separator />

          {/* Phone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingPhone(!editingPhone)}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
            {editingPhone ? (
              <div className="flex gap-2">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55 (11) 99999-9999"
                  type="tel"
                />
                <Button
                  size="sm"
                  onClick={() => handleSaveField('phone', phone)}
                >
                  Salvar
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                {profile?.phone || 'Não informado'}
              </p>
            )}
          </div>

          <Separator />

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <p className="text-sm text-muted-foreground py-2">
              {user?.email}
            </p>
            <p className="text-xs text-muted-foreground">
              Seu endereço de email não pode ser alterado
            </p>
          </div>

          <Separator />

          {/* Account creation date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Membro desde
            </Label>
            <p className="text-sm text-muted-foreground py-2">
              {new Date(user?.created_at).toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};