import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getCart, getRegion, clearCart } from '../api'
import PriceBreakdown from '../components/PriceBreakdown.jsx'

export default function Checkout() {
  const [step, setStep] = useState('address')   // address | verifying | confirmation | paid
  const [addr, setAddr] = useState({ name:'', line1:'', city:'', state:'', zip:'', country: getRegion() === 'GB' ? 'United Kingdom' : 'United States' })
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)
  const nav = useNavigate()

  const submit = async (e) => {
    e?.preventDefault()
    setStep('verifying'); setErr(null)
    try {
      const res = await api.authorize(getRegion(), getCart(), addr)
      setResult(res)
      if (res.state === 'CONFIRMATION_REQUIRED') setStep('confirmation')
      else if (res.state === 'AUTHORIZED') setStep('paying')
    } catch (e) {
      setErr(e.message); setStep('address')
    }
  }

  const fakePay = async () => {
    // Stripe is wired but for MVP w/o frontend Stripe Elements, we just mark Paid via the confirm endpoint.
    try {
      await api.confirmPayment(result.order_id)
      clearCart()
      nav(`/orders/${result.order_id}`)
    } catch (e) { setErr(e.message) }
  }

  if (step === 'address') {
    return (
      <div className="container" style={{ maxWidth: 540 }}>
        <h1 className="page-title">Shipping</h1>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={submit} className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label>Full name</label><input required value={addr.name} onChange={e => setAddr({...addr, name: e.target.value})} /></div>
            <div><label>Address</label><input required value={addr.line1} onChange={e => setAddr({...addr, line1: e.target.value})} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
              <div><label>City</label><input required value={addr.city} onChange={e => setAddr({...addr, city: e.target.value})} /></div>
              <div><label>State / Region</label><input value={addr.state} onChange={e => setAddr({...addr, state: e.target.value})} /></div>
              <div><label>ZIP / Postcode</label><input required value={addr.zip} onChange={e => setAddr({...addr, zip: e.target.value})} /></div>
            </div>
            <div><label>Country</label><input value={addr.country} readOnly /></div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: '12px 20px' }}>
            Continue → Verify live vendor price
          </button>
        </form>
      </div>
    )
  }

  if (step === 'verifying') {
    return (
      <div className="container" style={{ maxWidth: 540 }}>
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 30, marginBottom: 14 }}>✓</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Verifying current vendor price…</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>
            We're calling AliExpress right now to confirm the price before charging your card.
          </div>
        </div>
      </div>
    )
  }

  if (step === 'confirmation' && result) {
    const drifted = result.verification.filter(v => v.outcome !== 'Verified')
    return (
      <div className="container" style={{ maxWidth: 600 }}>
        <h1 className="page-title">Vendor prices changed</h1>
        <div className="alert alert-warn">
          Some items in your cart have drifted from our last index. Review and confirm to continue.
        </div>
        <div className="card">
          {drifted.map(v => (
            <div key={v.product_id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Outcome: {v.outcome}</div>
              <div style={{ fontSize: 13 }}>Was: ${v.snapshot_cost?.toFixed(2)} · Now: {v.live_cost ? '$' + v.live_cost.toFixed(2) : '—'}
                {v.drift_pct != null && <span style={{
                  marginLeft: 8, color: v.drift_pct > 0 ? 'var(--gold)' : 'var(--emerald)', fontWeight: 700,
                }}>{(v.drift_pct * 100).toFixed(1)}%</span>}
              </div>
            </div>
          ))}
          <button className="btn btn-primary" onClick={submit} style={{ width: '100%', marginTop: 16, padding: '12px 20px' }}>
            Accept new prices and re-verify
          </button>
        </div>
      </div>
    )
  }

  // step === 'paying' (AUTHORIZED — Stripe PaymentIntent ready)
  return (
    <div className="container" style={{ maxWidth: 540 }}>
      <h1 className="page-title">Payment</h1>
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)',
            textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
            Final Tally
          </div>
          <PriceBreakdown pricing={result.totals} />
        </div>
        <div className="alert alert-info" style={{ fontSize: 12 }}>
          {result.stripe_client_secret
            ? <>Stripe PaymentIntent created (id: {result.stripe_client_secret.split('_secret_')[0]}). For MVP demo, click below to simulate successful card payment.</>
            : <>No Stripe key configured. Demo mode — click below to simulate payment.</>}
        </div>
        {err && <div className="alert alert-error">{err}</div>}
        <button className="btn btn-primary" onClick={fakePay} style={{ width: '100%', padding: '14px 20px' }}>
          Confirm payment ({result.totals.currency_symbol}{result.totals.grand_total.toFixed(2)})
        </button>
      </div>
    </div>
  )
}
