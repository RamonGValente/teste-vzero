
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUserCodes } from '@/hooks/useUserCodes';
import { UserPlus, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const AddContactByCode = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [contactCode, setContactCode] = useState('');
  const { userCode, loading, addContactByCode, generateNewCode } = useUserCodes();

  const handleAddContact = async () => {
    if (contactCode.trim()) {
      const success = await addContactByCode(contactCode.trim());
      if (success) {
        setContactCode('');
        setIsOpen(false);
      }
    }
  };

  const copyUserCode = () => {
    if (userCode) {
      navigator.clipboard.writeText(userCode);
      toast.success('Código copiado!');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Adicionar Contato
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Contato por Código</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Seu código */}
          <div>
            <label className="text-sm font-medium">Seu Código</label>
            <div className="flex items-center gap-2 mt-1">
              <Input 
                value={userCode} 
                readOnly 
                className="font-mono text-center text-lg tracking-wider"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyUserCode}
                title="Copiar código"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateNewCode}
                title="Gerar novo código"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Compartilhe este código para que outros possam te adicionar
            </p>
          </div>

          {/* Adicionar contato */}
          <div>
            <label className="text-sm font-medium">Código do Contato</label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={contactCode}
                onChange={(e) => setContactCode(e.target.value)}
                placeholder="Digite o código do contato"
                className="font-mono text-center text-lg tracking-wider"
                maxLength={8}
              />
              <Button
                onClick={handleAddContact}
                disabled={!contactCode.trim() || loading}
              >
                {loading ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
