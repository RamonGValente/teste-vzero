import { useEffect, useMemo, useState } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import { createCall } from '@/lib/videoCallService';

function roomNameFor(a: string, b: string){ return [a,b].sort().join('__'); }

export default function LiveKitCallButtons({ currentUserId, contactId, currentUserName }:{ currentUserId:string; contactId:string; currentUserName:string }){
  const [open, setOpen] = useState<null|'voice'|'video'>(null);
  const [token, setToken] = useState<string|null>(null);
  const [url, setUrl] = useState<string|null>(null);

  const roomName = useMemo(()=> roomNameFor(currentUserId, contactId), [currentUserId, contactId]);
  const identity = currentUserId;
  const name = currentUserName || identity;

  async function fetchToken(kind:'voice'|'video', roomOverride?:string){
    const qs = new URLSearchParams({ room: roomOverride || roomName, identity, name });
    const endpoint = import.meta.env.DEV ? `/dev/livekit-token?${qs}` : `/api/livekit-token?${qs}`;
    const res = await fetch(endpoint);
    const js = await res.json();
    setToken(js.token); setUrl(js.url); setOpen(kind);
    if(!roomOverride){
      await createCall({ callerId: currentUserId, receiverId: contactId, roomId: roomName, type: kind==='video'?'video':'audio' });
    }
  }

  useEffect(()=>{
    function onAccept(e:any){
      const call = e.detail;
      if(!call) return;
      fetchToken(call.call_type === 'video' ? 'video' : 'voice', call.room_id);
    }
    window.addEventListener('incoming-call-accept', onAccept);
    return ()=> window.removeEventListener('incoming-call-accept', onAccept);
  }, []);

  return (
    <div style={{display:'flex', gap:8}}>
      <button onClick={()=>fetchToken('voice')} title="Chamada de voz">📞</button>
      <button onClick={()=>fetchToken('video')} title="Videochamada">🎥</button>
      {open && token && url && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.6)'}}>
          <div style={{position:'absolute', inset:32, background:'#111', borderRadius:12, overflow:'hidden'}}>
            <LiveKitRoom token={token} serverUrl={url} connect options={{ publishDefaults:{ videoSimulcast:true }}}>
              <VideoConference />
              <button onClick={()=>{ setOpen(null); }} style={{position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)'}}>Leave</button>
            </LiveKitRoom>
          </div>
        </div>
      )}
    </div>
  );
}
