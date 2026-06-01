import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'

export default function OrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState(null)
  const [tracking, setTracking] = useState({})

  useEffect(() => {
    api.myOrder(id).then(async (o) => {
      setOrder(o)
      for (const vo of o.vendor_orders) {
        try {
          const t = await api.tracking(vo.id)
          setTracking(prev => ({ ...prev, [vo.id]: t }))
        } catch {}
      }
    }).catch(e => setErr(e.message))
  }, [id])

  if (err) return <div className="container"><div className="alert alert-error">{err}</div></div>
  if (!order) return <div className="container"><div style={{ color: 'var(--muted)' }}>Loading…</div></div>

  const sym = order.currency_symbol

  return (
    <div className="container" style={{ maxWidth: 880 }}>
      <div style={{ marginBottom: 16, color: 'var(--muted)', fontSize: 12 }}>
        Order ID · {order.id} · {new Date(order.created_at).toLocaleString()} · {order.region_code}
      </div>
      <h1 className="page-title">Transparent Invoice</h1>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
          Tally
        </div>
        <Row label="Wholesale Volume" v={`${sym}${order.total_base_cost_display.toFixed(2)}`} />
        <Row label="Agency Sourcing Fee" v={`${sym}${order.total_agency_fee_display.toFixed(2)}`} emphasize />
        <Row label="Pass-Through Shipping" v={`${sym}${order.total_shipping_cost_display.toFixed(2)}`} />
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
          <Row label={`Grand Total Charged · ${order.currency}`}
            v={`${sym}${order.grand_total_display.toFixed(2)}`} big />
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--muted)' }}>
          Payment status: <strong style={{ color: order.payment_status === 'Paid' ? 'var(--emerald)' : 'var(--gold)' }}>
            {order.payment_status}
          </strong> · FX locked at order time: 1 USD = {order.fx_rate_locked} {order.currency}
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Fulfillment Manifest</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {order.vendor_orders.map(vo => (
          <div key={vo.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.05em' }}>Vendor: {vo.vendor_name}</div>
                <div style={{ fontWeight: 600, marginTop: 4, fontSize: 13 }}>{vo.title_snapshot}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Qty: {vo.quantity} {vo.vendor_order_id && `· Supplier ref: ${vo.vendor_order_id}`}
                </div>
              </div>
              <span style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 10,
                background: 'rgba(16,185,129,.1)', color: 'var(--emerald)',
                border: '1px solid rgba(16,185,129,.3)', fontWeight: 600,
              }}>{vo.fulfillment_status}</span>
            </div>
            <Row label="Wholesale Base" v={`${sym}${vo.base_cost.toFixed(2)}`} muted />
            <Row label="Agency Fee" v={`+ ${sym}${vo.agency_fee.toFixed(2)}`} muted />
            <Row label="Shipping" v={`+ ${sym}${vo.shipping_cost.toFixed(2)}`} muted />
            {vo.tracking_number && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 6, fontSize: 12 }}>
                📦 Tracking: <strong>{vo.tracking_number}</strong>
              </div>
            )}
            {tracking[vo.id]?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Shipment timeline:</div>
                <ul style={{ listStyle: 'none', borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>
                  {tracking[vo.id].map(t => (
                    <li key={t.id} style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong>{t.checkpoint_description}</strong>
                      {t.location_string && <span style={{ color: 'var(--muted)' }}> · {t.location_string}</span>}
                      <span style={{ color: 'var(--muted)', marginLeft: 6 }}>{new Date(t.logged_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ label, v, emphasize, big, muted }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: big ? 16 : 13 }}>
      <span style={{ color: muted ? 'var(--muted)' : 'var(--text)' }}>{label}</span>
      <span style={{
        fontFamily: 'monospace',
        color: emphasize ? 'var(--emerald)' : 'var(--text)',
        fontWeight: big ? 800 : (emphasize ? 700 : 500),
      }}>{v}</span>
    </div>
  )
}
