export default function PriceBreakdown({ pricing, compact }) {
  if (!pricing) return null
  const fmt = (n) => `${pricing.currency_symbol}${Number(n).toFixed(2)}`

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{fmt(pricing.grand_total)}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>all-in</span>
      </div>
    )
  }

  return (
    <div style={{ fontSize: 12 }}>
      <Row label="Direct Wholesale Cost" value={fmt(pricing.base_cost)} muted />
      <Row label="AI Sourcing & Agency Fee" value={`+ ${fmt(pricing.agency_fee)}`} emphasize />
      <Row label="Pass-Through Shipping" value={`+ ${fmt(pricing.shipping_cost)}`} muted />
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8,
        display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          All-Inclusive Total
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{fmt(pricing.grand_total)}</span>
      </div>
    </div>
  )
}

function Row({ label, value, muted, emphasize }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{
        fontFamily: 'monospace',
        color: emphasize ? 'var(--emerald)' : 'var(--text)',
        fontWeight: emphasize ? 700 : 500,
      }}>{value}</span>
    </div>
  )
}
