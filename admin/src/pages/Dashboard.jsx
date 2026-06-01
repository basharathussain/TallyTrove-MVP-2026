import { useEffect, useState } from 'react'
import api from '../api'

export default function Dashboard() {
  const [s, setS] = useState(null)
  const [ledger, setLedger] = useState([])
  const [err, setErr] = useState(null)
  useEffect(() => {
    api.summary().then(setS).catch(e => setErr(e.message))
    api.profitLedger().then(setLedger).catch(() => {})
  }, [])

  if (err) return <div className="alert alert-error">{err}</div>
  if (!s) return <div style={{ color: 'var(--muted)' }}>Loading…</div>

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 20 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <Stat label="Products Indexed" value={s.products_indexed} />
        <Stat label="Orders Total" value={s.orders_total} />
        <Stat label="Orders Paid" value={s.orders_paid} color="var(--emerald)" />
        <Stat label="Vendor Orders Pending" value={s.vendor_orders_pending} color="var(--gold)" />
        <Stat label="Revenue (USD)" value={`$${s.revenue_usd.toFixed(2)}`} />
        <Stat label="Agency Profit (USD)" value={`$${s.profit_usd.toFixed(2)}`} color="var(--emerald)" />
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Profit Ledger (Last 30 days)</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Date</th><th>Volume</th><th>Profit</th><th>Orders</th></tr></thead>
          <tbody>
            {ledger.length === 0
              ? <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>No paid orders yet</td></tr>
              : ledger.map(r => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td>${r.wholesale_volume_handled.toFixed(2)}</td>
                  <td style={{ color: 'var(--emerald)', fontWeight: 700 }}>${r.net_service_profit_collected.toFixed(2)}</td>
                  <td>{r.transactions_count}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="card">
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: color || 'var(--text)' }}>{value}</div>
    </div>
  )
}
