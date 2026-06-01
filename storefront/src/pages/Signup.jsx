import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { setAuth, getRegion } from '../api'

export default function Signup() {
  const [form, setForm] = useState({ email: '', password: '', region_code: getRegion(), first_name: '', last_name: '' })
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setErr(null); setLoading(true)
    try {
      const res = await api.signup(form)
      setAuth(res.access_token, res)
      nav('/')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <h1 className="page-title">Create account</h1>
      <div className="card">
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label>First name</label><input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
            <div><label>Last name</label><input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
          </div>
          <div><label>Email</label><input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div><label>Password</label><input type="password" required minLength={6} value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
          <div><label>Region</label>
            <select value={form.region_code} onChange={e => setForm({...form, region_code: e.target.value})}>
              <option value="US">🇺🇸 United States (USD)</option>
              <option value="GB">🇬🇧 United Kingdom (GBP)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', padding: '12px 20px' }}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
