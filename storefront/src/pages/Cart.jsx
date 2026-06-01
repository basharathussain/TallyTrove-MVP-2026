import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { getCart, getRegion, updateCartQty, removeFromCart } from '../api'
import PriceBreakdown from '../components/PriceBreakdown.jsx'

export default function Cart() {
  const [preview, setPreview] = useState(null)
  const [err, setErr] = useState(null)
  const nav = useNavigate()

  const load = async () => {
    const items = getCart()
    if (!items.length) { setPreview({ lines: [], totals: null }); return }
    setErr(null)
    try { setPreview(await api.previewCart(getRegion(), items)) }
    catch (e) { setErr(e.message) }
  }

  useEffect(() => { load() }, [])

  const updateQty = (pid, qty) => { updateCartQty(pid, qty); load() }
  const remove = (pid) => { removeFromCart(pid); load() }

  if (!preview) return <div className="container"><div style={{ color: 'var(--muted)' }}>Loading cart…</div></div>

  if (preview.lines.length === 0) {
    return (
      <div className="container">
        <h1 className="page-title">Cart</h1>
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          Your cart is empty.<br/>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Browse trending</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 className="page-title">Cart</h1>
      {err && <div className="alert alert-error">{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 30 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {preview.lines.map(line => (
            <div key={line.product_id} className="card" style={{ display: 'flex', gap: 14 }}>
              {line.image_url && (
                <img src={line.image_url} alt={line.title}
                  style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                  onError={e => e.target.style.display = 'none'} />
              )}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Link to={`/p/${line.product_id}`} style={{
                  color: 'var(--text)', fontSize: 13, textDecoration: 'none',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{line.title}</Link>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 'auto' }}>
                  <label style={{ marginBottom: 0 }}>
                    <span style={{ marginRight: 4 }}>Qty</span>
                    <select value={line.quantity} onChange={e => updateQty(line.product_id, +e.target.value)}
                      style={{ width: 64, padding: 4 }}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <button onClick={() => remove(line.product_id)} className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 11 }}>Remove</button>
                  <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 800 }}>
                    {preview.currency_symbol}{line.line_total_display.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ height: 'fit-content', position: 'sticky', top: 80 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)',
            textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
            Transparent Tally
          </div>
          <PriceBreakdown pricing={preview.totals} />
          <button className="btn btn-primary" onClick={() => nav('/checkout')}
            style={{ width: '100%', padding: '12px 20px', marginTop: 18 }}>
            Authorize Agent Checkout
          </button>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            We'll verify the live vendor price before charging.
          </div>
        </div>
      </div>
    </div>
  )
}
