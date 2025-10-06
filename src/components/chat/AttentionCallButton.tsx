import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAttentionCalls } from '@/hooks/useAttentionCalls';
import { Bell, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Props {
  contactId: string;
  contactName: string;
}

export const AttentionCallButton: React.FC<Props> = ({ contactId, contactName }) => {
  const [isShaking, setIsShaking] = useState(false);
  const { callAttention } = useAttentionCalls();

  const doubleCheckOnline = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('status,last_seen')
        .eq('id', contactId)
        .maybeSingle();
      const last = data?.last_seen ? new Date(data.last_seen).getTime() : 0;
      const online = (data?.status === 'online') || (last && Date.now() - last < 70_000);
      return online;
    } catch {
      return false;
    }
  };

  const handleClick = async () => {
    const ok = await doubleCheckOnline();
    if (!ok) {
      toast.error(`${contactName} está offline`);
      return;
    }
    setIsShaking(true);
    await callAttention(contactId);
    setTimeout(() => setIsShaking(false), 600);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      title={`Chamar atenção de ${contactName}`}
      className={`transition-all duration-300 ${isShaking ? 'animate-pulse' : ''}`}
    >
      {isShaking ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
    </Button>
  );
};
