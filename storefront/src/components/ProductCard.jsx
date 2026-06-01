import { Link } from 'react-router-dom'
import PriceBreakdown from './PriceBreakdown.jsx'

export default function ProductCard({ product }) {
  return (
    <Link to={`/p/${product.product_id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{
        padding: 0, overflow: 'hidden', height: '100%',
        display: 'flex', flexDirection: 'column',
        transition: 'transform .15s, border-color .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--emerald)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        <div style={{
          aspectRatio: '1/1', background: '#0e1217', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none' }} />
          ) : <span style={{ color: 'var(--muted)' }}>📦</span>}
        </div>
        <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: 'var(--emerald)',
            background: 'rgba(16,185,129,.1)', padding: '2px 6px',
            borderRadius: 10, alignSelf: 'flex-start',
            border: '1px solid rgba(16,185,129,.3)', textTransform: 'uppercase', letterSpacing: '.05em',
          }}>{product.vendor_name}</span>
          <div style={{
            fontSize: 13, color: 'var(--text)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', minHeight: 36,
          }}>{product.title}</div>
          <div style={{ marginTop: 'auto' }}>
            <PriceBreakdown pricing={product.pricing} compact />
            <div style={{ marginTop: 4, fontSize: 10, color: 'var(--muted)' }}>
              ✓ Verified {new Date(product.last_verified_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
