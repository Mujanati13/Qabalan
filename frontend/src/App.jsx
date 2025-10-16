import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Spin, Result, Button } from 'antd'

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
// import WebClientConfiguration from './pages/WebClientConfiguration'
import LocationManagement from './pages/LocationManagement'
import PaymentReturn from './pages/PaymentReturn'
import PaymentCheckout from './pages/PaymentCheckout'
import MPGSCheckout from './pages/MPGSCheckout'

// Placeholder pages
const Inventory = () => <div>Inventory Page - Coming Soon</div>
const Reports = () => <div>Reports Page - Coming Soon</div>

const WebClientConfiguration = () => (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '70vh',
    textAlign: 'center'
  }}>
    <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</h1>
    <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Web Client Configuration</h2>
    <p style={{ fontSize: '16px', color: '#999' }}>Coming Soon</p>
    <p style={{ fontSize: '14px', color: '#666', maxWidth: '400px', marginTop: '16px' }}>
      Advanced web client configuration settings will be available soon. This will include customization options for your website appearance and behavior.
    </p>
  </div>
)

// Protected Route Component
const ProtectedRoute = ({ children, requiredPermissions = null }) => {
  const { user, loading, hasPermission, hasAnyPermission } = useAuth()
  const navigate = useNavigate()

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

  // Check permissions if required (admins bypass this check)
  if (requiredPermissions && user.user_type !== 'admin') {
    const hasAccess = Array.isArray(requiredPermissions)
      ? hasAnyPermission(requiredPermissions)
      : hasPermission(requiredPermissions);
    
    if (!hasAccess) {
      return (
        <AdminLayout>
          <Result
            status="403"
            title="403"
            subTitle="Sorry, you don't have permission to access this page."
            extra={
              <Button type="primary" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            }
          />
        </AdminLayout>
      );
    }
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
          <ProtectedRoute requiredPermissions={['products.view', 'products.create', 'products.edit', 'products.delete']}>
            <AdminLayout>
              <Products />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/categories" element={
          <ProtectedRoute requiredPermissions={['categories.view', 'categories.create', 'categories.edit', 'categories.delete']}>
            <AdminLayout>
              <Categories />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/orders" element={
          <ProtectedRoute requiredPermissions={['orders.view', 'orders.edit', 'orders.delete']}>
            <AdminLayout>
              <Orders />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute requiredPermissions={['users.view', 'users.create', 'users.edit', 'users.delete']}>
            <AdminLayout>
              <Customers />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/promos" element={
          <ProtectedRoute requiredPermissions={['promos.view', 'promos.create', 'promos.edit', 'promos.delete']}>
            <AdminLayout>
              <PromoCodes />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/offers" element={
          <ProtectedRoute requiredPermissions={['promos.view', 'promos.create', 'promos.edit', 'promos.delete']}>
            <AdminLayout>
              <OffersManagement />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/notifications" element={
          <ProtectedRoute requiredPermissions={['notifications.view', 'notifications.create', 'notifications.send']}>
            <AdminLayout>
              <Notifications />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/notification-test" element={
          <ProtectedRoute requiredPermissions={['notifications.view', 'notifications.create']}>
            <AdminLayout>
              <NotificationTestPage />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/inventory" element={
          <ProtectedRoute requiredPermissions={['inventory.view', 'inventory.edit']}>
            <AdminLayout>
              <Inventory />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute requiredPermissions={['reports.view', 'reports.generate']}>
            <AdminLayout>
              <Reports />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute requiredPermissions={['settings.view', 'settings.edit']}>
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
          <ProtectedRoute requiredPermissions={['support.view', 'support.respond', 'support.manage']}>
            <AdminLayout>
              <Support />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/invoices" element={
          <ProtectedRoute requiredPermissions={['invoices.view', 'invoices.generate', 'invoices.export']}>
            <AdminLayout>
              <InvoiceManagement />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/staff" element={
          <ProtectedRoute requiredPermissions={['staff.view', 'staff.create', 'staff.edit', 'roles.view', 'roles.create', 'roles.edit']}>
            <AdminLayout>
              <StaffManagement />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/shipping-zones" element={
          <ProtectedRoute requiredPermissions={['settings.view', 'settings.edit']}>
            <AdminLayout>
              <ShippingZoneManagement />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/branches" element={
          <ProtectedRoute requiredPermissions={['settings.view', 'settings.edit']}>
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
          <ProtectedRoute requiredPermissions={['settings.view', 'settings.edit']}>
            <AdminLayout>
              <LocationManagement />
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* Payment Return Page */}
        <Route path="/payment-return" element={
          <ProtectedRoute>
            <AdminLayout>
              <PaymentReturn />
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* MPGS Checkout Page */}
        <Route path="/payment-checkout" element={
          <ProtectedRoute>
            <AdminLayout>
              <PaymentCheckout />
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
