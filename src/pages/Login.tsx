
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg(error.message)
    setLoading(false)
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <form onSubmit={handleEmail} style={{ display: 'grid', gap: 12, width: 320 }}>
        <h1>Entrar</h1>
        <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input type="password" placeholder="senha" value={password} onChange={e=>setPassword(e.target.value)}/>
        <button disabled={loading}>{loading? '...' : 'Entrar'}</button>
        {msg && <div style={{ color: 'crimson' }}>{msg}</div>}
      </form>
    </div>
  )
}
