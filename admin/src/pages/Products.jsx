import { useEffect, useState } from 'react'
import api from '../api'

export default function Products() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [err, setErr] = useState(null)
  const [running, setRunning] = useState(false)

  const load = (query) => api.products(query).then(setItems).catch(e => setErr(e.message))
  useEffect(() => { load('') }, [])

  const runIndex = async () => {
    setRunning(true); setErr(null)
    try { const r = await api.triggerIndex(); alert(r.message) } catch (e) { setErr(e.message) } finally { setRunning(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title">Indexed Catalog</h1>
        <button onClick={runIndex} disabled={running} className="btn btn-primary">
          {running ? 'Running…' : '↻ Run indexer'}
        </button>
      </div>
      {err && <div className="alert alert-error">{err}</div>}

      <div style={{ marginBottom: 14 }}>
        <input placeholder="Search catalog…" value={q}
          onChange={e => { setQ(e.target.value); load(e.target.value) }}
          style={{ maxWidth: 400 }} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Title</th><th>Vendor</th><th>Cost (USD)</th><th>In Stock</th><th>Last Verified</th><th></th></tr></thead>
          <tbody>
            {items.length === 0
              ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No products. Run the indexer.</td></tr>
              : items.map(p => (
                <tr key={p.id}>
                  <td style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                  <td>{p.vendor_name}</td>
                  <td style={{ fontFamily: 'monospace' }}>${p.cost.toFixed(2)}</td>
                  <td>{p.in_stock ? '✓' : '✗'}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 11 }}>{new Date(p.last_verified_at).toLocaleString()}</td>
                  <td><a href={p.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--emerald)' }}>↗</a></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
