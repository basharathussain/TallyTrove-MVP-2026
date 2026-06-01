import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getRegion } from '../api'
import ProductCard from '../components/ProductCard.jsx'

export default function Home() {
  const [trending, setTrending] = useState(null)
  const [q, setQ] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    api.trending(getRegion()).then(setTrending).catch(() => setTrending({ results: [] }))
  }, [])

  return (
    <div className="container">
      {/* Hero */}
      <div style={{ padding: '40px 0 50px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block', fontSize: 11, fontWeight: 700,
          color: 'var(--emerald)', background: 'rgba(16,185,129,.1)',
          padding: '4px 10px', borderRadius: 12,
          border: '1px solid rgba(16,185,129,.3)', marginBottom: 16,
          textTransform: 'uppercase', letterSpacing: '.05em',
        }}>Transparent Sourcing Platform</div>
        <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-.02em', margin: '0 0 14px', lineHeight: 1.1 }}>
          Every cost on the receipt.
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 580, margin: '0 auto 30px' }}>
          TallyTrove sources products from the global wholesale network. You see the base cost, our AI agency fee,
          and shipping — itemized, before you click buy.
        </p>

        <form onSubmit={e => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`) }}
          style={{ display: 'flex', gap: 8, maxWidth: 560, margin: '0 auto' }}>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="What are you sourcing today?"
            style={{ flex: 1, fontSize: 15, padding: '12px 16px' }} />
          <button className="btn btn-primary" style={{ padding: '12px 24px' }}>Source</button>
        </form>
      </div>

      {/* Trust strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14, marginBottom: 40,
      }}>
        {[
          { icon: '🧾', title: 'Itemized Pricing', body: 'Base cost + agency fee + shipping. Always visible.' },
          { icon: '✓', title: 'Verified at Checkout', body: 'We re-check the vendor price moments before you pay.' },
          { icon: '🌐', title: 'Multi-Region', body: 'Now shipping to US 🇺🇸 and UK 🇬🇧. More regions soon.' },
        ].map(c => (
          <div key={c.title} className="card">
            <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{c.body}</div>
          </div>
        ))}
      </div>

      {/* Trending */}
      <h2 className="page-title">Trending in your region</h2>
      {!trending ? (
        <div style={{ color: 'var(--muted)' }}>Loading…</div>
      ) : trending.results.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          No products indexed yet. Run <code style={{ color: 'var(--emerald)' }}>make index</code> to populate the catalog.
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16,
        }}>
          {trending.results.map(p => <ProductCard key={p.product_id} product={p} />)}
        </div>
      )}
    </div>
  )
}
