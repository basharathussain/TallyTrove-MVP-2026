const TOKEN_KEY = 'tt_admin_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  if (res.status === 401) { clearToken(); window.location.href = '/login'; throw new Error('Auth required') }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail))
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  summary: () => request('GET', '/api/admin/analytics/summary'),
  profitLedger: () => request('GET', '/api/admin/analytics/profit-ledger'),
  customerOrders: () => request('GET', '/api/admin/customer-orders'),
  vendorOrders: () => request('GET', '/api/admin/vendor-orders'),
  updateVendorOrder: (id, body) => request('PATCH', `/api/admin/vendor-orders/${id}`, body),
  appendTracking: (id, body) => request('POST', `/api/admin/vendor-orders/${id}/tracking-logs`, body),
  products: (q = '') => request('GET', `/api/admin/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  verifications: (only_drift = false) => request('GET', `/api/admin/verifications${only_drift ? '?only_drift=true' : ''}`),
  triggerIndex: () => request('POST', '/api/admin/trigger/index'),
  triggerFx: () => request('POST', '/api/admin/trigger/fx'),
}

export default api
