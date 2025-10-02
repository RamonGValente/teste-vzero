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
    <div style={{ padding: 24 }}>
      <h1>UndoinG - Chamadas</h1>
      <p>Usuário atual: {userId ?? 'desconhecido'}</p>
      <AuthBox />
      <hr />
      <CallButton />
      <IncomingList />
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
    <div style={{ marginTop: 12 }}>
      <button onClick={signIn}>Entrar (OTP)</button>{' '}
      <button onClick={signOut}>Sair</button>
    </div>
  )
}
