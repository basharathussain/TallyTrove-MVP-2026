import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function Orders() {
  const [orders, setOrders] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => { api.myOrders().then(setOrders).catch(e => setErr(e.message)) }, [])

  return (
    <div className="container">
      <h1 className="page-title">Your orders</h1>
      {err && <div className="alert alert-error">{err}</div>}
      {!orders ? <div style={{ color: 'var(--muted)' }}>Loading…</div>
        : orders.length === 0 ? <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No orders yet.</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.map(o => (
              <Link key={o.id} to={`/orders/${o.id}`} className="card" style={{
                textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Order · {o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                    {o.vendor_orders.length} item{o.vendor_orders.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    {o.currency_symbol}{o.grand_total_display.toFixed(2)}
                  </div>
                  <StatusBadge status={o.payment_status} />
                </div>
              </Link>
            ))}
          </div>
        )}
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = {
    Pending: { bg: 'rgba(245,158,11,.1)', color: '#fcd34d', border: 'rgba(245,158,11,.3)' },
    Paid: { bg: 'rgba(16,185,129,.1)', color: 'var(--emerald)', border: 'rgba(16,185,129,.3)' },
    Failed: { bg: 'rgba(244,63,94,.1)', color: '#fda4af', border: 'rgba(244,63,94,.3)' },
  }
  const c = colors[status] || colors.Pending
  return <span style={{
    fontSize: 11, padding: '2px 8px', borderRadius: 10,
    background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    fontWeight: 600, marginLeft: 8,
  }}>{status}</span>
}
