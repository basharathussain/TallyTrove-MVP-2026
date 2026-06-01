import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getRegion, setRegion, getCart, getUser, clearAuth } from '../api'

export default function Layout() {
  const [region, setRegionState] = useState(getRegion())
  const [cartCount, setCartCount] = useState(getCart().reduce((a, i) => a + i.quantity, 0))
  const [user, setUser] = useState(getUser())
  const nav = useNavigate()

  useEffect(() => {
    const onStorage = () => {
      setCartCount(getCart().reduce((a, i) => a + i.quantity, 0))
      setUser(getUser())
    }
    window.addEventListener('storage', onStorage)
    const interval = setInterval(onStorage, 1000)
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval) }
  }, [])

  const switchRegion = (code) => { setRegion(code); setRegionState(code); window.location.reload() }
  const logout = () => { clearAuth(); setUser(null); nav('/') }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,14,20,.92)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(10px)',
      }}>
        <div className="container" style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, background: 'var(--emerald)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, color: '#fff', fontSize: 14,
            }}>T</div>
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-.01em' }}>TallyTrove</span>
          </Link>

          <SearchBar />

          <RegionToggle region={region} onChange={switchRegion} />

          <Link to="/cart" className="btn btn-ghost" style={{ position: 'relative' }}>
            🛒
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: 'var(--emerald)', color: '#fff',
                borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700,
              }}>{cartCount}</span>
            )}
          </Link>

          {user ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Link to="/orders" className="btn btn-ghost">Orders</Link>
              <button onClick={logout} className="btn btn-ghost">Sign out</button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-secondary">Sign in</Link>
          )}
        </div>
      </header>

      <main style={{ flex: 1, paddingTop: 24, paddingBottom: 60 }}>
        <Outlet />
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 0', color: 'var(--muted)', fontSize: 12 }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span>© TallyTrove — every cost on the receipt</span>
            <span>Region: {region === 'US' ? '🇺🇸 United States (USD)' : '🇬🇧 United Kingdom (GBP)'}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SearchBar() {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  return (
    <form style={{ flex: 1 }} onSubmit={e => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`) }}>
      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder="Search for products — e.g. wireless earbuds, smart watch…"
        style={{ width: '100%' }} />
    </form>
  )
}

function RegionToggle({ region, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', borderRadius: 8, padding: 3 }}>
      {[['US', '🇺🇸'], ['GB', '🇬🇧']].map(([code, flag]) => (
        <button key={code} onClick={() => onChange(code)} style={{
          padding: '5px 11px', borderRadius: 6, border: 'none',
          background: region === code ? 'var(--emerald)' : 'transparent',
          color: region === code ? '#fff' : 'var(--muted)', fontWeight: 600,
        }}>{flag} {code}</button>
      ))}
    </div>
  )
}
