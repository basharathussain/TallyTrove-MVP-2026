import { useEffect, useState } from 'react'
import api from '../api'

export default function CustomerOrders() {
  const [orders, setOrders] = useState([])
  const [err, setErr] = useState(null)
  useEffect(() => { api.customerOrders().then(setOrders).catch(e => setErr(e.message)) }, [])

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 20 }}>Customer Orders</h1>
      {err && <div className="alert alert-error">{err}</div>}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Order ID</th><th>Region</th><th>Total</th><th>Status</th><th>Items</th><th>Created</th></tr></thead>
          <tbody>
            {orders.length === 0
              ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No orders yet</td></tr>
              : orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{o.id.slice(0, 8)}</td>
                  <td>{o.region_code === 'US' ? '🇺🇸' : '🇬🇧'} {o.region_code}</td>
                  <td style={{ fontWeight: 700 }}>{o.currency_symbol}{o.grand_total_display.toFixed(2)}</td>
                  <td><span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                    background: o.payment_status === 'Paid' ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)',
                    color: o.payment_status === 'Paid' ? 'var(--emerald)' : 'var(--gold)',
                  }}>{o.payment_status}</span></td>
                  <td>{o.vendor_orders.length}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 11 }}>{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
