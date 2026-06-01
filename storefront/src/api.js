const TOKEN_KEY = 'tt_token'
const USER_KEY = 'tt_user'
const REGION_KEY = 'tt_region'
const CART_KEY = 'tt_cart'

export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function setAuth(t, u) {
  localStorage.setItem(TOKEN_KEY, t)
  localStorage.setItem(USER_KEY, JSON.stringify(u))
  if (u?.region_code) localStorage.setItem(REGION_KEY, u.region_code)
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
}
export function getRegion() { return localStorage.getItem(REGION_KEY) || 'US' }
export function setRegion(r) { localStorage.setItem(REGION_KEY, r) }

export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || [] } catch { return [] }
}
export function setCart(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)) }
export function clearCart() { localStorage.removeItem(CART_KEY) }
export function addToCart(product_id, quantity = 1) {
  const items = getCart()
  const existing = items.find(i => i.product_id === product_id)
  if (existing) existing.quantity += quantity
  else items.push({ product_id, quantity })
  setCart(items)
  return items
}
export function updateCartQty(product_id, quantity) {
  const items = getCart().map(i => i.product_id === product_id ? { ...i, quantity } : i).filter(i => i.quantity > 0)
  setCart(items)
  return items
}
export function removeFromCart(product_id) {
  const items = getCart().filter(i => i.product_id !== product_id)
  setCart(items)
  return items
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(path, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    clearAuth()
    if (!['/login', '/signup'].includes(window.location.pathname)) {
      window.location.href = '/login'
    }
    throw new Error('Authentication required')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail))
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  signup: (data) => request('POST', '/api/auth/signup', data),

  search: (q, region) => request('GET', `/api/catalog/search?q=${encodeURIComponent(q)}&region=${region}`),
  trending: (region) => request('GET', `/api/catalog/trending?region=${region}`),
  product: (id, region) => request('GET', `/api/catalog/products/${id}?region=${region}`),

  previewCart: (region_code, items) => request('POST', '/api/checkout/preview', { region_code, items }),
  authorize: (region_code, items, shipping_destination) =>
    request('POST', '/api/checkout/authorize', { region_code, items, shipping_destination }),
  confirmPayment: (order_id) => request('POST', `/api/checkout/confirm-payment/${order_id}`),

  myOrders: () => request('GET', '/api/orders'),
  myOrder: (id) => request('GET', `/api/orders/${id}`),
  tracking: (vendor_order_id) => request('GET', `/api/orders/vendor-order/${vendor_order_id}/tracking`),
}

export default api
