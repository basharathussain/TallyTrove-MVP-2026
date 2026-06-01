import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearToken } from '../api'

const NAV = [
  { to: '/dashboard',       icon: '⊞', label: 'Dashboard' },
  { to: '/customer-orders', icon: '🛒', label: 'Customer Orders' },
  { to: '/vendor-orders',   icon: '📋', label: 'Vendor Orders' },
  { to: '/products',        icon: '📦', label: 'Products' },
  { to: '/verifications',   icon: '✓', label: 'Verifications' },
  { to: '/settings',        icon: '⚙️', label: 'Settings' },
]

export default function Layout() {
  const nav = useNavigate()
  const logout = () => { clearToken(); nav('/login') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <aside style={{
        width: 220, minWidth: 220,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'var(--emerald)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#fff',
            }}>T</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>TallyTrove</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Back-Office · MVP</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 20px', textDecoration: 'none', fontSize: 13,
              color: isActive ? '#fff' : 'var(--muted)',
              background: isActive ? 'rgba(16,185,129,.12)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--emerald)' : '2px solid transparent',
              transition: 'all .15s',
            })}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>Sign out</button>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        <Outlet />
      </main>
    </div>
  )
}
