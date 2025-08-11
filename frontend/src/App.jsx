import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Spin } from 'antd'

// Layout Components
import AdminLayout from './components/layout/AdminLayout'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Orders from './pages/Orders'
import Profile from './pages/Profile'
import Customers from './pages/Customers'
import PromoCodes from './pages/PromoCodes'
import Notifications from './pages/Notifications'
import Support from './pages/Support'
import InvoiceManagement from './pages/InvoiceManagement'
import StaffManagement from './pages/StaffManagement'
import Settings from './pages/Settings'
import ShippingZoneManagement from './pages/ShippingZoneManagement'
import NotificationTestPage from './pages/NotificationTestPage'
import Branches from './pages/Branches'
import URLGeneratorDemo from './pages/URLGeneratorDemo'
import OffersManagement from './pages/OffersManagement'
import WebClientConfiguration from './pages/WebClientConfiguration'
import LocationManagement from './pages/LocationManagement'

// Placeholder pages
const Inventory = () => <div>Inventory Page - Coming Soon</div>
const Reports = () => <div>Reports Page - Coming Soon</div>

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.user_type !== 'admin' && user.user_type !== 'staff') {
    return <Navigate to="/login" replace />
  }

  return children
}

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  if (user && (user.user_type === 'admin' || user.user_type === 'staff')) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        {/* Protected Admin Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/products" element={
          <ProtectedRoute>
            <AdminLayout>
              <Products />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/categories" element={
          <ProtectedRoute>
            <AdminLayout>
              <Categories />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/orders" element={
          <ProtectedRoute>
            <AdminLayout>
              <Orders />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute>
            <AdminLayout>
              <Customers />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/promos" element={
          <ProtectedRoute>
            <AdminLayout>
              <PromoCodes />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/offers" element={
          <ProtectedRoute>
            <AdminLayout>
              <OffersManagement />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/notifications" element={
          <ProtectedRoute>
            <AdminLayout>
              <Notifications />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/notification-test" element={
          <ProtectedRoute>
            <AdminLayout>
              <NotificationTestPage />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/inventory" element={
          <ProtectedRoute>
            <AdminLayout>
              <Inventory />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <AdminLayout>
              <Reports />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <AdminLayout>
              <Settings />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <AdminLayout>
              <Profile />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/support" element={
          <ProtectedRoute>
            <AdminLayout>
              <Support />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/invoices" element={
          <ProtectedRoute>
            <AdminLayout>
              <InvoiceManagement />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/staff" element={
          <ProtectedRoute>
            <AdminLayout>
              <StaffManagement />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/shipping-zones" element={
          <ProtectedRoute>
            <AdminLayout>
              <ShippingZoneManagement />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/branches" element={
          <ProtectedRoute>
            <AdminLayout>
              <Branches />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/url-generator-demo" element={
          <ProtectedRoute>
            <AdminLayout>
              <URLGeneratorDemo />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/web-client-config" element={
          <ProtectedRoute>
            <AdminLayout>
              <WebClientConfiguration />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/locations" element={
          <ProtectedRoute>
            <AdminLayout>
              <LocationManagement />
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}

export default App
