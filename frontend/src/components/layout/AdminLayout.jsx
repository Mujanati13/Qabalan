import { useState, useEffect } from 'react'
import { Layout, Menu, Button, Dropdown, Avatar, Space, Switch, Breadcrumb } from 'antd'
import { 
  DashboardOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  UserOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  GlobalOutlined,
  ProfileOutlined,
  TagOutlined,
  MessageOutlined,
  TeamOutlined,
  FileDoneOutlined,
  ShopOutlined,
  CalculatorOutlined
} from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../contexts/LanguageContext'
import NotificationBell from '../common/NotificationBell'

const { Header, Sider, Content } = Layout

const AdminLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { user, logout, hasPermission, hasAnyPermission } = useAuth()
  const { language, changeLanguage, t, isRTL } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()

  // Check if screen is mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 992
      setIsMobile(mobile)
      if (mobile) {
        setCollapsed(false)
        setMobileOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleLanguageChange = (checked) => {
    changeLanguage(checked ? 'ar' : 'en')
  }

  const toggleMobileMenu = () => {
    setMobileOpen(!mobileOpen)
  }

  const closeMobileMenu = () => {
    setMobileOpen(false)
  }

  // Menu items with permission checks
  const getMenuItems = () => {
    const items = [
      // Dashboard - Always visible
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: <Link to="/dashboard">{t('nav.dashboard')}</Link>,
        show: true
      }
    ];

    // E-COMMERCE SECTION
    const ecommerceItems = [];
    
    // Products & Categories
    if (user?.user_type === 'admin' || hasAnyPermission(['products.view', 'categories.view'])) {
      ecommerceItems.push({
        key: 'products-group',
        icon: <ShopOutlined />,
        label: t('nav.products'),
        show: true,
        children: [
          {
            key: '/products',
            label: <Link to="/products">{t('nav.products')}</Link>,
            show: user?.user_type === 'admin' || hasAnyPermission(['products.view', 'products.create', 'products.edit', 'products.delete'])
          },
          {
            key: '/categories',
            label: <Link to="/categories">{t('nav.categories')}</Link>,
            show: user?.user_type === 'admin' || hasAnyPermission(['categories.view', 'categories.create', 'categories.edit', 'categories.delete'])
          }
        ]
      });
    }

    // Orders
    if (user?.user_type === 'admin' || hasAnyPermission(['orders.view', 'orders.edit', 'orders.delete'])) {
      ecommerceItems.push({
        key: '/orders',
        icon: <FileTextOutlined />,
        label: <Link to="/orders">{t('nav.orders')}</Link>,
        show: true
      });
    }

    // Invoices
    if (user?.user_type === 'admin' || hasAnyPermission(['invoices.view', 'invoices.generate', 'invoices.export'])) {
      ecommerceItems.push({
        key: '/invoices',
        icon: <CalculatorOutlined />,
        label: <Link to="/invoices">{t('nav.invoices')}</Link>,
        show: true
      });
    }

    // Add e-commerce items to main menu
    items.push(...ecommerceItems);

    // CUSTOMER MANAGEMENT SECTION
    const customerItems = [];

    // Users/Customers
    if (user?.user_type === 'admin' || hasAnyPermission(['users.view', 'users.create', 'users.edit', 'users.delete'])) {
      customerItems.push({
        key: '/users',
        icon: <UserOutlined />,
        label: <Link to="/users">{t('nav.users')}</Link>,
        show: true
      });
    }

    // Support
    if (user?.user_type === 'admin' || hasAnyPermission(['support.view', 'support.respond', 'support.manage'])) {
      customerItems.push({
        key: '/support',
        icon: <MessageOutlined />,
        label: <Link to="/support">{t('nav.support')}</Link>,
        show: true
      });
    }

    // Add customer management items
    items.push(...customerItems);

    // MARKETING SECTION
    const marketingItems = [];

    // Promo codes
    if (user?.user_type === 'admin' || hasAnyPermission(['promos.view', 'promos.create', 'promos.edit', 'promos.delete'])) {
      marketingItems.push({
        key: '/promos',
        icon: <TagOutlined />,
        label: <Link to="/promos">{t('nav.promos')}</Link>,
        show: true
      });
    }

    // Notifications
    if (user?.user_type === 'admin' || hasAnyPermission(['notifications.view', 'notifications.create', 'notifications.send'])) {
      marketingItems.push({
        key: '/notifications',
        icon: <BellOutlined />,
        label: <Link to="/notifications">{t('nav.notifications')}</Link>,
        show: true
      });
    }

    // Add marketing items
    items.push(...marketingItems);

    // ADMINISTRATION SECTION
    const adminItems = [];

    // Staff Management - Only for admins or users with staff permissions
    if (user?.user_type === 'admin' || hasAnyPermission(['staff.view', 'staff.create', 'staff.edit', 'roles.view', 'roles.create', 'roles.edit'])) {
      adminItems.push({
        key: '/staff',
        icon: <TeamOutlined />,
        label: <Link to="/staff">{t('nav.staff')}</Link>,
        show: true
      });
    }



    // Settings
    if (user?.user_type === 'admin' || hasAnyPermission(['settings.view', 'settings.edit'])) {
      adminItems.push({
        key: '/settings',
        icon: <SettingOutlined />,
        label: <Link to="/settings">{t('nav.settings')}</Link>,
        show: true
      });
    }

    // Add admin items
    items.push(...adminItems);

    // Filter items based on show property and handle children
    return items.filter(item => item.show).map(item => {
      if (item.children) {
        const visibleChildren = item.children.filter(child => child.show);
        if (visibleChildren.length === 0) return null;
        return { ...item, children: visibleChildren };
      }
      return item;
    }).filter(Boolean);
  };

  const menuItems = getMenuItems();

  // User dropdown menu
  const userMenuItems = [
    {
      key: 'profile',
      icon: <ProfileOutlined />,
      label: <Link to="/profile">{t('nav.profile')}</Link>,
    },
    {
      key: 'divider',
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('nav.logout'),
      onClick: handleLogout,
    },
  ]

  // Get current menu key
  const getCurrentKey = () => {
    if (location.pathname.startsWith('/categories')) return '/categories'
    if (location.pathname.startsWith('/products')) return '/products'
    return location.pathname
  }

  // Generate breadcrumb items
  const getBreadcrumbItems = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbItems = [
      {
        title: <Link to="/dashboard">{t('nav.dashboard')}</Link>,
      },
    ]

    if (pathSegments.length > 1) {
      pathSegments.forEach((segment, index) => {
        if (segment !== 'dashboard') {
          const path = '/' + pathSegments.slice(0, index + 1).join('/')
          breadcrumbItems.push({
            title: <Link to={path}>{t(`nav.${segment}`)}</Link>,
          })
        }
      })
    }

    return breadcrumbItems
  }

  const layoutStyle = {
    minHeight: '100vh',
    direction: isRTL ? 'rtl' : 'ltr'
  }

  const headerStyle = {
    padding: '0 16px',
    background: '#fff',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  }

  const headerLeftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  }

  const headerRightStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  }

  const logoStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1890ff',
    margin: 0
  }

  const siderStyle = {
    position: isMobile ? 'fixed' : 'relative',
    left: isMobile && !mobileOpen ? '-256px' : '0',
    top: isMobile ? '0' : '0',
    height: isMobile ? '100%' : '100%',
    zIndex: isMobile ? 1001 : 'auto',
    transition: 'left 0.3s ease',
    overflow: 'auto'
  }

  const contentStyle = {
    padding: '24px',
    background: '#f5f5f5',
    minHeight: '100%',
    overflow: 'auto'
  }

  const overlayStyle = {
    position: 'fixed',
    top: '64px',
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: isMobile && mobileOpen ? 'block' : 'none'
  }

  const siderHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '64px',
    background: '#ffffff',
    color: '#1890ff',
    fontSize: '18px',
    fontWeight: 'bold',
    borderBottom: '1px solid #f0f0f0'
  }

  const languageSwitchStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

  const userInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  }

  const mobileMenuButtonStyle = {
    border: 'none',
    background: 'transparent',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  return (
    <Layout style={layoutStyle}>
      {/* Mobile Menu Overlay */}
      <div style={overlayStyle} onClick={closeMobileMenu} />

      {/* Header */}
      <Header style={headerStyle}>
        <div style={headerLeftStyle}>
          {isMobile ? (
            <button 
              style={mobileMenuButtonStyle}
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <MenuUnfoldOutlined />
            </button>
          ) : (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              size="large"
            />
          )}
          
          <h1 style={logoStyle}>
            Qabalan Admin
          </h1>
          
          {!isMobile && (
            <Breadcrumb
              items={getBreadcrumbItems()}
              style={{ marginLeft: '24px' }}
            />
          )}
        </div>

        <div style={headerRightStyle}>
          {/* Language Switch */}
          <div style={languageSwitchStyle}>
            {!isMobile && <span style={{ fontSize: '14px' }}>EN</span>}
            <Switch
              checked={language === 'ar'}
              onChange={handleLanguageChange}
              size="small"
            />
            {!isMobile && <span style={{ fontSize: '14px' }}>عربي</span>}
          </div>

          {/* Notifications */}
          <NotificationBell />

          {/* User Dropdown */}
          <Dropdown
            menu={{ items: userMenuItems }}
            placement={isRTL ? 'bottomLeft' : 'bottomRight'}
          >
            <div style={userInfoStyle}>
              <Avatar 
                size="small" 
                icon={<UserOutlined />}
                src={user?.avatar}
              />
              {!isMobile && (
                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                  {user?.first_name} {user?.last_name}
                </span>
              )}
            </div>
          </Dropdown>
        </div>
      </Header>

      {/* Main Layout with Sidebar and Content */}
      <Layout style={{ height: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <Sider 
          trigger={null} 
          collapsible 
          collapsed={!isMobile && collapsed}
          theme="light"
          style={siderStyle}
          width={256}
          collapsedWidth={isMobile ? 256 : 80}
        >
         
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[getCurrentKey()]}
            items={menuItems}
            style={{ border: 0 }}
            onClick={isMobile ? closeMobileMenu : undefined}
          />
        </Sider>

        {/* Content */}
        <Content style={contentStyle}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout