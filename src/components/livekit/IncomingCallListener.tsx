import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function IncomingCallListener({ currentUserId, onAccept }:{ currentUserId:string; onAccept:(call:any)=>void }){
  const [incoming, setIncoming] = useState<any|null>(null);

  useEffect(()=>{
    const ch = supabase.channel('vc_'+currentUserId).on('postgres_changes',{
      event:'INSERT', schema:'public', table:'video_calls', filter:'receiver_id=eq.'+currentUserId
    }, (p)=>{
      if(p.new && (p.new as any).status==='calling') setIncoming(p.new);
    }).subscribe();
    return ()=> { supabase.removeChannel(ch); };
  }, [currentUserId]);

  if(!incoming) return null;
  return (
    <div style={{position:'fixed', right:16, bottom:16, background:'#222', color:'#fff', padding:12, borderRadius:12, zIndex:9999}}>
      <div>Chamada {incoming.call_type} recebida</div>
      <div style={{display:'flex', gap:8, marginTop:8}}>
        <button onClick={()=>{ onAccept(incoming); setIncoming(null); }}>Atender</button>
        <button onClick={()=> setIncoming(null)}>Recusar</button>
      </div>
    </div>
  );
}
