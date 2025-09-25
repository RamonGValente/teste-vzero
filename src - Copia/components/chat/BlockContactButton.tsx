import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useBlockedContacts } from '@/hooks/useBlockedContacts';
import { toast } from 'sonner';

interface BlockContactButtonProps {
  contactId: string;
  contactName: string;
  onBlock?: () => void;
}

export const BlockContactButton = ({ contactId, contactName, onBlock }: BlockContactButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { blockContact, isBlocked } = useBlockedContacts();

  const handleBlock = async () => {
    try {
      await blockContact(contactId);
      setIsOpen(false);
      onBlock?.();
      toast.success(`${contactName} foi bloqueado`);
    } catch (error) {
      toast.error('Erro ao bloquear contato');
    }
  };

  if (isBlocked(contactId)) {
    return null; // Don't show block option for already blocked contacts
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem 
          onSelect={(e) => {
            e.preventDefault();
            setIsOpen(true);
          }}
          className="text-red-600 focus:text-red-600"
        >
          Bloquear contato
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bloquear {contactName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação irá bloquear {contactName}. Você não receberá mais mensagens desta pessoa 
            e ela não poderá ver seu status online. Esta ação pode ser desfeita posteriormente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleBlock}
            className="bg-red-600 hover:bg-red-700"
          >
            Bloquear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};