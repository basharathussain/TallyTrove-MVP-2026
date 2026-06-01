import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { setAuth } from '../api'

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
      setAuth(res.access_token, res)
      nav('/')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="container" style={{ maxWidth: 400 }}>
      <h1 className="page-title">Sign in</h1>
      <div className="card">
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          <label style={{ marginTop: 12 }}>Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', padding: '12px 20px', marginTop: 16 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          New? <Link to="/signup">Create an account</Link>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          Demo: <code>demo@tallytrove.com</code> / <code>demo123</code>
        </div>
      </div>
    </div>
  )
}
