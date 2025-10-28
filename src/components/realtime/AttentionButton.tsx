import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAttentionCalls } from '@/hooks/useAttentionCalls';

type Props = {
  contactId: string;
  message?: string | null;
  className?: string;
};

export default function AttentionButton({ contactId, message = null, className }: Props) {
  const { callAttention } = useAttentionCalls();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      title="Chamar atenção"
      onClick={async () => {
        try {
          await callAttention(contactId, message);
        } catch (e) {
          console.error(e);
        }
      }}
    >
      <Bell className="h-5 w-5" />
    </Button>
  );
}
