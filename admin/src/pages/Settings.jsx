import { useState } from 'react'
import api from '../api'

export default function Settings() {
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const runFx = async () => {
    setBusy(true); setErr(null)
    try { await api.triggerFx(); setMsg('FX rate refreshed from exchangerate-api.com') } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const runIndex = async () => {
    setBusy(true); setErr(null)
    try { const r = await api.triggerIndex(); setMsg(r.message) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 20 }}>Settings</h1>
      {err && <div className="alert alert-error">{err}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Layer 1 — Background Indexer</h3>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Crawls AliExpress for ~50 seed terms, populates the catalog. Normally runs daily via cron — trigger it manually here.
          </p>
          <button className="btn btn-primary" onClick={runIndex} disabled={busy}>↻ Run indexer now</button>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>FX Rate</h3>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            USD → GBP conversion used at display + checkout. Pulled from exchangerate-api.com daily.
          </p>
          <button className="btn btn-primary" onClick={runFx} disabled={busy}>↻ Refresh FX rate</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Architecture</h3>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text)' }}>Layer 1 — Indexer:</strong> Cron-driven catalog crawl. Writes to <code>products</code>.<br/>
          <strong style={{ color: 'var(--text)' }}>Layer 2 — Search:</strong> Customer search hits Postgres FTS. <em>No vendor calls.</em><br/>
          <strong style={{ color: 'var(--text)' }}>Layer 3 — Verification:</strong> One live Scrapfly call per cart authorize. Logs to <code>product_verification_history</code>.<br/>
        </div>
      </div>
    </div>
  )
}
