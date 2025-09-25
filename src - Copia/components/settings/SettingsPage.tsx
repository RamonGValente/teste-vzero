import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Lock, Bell, HardDrive, MessageSquare, Phone, Settings as SettingsIcon, Palette } from 'lucide-react';
import { AccountSettings } from './AccountSettings';
import { PrivacySettings } from './PrivacySettings';
import { NotificationSettings } from './NotificationSettings';
import { StorageSettings } from './StorageSettings';
import { ChatSettings } from './ChatSettings';
import { CallSettings } from './CallSettings';
import { GeneralSettings } from './GeneralSettings';
import { AppearanceSettings } from './AppearanceSettings';

interface SettingsPageProps {
  onBack: () => void;
  user: any;
  profile: any;
}

type SettingsSection = 
  | 'main' 
  | 'account' 
  | 'privacy' 
  | 'notifications' 
  | 'storage' 
  | 'chat' 
  | 'calls' 
  | 'general'
  | 'appearance';

const settingsMenuItems = [
  { id: 'account', label: 'Conta', icon: User, description: 'Foto do perfil, nome, sobre' },
  { id: 'privacy', label: 'Privacidade', icon: Lock, description: 'Último visto, confirmação de leitura' },
  { id: 'notifications', label: 'Notificações', icon: Bell, description: 'Tons, vibração, notificações' },
  { id: 'storage', label: 'Armazenamento e dados', icon: HardDrive, description: 'Uso de rede, auto-download' },
  { id: 'chat', label: 'Conversas', icon: MessageSquare, description: 'Papel de parede, histórico' },
  { id: 'calls', label: 'Chamadas', icon: Phone, description: 'Configurações de chamadas' },
  { id: 'appearance', label: 'Aparência', icon: Palette, description: 'Tema, cores, fonte' },
  { id: 'general', label: 'Geral', icon: SettingsIcon, description: 'Idioma, teclado, ajuda' },
];

export const SettingsPage = ({ onBack, user, profile }: SettingsPageProps) => {
  const [currentSection, setCurrentSection] = useState<SettingsSection>('main');

  const handleSectionSelect = (section: SettingsSection) => {
    setCurrentSection(section);
  };

  const handleBackToMain = () => {
    setCurrentSection('main');
  };

  const renderHeader = () => {
    const isMainSection = currentSection === 'main';
    const currentItem = settingsMenuItems.find(item => item.id === currentSection);
    
    return (
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={isMainSection ? onBack : handleBackToMain}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {isMainSection ? 'Configurações' : currentItem?.label}
            </h1>
            {!isMainSection && currentItem?.description && (
              <p className="text-sm text-muted-foreground">{currentItem.description}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentSection) {
      case 'account':
        return <AccountSettings user={user} profile={profile} />;
      case 'privacy':
        return <PrivacySettings user={user} />;
      case 'notifications':
        return <NotificationSettings user={user} />;
      case 'storage':
        return <StorageSettings user={user} />;
      case 'chat':
        return <ChatSettings user={user} />;
      case 'calls':
        return <CallSettings user={user} />;
      case 'appearance':
        return <AppearanceSettings user={user} />;
      case 'general':
        return <GeneralSettings user={user} />;
      default:
        return (
          <div className="p-4 space-y-2">
            {settingsMenuItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className="w-full justify-start h-auto p-4 text-left"
                onClick={() => handleSectionSelect(item.id as SettingsSection)}
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {renderHeader()}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};