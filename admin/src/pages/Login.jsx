import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { setToken } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setErr(null); setLoading(true)
    try {
      const res = await api.login(email, password)
      if (res.role !== 'admin') throw new Error('Not an admin account')
      setToken(res.access_token); nav('/dashboard')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: 'var(--emerald)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 auto 12px',
          }}>T</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>TallyTrove</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Back-Office Portal</div>
        </div>
        <div className="card">
          {err && <div className="alert alert-error">{err}</div>}
          <form onSubmit={submit}>
            <div className="form-row"><label>Email</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="form-row"><label>Password</label><input required type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
