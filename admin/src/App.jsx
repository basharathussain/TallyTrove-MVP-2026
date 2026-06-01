import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getToken } from './api'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CustomerOrders from './pages/CustomerOrders.jsx'
import VendorOrders from './pages/VendorOrders.jsx'
import Products from './pages/Products.jsx'
import Verifications from './pages/Verifications.jsx'
import Settings from './pages/Settings.jsx'

function Require({ children }) { return getToken() ? children : <Navigate to="/login" replace /> }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Require><Layout /></Require>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="customer-orders" element={<CustomerOrders />} />
          <Route path="vendor-orders" element={<VendorOrders />} />
          <Route path="products" element={<Products />} />
          <Route path="verifications" element={<Verifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
