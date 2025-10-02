import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRealtimeInvites } from '@/hooks/useRealtimeInvites'
import { CallButton } from './CallButton'
import { IncomingList } from './IncomingList'

export default function App() {
  const [userId, setUserId] = useState<string | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user?.id))
    return () => { sub.subscription.unsubscribe() }
  }, [])

  useRealtimeInvites(userId)

  return (
    <div className="container space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold">UndoinG - Chamadas</h1>
        <p className="text-sm text-gray-600">Usuário atual: {userId ?? 'desconhecido'}</p>
        <AuthBox />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card"><CallButton /></div>
        <div className="card"><IncomingList /></div>
      </div>
    </div>
  )
}

function AuthBox() {
  const signIn = async () => {
    const email = prompt('Email?')
    if (!email) return
    await supabase.auth.signInWithOtp({ email })
    alert('Verifique seu email (link mágico).')
  }
  const signOut = () => supabase.auth.signOut()
  return (
    <div className="mt-3 space-x-2">
      <button className="btn" onClick={signIn}>Entrar (OTP)</button>
      <button className="btn" onClick={signOut}>Sair</button>
    </div>
  )
}
