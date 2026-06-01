import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { getRegion, addToCart } from '../api'
import PriceBreakdown from '../components/PriceBreakdown.jsx'

export default function Product() {
  const { id } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState(null)
  const [err, setErr] = useState(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    api.product(id, getRegion()).then(setP).catch(e => setErr(e.message))
  }, [id])

  const add = () => { addToCart(id, 1); setAdded(true); setTimeout(() => setAdded(false), 2000) }

  if (err) return <div className="container"><div className="alert alert-error">{err}</div></div>
  if (!p) return <div className="container"><div style={{ color: 'var(--muted)' }}>Loading…</div></div>

  return (
    <div className="container">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 400px)', gap: 30 }}>
        <div>
          <div style={{
            aspectRatio: '1/1', background: '#0e1217', borderRadius: 12, overflow: 'hidden',
            border: '1px solid var(--border)',
          }}>
            {p.image_urls?.[imgIdx] && (
              <img src={p.image_urls[imgIdx]} alt={p.title}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={e => e.target.style.display = 'none'} />
            )}
          </div>
          {p.image_urls?.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto' }}>
              {p.image_urls.slice(0, 6).map((src, i) => (
                <img key={i} src={src} alt="" onClick={() => setImgIdx(i)}
                  style={{
                    width: 60, height: 60, objectFit: 'cover', borderRadius: 6, cursor: 'pointer',
                    border: i === imgIdx ? '2px solid var(--emerald)' : '1px solid var(--border)',
                    opacity: i === imgIdx ? 1 : 0.6, flexShrink: 0,
                  }}
                  onError={e => e.target.style.display = 'none'} />
              ))}
            </div>
          )}
        </div>

        <div>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'var(--emerald)',
            background: 'rgba(16,185,129,.1)', padding: '3px 8px',
            borderRadius: 10, border: '1px solid rgba(16,185,129,.3)',
            textTransform: 'uppercase', letterSpacing: '.05em',
          }}>Sourced from {p.vendor_name}</span>

          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '12px 0 4px', lineHeight: 1.3 }}>{p.title}</h1>
          {p.category_path && (
            <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>
              Category: {p.category_path}
            </div>
          )}

          {/* Transparency banner */}
          <div className="card" style={{
            background: 'rgba(16,185,129,.06)', borderColor: 'rgba(16,185,129,.3)',
            padding: 14, marginBottom: 16,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--emerald)',
              textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8,
            }}>Transparent Pricing</div>
            <PriceBreakdown pricing={p.pricing} />
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>
              ✓ Last verified {new Date(p.last_verified_at).toLocaleString()}<br/>
              We'll re-verify the live vendor price the moment you click checkout.
            </div>
          </div>

          <button className="btn btn-primary" onClick={add}
            style={{ width: '100%', padding: '14px 20px', fontSize: 14 }}>
            {added ? '✓ Added to cart' : 'Add to cart'}
          </button>
          <button className="btn btn-secondary" onClick={() => nav('/cart')}
            style={{ width: '100%', padding: '12px 20px', marginTop: 8 }}>
            View cart
          </button>

          {p.description && p.description !== p.title && (
            <div style={{ marginTop: 24 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8,
              }}>Description</div>
              <p style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{p.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
