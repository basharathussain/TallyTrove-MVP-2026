import { useEffect, useState } from 'react'
import api from '../api'

const STATUSES = ['Sourcing', 'Ordered', 'Shipped', 'Delivered', 'Cancelled']

export default function VendorOrders() {
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const load = () => api.vendorOrders().then(setOrders).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const update = async (id, patch) => {
    try { await api.updateVendorOrder(id, patch); setMsg(`PO ${id.slice(0,8)} updated`); load() }
    catch (e) { setErr(e.message) }
  }

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 20 }}>Vendor Orders</h1>
      {err && <div className="alert alert-error">{err}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div style={{ display: 'flex', gap: 20 }}>
        <div className="card" style={{ flex: 1, padding: 0 }}>
          <table>
            <thead><tr><th>VO ID</th><th>Vendor</th><th>Title</th><th>Cost (USD)</th><th>Pmt</th><th>Status</th></tr></thead>
            <tbody>
              {orders.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No vendor orders</td></tr>
                : orders.map(vo => (
                  <tr key={vo.id} onClick={() => setSelected(vo)} style={{ cursor: 'pointer',
                    background: selected?.id === vo.id ? 'rgba(16,185,129,.05)' : 'transparent' }}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{vo.id.slice(0,8)}</td>
                    <td>{vo.vendor_name}</td>
                    <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vo.title_snapshot}</td>
                    <td style={{ fontFamily: 'monospace' }}>${vo.quoted_cost.toFixed(2)} × {vo.quantity}</td>
                    <td><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8,
                      background: vo.payment_status === 'Paid' ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)',
                      color: vo.payment_status === 'Paid' ? 'var(--emerald)' : 'var(--gold)' }}>{vo.payment_status}</span></td>
                    <td>{vo.fulfillment_status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {selected && <Detail vo={selected} onClose={() => setSelected(null)} onUpdate={update} />}
      </div>
    </div>
  )
}

function Detail({ vo, onClose, onUpdate }) {
  const [vendor_order_id, setVOI] = useState(vo.vendor_order_id || '')
  const [tracking_number, setTN] = useState(vo.tracking_number || '')
  const [fulfillment_status, setFS] = useState(vo.fulfillment_status)
  const [tcheckpoint, setTC] = useState('')
  const [tlocation, setTL] = useState('')

  return (
    <div className="card" style={{ width: 380, minWidth: 360, alignSelf: 'flex-start' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontWeight: 700 }}>Vendor Order</span>
        <button className="btn btn-sm btn-secondary" onClick={onClose}>✕</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
        <div><strong>{vo.vendor_name}</strong></div>
        <div style={{ marginTop: 4 }}>{vo.title_snapshot}</div>
        <div style={{ marginTop: 8 }}>Quoted: ${vo.quoted_cost.toFixed(2)} × {vo.quantity}</div>
        <div>Agency fee: ${vo.agency_fee.toFixed(2)} · Ship: ${vo.shipping_cost.toFixed(2)}</div>
        <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 6 }}>
          <strong>Ship to:</strong><br/>
          {vo.shipping_destination?.name}<br/>
          {vo.shipping_destination?.line1}<br/>
          {vo.shipping_destination?.city}, {vo.shipping_destination?.state} {vo.shipping_destination?.zip}<br/>
          {vo.shipping_destination?.country}
        </div>
        {vo.product_source_url && (
          <div style={{ marginTop: 8 }}>
            <a href={vo.product_source_url} target="_blank" rel="noreferrer"
              style={{ color: 'var(--emerald)', wordBreak: 'break-all', fontSize: 11 }}>
              Open AliExpress ↗
            </a>
          </div>
        )}
      </div>

      <div className="form-row"><label>Supplier Order ID</label>
        <input value={vendor_order_id} onChange={e => setVOI(e.target.value)} placeholder="AliExpress receipt ID" />
      </div>
      <div className="form-row"><label>Tracking Number</label>
        <input value={tracking_number} onChange={e => setTN(e.target.value)} placeholder="LN…" />
      </div>
      <div className="form-row"><label>Fulfillment Status</label>
        <select value={fulfillment_status} onChange={e => setFS(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
        onClick={() => onUpdate(vo.id, { vendor_order_id, tracking_number, fulfillment_status })}>Save changes</button>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0 12px' }} />

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Append Tracking Log</div>
      <div className="form-row"><label>Checkpoint</label>
        <input value={tcheckpoint} onChange={e => setTC(e.target.value)} placeholder="Shipped from Shenzhen warehouse" />
      </div>
      <div className="form-row"><label>Location</label>
        <input value={tlocation} onChange={e => setTL(e.target.value)} placeholder="Shenzhen, CN" />
      </div>
      <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
        onClick={async () => {
          if (!tcheckpoint) return
          await api.appendTracking(vo.id, { checkpoint_description: tcheckpoint, location_string: tlocation })
          setTC(''); setTL('')
        }}>Append</button>
    </div>
  )
}
