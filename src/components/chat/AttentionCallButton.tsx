import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAttentionCalls } from '@/hooks/useAttentionCalls';
import { Bell, BellRing } from 'lucide-react';
import { toast } from 'sonner';

interface Props { contactId: string; contactName: string; contactOnline?: boolean; }

export const AttentionCallButton = ({ contactId, contactName, contactOnline = true }: Props) => {
  const [isShaking, setIsShaking] = useState(false);
  const { callAttention } = useAttentionCalls();

  const handleClick = async () => {
    if (!contactOnline) { toast.error(`${contactName} está offline`); return; }
    setIsShaking(true);
    try { await callAttention(contactId); }
    finally { setTimeout(() => setIsShaking(false), 600); }
  };

  return (
    <Button type="button" variant="ghost" size="sm" title={contactOnline ? `Chamar atenção de ${contactName}` : `${contactName} está offline`} onClick={handleClick} disabled={!contactOnline} className={`transition-all duration-300 ${isShaking ? 'animate-pulse' : ''}`}>
      {isShaking ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
    </Button>
  );
};
