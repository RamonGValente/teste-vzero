import React, { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ChatSidebar } from './ChatSidebar'
import { ChatWindow } from './ChatWindow'
import { useChatStore } from '@/store/chatStore'
import { useRealtimeInvites } from '@/hooks/useRealtimeInvites'
export default function App(){ const setSelfId = useChatStore(s=>s.setSelfId); const selfId = useChatStore(s=>s.selfId); useEffect(()=>{ supabase.auth.getSession().then(({data})=> setSelfId(data.session?.user?.id)); const { data: sub } = supabase.auth.onAuthStateChange((_e,session)=> setSelfId(session?.user?.id)); return ()=>{ sub.subscription.unsubscribe() } },[setSelfId]); useRealtimeInvites(selfId); return (<div className="app"><div className="sidebar"><Header/><ChatSidebar/></div><div className="main"><ChatWindow/></div></div>) }
function Header(){ const selfId = useChatStore(s=>s.selfId); const signIn = async()=>{ const email = prompt('Email?'); if(!email) return; await supabase.auth.signInWithOtp({ email }); alert('Verifique seu email (link mágico).') }; const signOut = ()=> supabase.auth.signOut(); return (<div className="p-4 border-b flex items-center justify-between"><div className="font-semibold">UndoinG • Chat & Calls</div><div className="flex items-center gap-2 text-sm"><span className="text-muted">UID:</span> <span className="font-mono">{selfId ?? '—'}</span><button className="btn" onClick={signIn}>Entrar</button><button className="btn" onClick={signOut}>Sair</button></div></div>) }
