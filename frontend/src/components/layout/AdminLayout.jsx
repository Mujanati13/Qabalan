import { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Avatar,
  Space,
  Switch,
  Breadcrumb,
  Tag,
} from "antd";
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
  GiftOutlined,
  MessageOutlined,
  TeamOutlined,
  FileDoneOutlined,
  ShopOutlined,
  CalculatorOutlined,
  TruckOutlined,
  ToolOutlined,
  CrownOutlined,
  DatabaseOutlined,
  PercentageOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../contexts/LanguageContext";
import NotificationBell from "../common/NotificationBell";
import OrdersBadge from "../notifications/OrdersBadge";
import "./AdminLayout.css";

const { Header, Sider, Content } = Layout;

const AdminLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout, hasPermission, hasAnyPermission } = useAuth();
  const { language, changeLanguage, t, isRTL } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if screen is mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(false);
        setMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleLanguageChange = (checked) => {
    changeLanguage(checked ? "ar" : "en");
  };

  const toggleMobileMenu = () => {
    setMobileOpen(!mobileOpen);
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const handleMenuClick = (e) => {
    // Handle navigation
    navigate(e.key);
    
    // Close mobile menu after navigation
    if (isMobile) {
      closeMobileMenu();
    }
  };

  // Menu items with permission checks
  const getMenuItems = () => {
    const items = [
      // Dashboard - Always visible
      {
        key: "/dashboard",
        icon: <DashboardOutlined />,
        label: <Link to="/dashboard">{t("nav.dashboard")}</Link>,
        show: true,
      },
    ];

    // E-COMMERCE SECTION
    const ecommerceChildren = [];

    // Products & Categories
    if (
      user?.user_type === "admin" ||
      hasAnyPermission(["products.view", "categories.view"])
    ) {
      if (
        user?.user_type === "admin" ||
        hasAnyPermission([
          "products.view",
          "products.create",
          "products.edit",
          "products.delete",
        ])
      ) {
        ecommerceChildren.push({
          key: "/products",
          icon: <AppstoreOutlined />,
          label: <Link to="/products">{t("nav.products")}</Link>,
        });
      }

      if (
        user?.user_type === "admin" ||
        hasAnyPermission([
          "categories.view",
          "categories.create",
          "categories.edit",
          "categories.delete",
        ])
      ) {
        ecommerceChildren.push({
          key: "/categories",
          icon: <TagOutlined />,
          label: <Link to="/categories">{t("nav.categories")}</Link>,
        });
      }
    }

    // Orders
    if (
      user?.user_type === "admin" ||
      hasAnyPermission(["orders.view", "orders.edit", "orders.delete"])
    ) {
      ecommerceChildren.push({
        key: "/orders",
        icon: <FileTextOutlined />,
        label: <OrdersBadge>{t("nav.orders")}</OrdersBadge>,
      });
    }

    // Invoices
    if (
      user?.user_type === "admin" ||
      hasAnyPermission([
        "invoices.view",
        "invoices.generate",
        "invoices.export",
      ])
    ) {
      ecommerceChildren.push({
        key: "/invoices",
        icon: <CalculatorOutlined />,
        label: <Link to="/invoices">{t("nav.invoices")}</Link>,
      });
    }

    // Add E-commerce Group if has children
    if (ecommerceChildren.length > 0) {
      items.push({
        key: "ecommerce-group",
        icon: <ShoppingOutlined />,
        label: "E-commerce",
        children: ecommerceChildren,
      });
    }

    // CUSTOMER MANAGEMENT SECTION
    const customerChildren = [];

    // Users/Customers
    if (
      user?.user_type === "admin" ||
      hasAnyPermission([
        "users.view",
        "users.create",
        "users.edit",
        "users.delete",
      ])
    ) {
      customerChildren.push({
        key: "/users",
        icon: <UserOutlined />,
        label: <Link to="/users">{t("nav.users")}</Link>,
      });
    }

    // Support
    if (
      user?.user_type === "admin" ||
      hasAnyPermission(["support.view", "support.respond", "support.manage"])
    ) {
      customerChildren.push({
        key: "/support",
        icon: <MessageOutlined />,
        label: <Link to="/support">{t("nav.support")}</Link>,
      });
    }

    // Add Customer Management Group if has children
    if (customerChildren.length > 0) {
      items.push({
        key: "customer-group",
        icon: <CrownOutlined />,
        label: "Customer Management",
        children: customerChildren,
      });
    }

    // MARKETING SECTION
    const marketingChildren = [];

    // Promo codes
    if (
      user?.user_type === "admin" ||
      hasAnyPermission([
        "promos.view",
        "promos.create",
        "promos.edit",
        "promos.delete",
      ])
    ) {
      marketingChildren.push({
        key: "/promos",
        icon: <PercentageOutlined />,
        label: <Link to="/promos">{t("nav.promos")}</Link>,
      });
    }

    // Offers Management
    if (
      user?.user_type === "admin" ||
      hasAnyPermission(["offers.view", "offers.create", "offers.edit", "offers.delete"])
    ) {
      marketingChildren.push({
        key: "/offers",
        icon: <GiftOutlined />,
        label: <Link to="/offers">{t("nav.offers")}</Link>,
      });
    }

    // Notifications
    if (
      user?.user_type === "admin" ||
      hasAnyPermission([
        "notifications.view",
        "notifications.create",
        "notifications.send",
      ])
    ) {
      marketingChildren.push({
        key: "/notifications",
        icon: <BellOutlined />,
        label: <Link to="/notifications">{t("nav.notifications")}</Link>,
      });
    }

    // Add Marketing Group if has children
    if (marketingChildren.length > 0) {
      items.push({
        key: "marketing-group",
        icon: <BarChartOutlined />,
        label: "Marketing",
        children: marketingChildren,
      });
    }

    // SYSTEM ADMINISTRATION SECTION
    const systemChildren = [];

    // Staff Management - Only for admins or users with staff permissions
    if (
      user?.user_type === "admin" ||
      hasAnyPermission([
        "staff.view",
        "staff.create",
        "staff.edit",
        "roles.view",
        "roles.create",
        "roles.edit",
      ])
    ) {
      systemChildren.push({
        key: "/staff",
        icon: <TeamOutlined />,
        label: <Link to="/staff">{t("nav.staff")}</Link>,
      });
    }

    // Shipping Zones - Only for admins
    if (user?.user_type === "admin") {
      systemChildren.push({
        key: "/shipping-zones",
        icon: <TruckOutlined />,
        label: <Link to="/shipping-zones">{t("nav.shipping_zones")}</Link>,
      });
    }

    // Branches - Only for admins
    if (user?.user_type === "admin") {
      systemChildren.push({
        key: "/branches",
        icon: <ShopOutlined />,
        label: <Link to="/branches">{t("nav.branches")}</Link>,
      });
    }

    // Locations Management - Only for admins
    if (user?.user_type === "admin") {
      systemChildren.push({
        key: "/locations",
        icon: <EnvironmentOutlined />,
        label: <Link to="/locations">{t("nav.locations")}</Link>,
      });
    }

    // Add System Administration Group if has children
    if (systemChildren.length > 0) {
      items.push({
        key: "system-group",
        icon: <DatabaseOutlined />,
        label: "System Administration",
        children: systemChildren,
      });
    }

    // CONFIGURATION SECTION (Only for admins)
    const configChildren = [];

    // // Settings - Only for admins
    // if (user?.user_type === "admin") {
    //   configChildren.push({
    //     key: "/settings",
    //     icon: <ToolOutlined />,
    //     label: <Link to="/settings">{t("nav.settings")}</Link>,
    //   });
    // }

    // Web Client Configuration - Coming Soon
    if (user?.user_type === "admin") {
      configChildren.push({
        key: "/web-client-config",
        icon: <GlobalOutlined />,
        label: (
          <Link to="/web-client-config">
            Web Client Config <Tag color="orange" style={{ marginLeft: 8, fontSize: 10 }}>Soon</Tag>
          </Link>
        ),
      });
    }

    // Add Configuration Group if has children
    if (configChildren.length > 0) {
      items.push({
        key: "config-group",
        icon: <SettingOutlined />,
        label: "Configuration",
        children: configChildren,
      });
    }

    return items.filter(Boolean);
  };

  const menuItems = getMenuItems();

  // User dropdown menu
  const userMenuItems = [
    {
      key: "profile",
      icon: <ProfileOutlined />,
      label: <Link to="/profile">{t("nav.profile")}</Link>,
    },
    {
      key: "divider",
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t("nav.logout"),
      onClick: handleLogout,
    },
  ];

  // Get current menu key and open keys for submenus
  const getCurrentKey = () => {
    return location.pathname;
  };

  // Get default open keys for submenus based on current path
  const getDefaultOpenKeys = () => {
    const path = location.pathname;
    const openKeys = [];

    // E-commerce routes
    if (["/products", "/categories", "/orders", "/invoices"].includes(path)) {
      openKeys.push("ecommerce-group");
    }
    // Customer management routes
    else if (["/users", "/support"].includes(path)) {
      openKeys.push("customer-group");
    }
    // Marketing routes
    else if (["/promos", "/offers", "/notifications"].includes(path)) {
      openKeys.push("marketing-group");
    }
    // System administration routes
    else if (["/staff", "/shipping-zones", "/branches", "/locations"].includes(path)) {
      openKeys.push("system-group");
    }
    // Configuration routes
    else if (["/settings", "/web-client-config"].includes(path)) {
      openKeys.push("config-group");
    }

    return openKeys;
  };

  // Generate breadcrumb items
  const getBreadcrumbItems = () => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const breadcrumbItems = [
      {
        title: <Link to="/dashboard">{t("nav.dashboard")}</Link>,
      },
    ];

    if (pathSegments.length > 1) {
      pathSegments.forEach((segment, index) => {
        if (segment !== "dashboard") {
          const path = "/" + pathSegments.slice(0, index + 1).join("/");
          breadcrumbItems.push({
            title: <Link to={path}>{t(`nav.${segment}`)}</Link>,
          });
        }
      });
    }

    return breadcrumbItems;
  };

  const layoutStyle = {
    minHeight: "100vh",
    direction: isRTL ? "rtl" : "ltr",
  };

  const headerStyle = {
    padding: "0 16px",
    background: "#fff",
    borderBottom: "1px solid #f0f0f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  };

  const headerLeftStyle = {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  };

  const headerRightStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const logoStyle = {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#1890ff",
    margin: 0,
  };

  const siderStyle = {
    position: isMobile ? "fixed" : "relative",
    left: isMobile && !mobileOpen ? "-256px" : "0",
    top: isMobile ? "0" : "0",
    height: isMobile ? "100%" : "100%",
    zIndex: isMobile ? 1001 : "auto",
    transition: "left 0.3s ease",
    overflow: "auto",
  };

  const contentStyle = {
    padding: "24px",
    background: "#f5f5f5",
    minHeight: "100%",
    overflow: "auto",
  };

  const overlayStyle = {
    position: "fixed",
    top: "64px",
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
    display: isMobile && mobileOpen ? "block" : "none",
  };

  const siderHeaderStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "64px",
    background: "#ffffff",
    color: "#1890ff",
    fontSize: "18px",
    fontWeight: "bold",
    borderBottom: "1px solid #f0f0f0",
  };

  const languageSwitchStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const userInfoStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  };

  const mobileMenuButtonStyle = {
    border: "none",
    background: "transparent",
    fontSize: "18px",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

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

          <h1 style={logoStyle}>Qabalan Admin</h1>

          {!isMobile && (
            <Breadcrumb
              items={getBreadcrumbItems()}
              style={{ marginLeft: "24px" }}
            />
          )}
        </div>

        <div style={headerRightStyle}>
          {/* Language Switch */}
          <div style={languageSwitchStyle}>
            {!isMobile && <span style={{ fontSize: "14px" }}>EN</span>}
            <Switch
              checked={language === "ar"}
              onChange={handleLanguageChange}
              size="small"
            />
            {!isMobile && <span style={{ fontSize: "14px" }}>عربي</span>}
          </div>

          {/* Notifications */}
          <NotificationBell />

          {/* User Dropdown */}
          <Dropdown
            menu={{ items: userMenuItems }}
            placement={isRTL ? "bottomLeft" : "bottomRight"}
          >
            <div style={userInfoStyle}>
              <Avatar size="small" icon={<UserOutlined />} src={user?.avatar} />
              {!isMobile && (
                <span style={{ fontSize: "14px", fontWeight: 500 }}>
                  {user?.first_name} {user?.last_name}
                </span>
              )}
            </div>
          </Dropdown>
        </div>
      </Header>

      {/* Main Layout with Sidebar and Content */}
      <Layout style={{ height: "calc(100vh - 64px)" }}>
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
            defaultOpenKeys={getDefaultOpenKeys()}
            items={menuItems}
            style={{ border: 0 }}
            onClick={handleMenuClick}
          />
        </Sider>

        {/* Content */}
        <Content style={contentStyle}>{children}</Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
