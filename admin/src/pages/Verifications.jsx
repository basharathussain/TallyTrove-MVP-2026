import { useEffect, useState } from 'react'
import api from '../api'

export default function Verifications() {
  const [only_drift, setOnlyDrift] = useState(false)
  const [items, setItems] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => { api.verifications(only_drift).then(setItems).catch(e => setErr(e.message)) }, [only_drift])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title">Layer 3 Verifications (Audit Trail)</h1>
        <label style={{ marginBottom: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={only_drift} onChange={e => setOnlyDrift(e.target.checked)} style={{ width: 'auto' }} />
          Only drift / errors
        </label>
      </div>
      {err && <div className="alert alert-error">{err}</div>}
      <div className="alert alert-info">
        Every cart authorization triggers a live vendor scrape. Each check is logged here forever — this is the audit trail that backs the transparency promise.
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>When</th><th>Product</th><th>Cost</th><th>Drift</th><th>Outcome</th><th>Triggered By</th></tr></thead>
          <tbody>
            {items.length === 0
              ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No verifications recorded</td></tr>
              : items.map(v => (
                <tr key={v.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 11 }}>{new Date(v.checked_at).toLocaleString()}</td>
                  <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.product_title}</td>
                  <td>{v.cost_at_check != null ? `$${v.cost_at_check.toFixed(2)}` : '—'}</td>
                  <td style={{ color: v.drift_pct != null && Math.abs(v.drift_pct) > 0.02 ? 'var(--gold)' : 'var(--text)', fontWeight: 700 }}>
                    {v.drift_pct != null ? `${(v.drift_pct * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                      background: v.outcome === 'Verified' ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)',
                      color: v.outcome === 'Verified' ? 'var(--emerald)' : 'var(--gold)',
                    }}>{v.outcome}</span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 11 }}>{v.triggered_by}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
