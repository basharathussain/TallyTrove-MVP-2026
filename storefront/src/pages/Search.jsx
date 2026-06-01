import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api, { getRegion } from '../api'
import ProductCard from '../components/ProductCard.jsx'

export default function Search() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!q) return
    setData(null); setErr(null)
    api.search(q, getRegion()).then(setData).catch(e => setErr(e.message))
  }, [q])

  return (
    <div className="container">
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>Sourcing results for</div>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>"{q}"</h1>
      </div>

      {err && <div className="alert alert-error">{err}</div>}
      {!data && !err && <div style={{ color: 'var(--muted)' }}>Searching…</div>}
      {data && data.results.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          No matches. Try a broader term.
        </div>
      )}
      {data && data.results.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16,
        }}>
          {data.results.map(p => <ProductCard key={p.product_id} product={p} />)}
        </div>
      )}
    </div>
  )
}
