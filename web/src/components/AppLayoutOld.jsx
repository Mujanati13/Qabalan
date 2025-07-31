import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Drawer, Typography, Space, Grid, Badge } from 'antd';
import { MenuOutlined, HomeOutlined, TagsOutlined, ShoppingOutlined, ShoppingCartOutlined, UnorderedListOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../contexts/TranslationContext';
import LanguageSwitcher from './LanguageSwitcher';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const AppLayout = ({ children, pageConfig = {} }) => {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const { settings } = useSettings();
  const { t, isRTL } = useTranslation();
  
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { getCartItemsCount, toggleCartVisibility } = useCart();

  // Extract settings for easier access
  const appConfig = settings.app_config || {};
  const contactConfig = settings.contact || {};
  const languageConfig = settings.languages || {};

  const getSelectedKey = () => {
    if (location.pathname === '/') return 'home';
    if (location.pathname === '/offers') return 'offers';
    if (location.pathname === '/products') return 'products';
    if (location.pathname === '/orders') return 'orders';
    if (location.pathname.startsWith('/product/')) return 'products';
    return 'home';
  };

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: <Link to="/">{t('nav.home')}</Link>,
    },
    ...(appConfig.showOffers ? [{
      key: 'offers',
      icon: <TagsOutlined />,
      label: <Link to="/offers">{t('nav.offers')}</Link>,
    }] : []),
    ...(appConfig.showProducts ? [{
      key: 'products',
      icon: <ShoppingOutlined />,
      label: <Link to="/products">{t('nav.products')}</Link>,
    }] : []),
    {
      key: 'orders',
      icon: <UnorderedListOutlined />,
      label: <Link to="/orders">{t('nav.orders')}</Link>,
    },
    ...(contactConfig.enableContactPage ? [{
      key: 'contact',
      icon: <PhoneOutlined />,
      label: <Link to="/contact">{t('nav.contact')}</Link>,
    }] : []),
    ...(settings.locations?.enableMap ? [{
      key: 'locations',
      icon: <EnvironmentOutlined />,
      label: <Link to="/locations">{t('nav.findUs')}</Link>,
    }] : []),
  ];

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <Link to="/" className="flex items-center space-x-3 no-underline">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="text-2xl font-bold"
          style={{ color: appConfig.primaryColor || '#229A95' }}
        >
          {appConfig.siteName || 'Qabalan'}
        </motion.div>
      </Link>

      <div className="flex items-center gap-4">
        {/* Language Switcher - Show based on position setting */}
        {(languageConfig.languageSwitcherPosition === 'header' || 
          languageConfig.languageSwitcherPosition === 'both') && (
          <LanguageSwitcher style={{ display: isMobile ? 'none' : 'block' }} />
        )}

        {!isMobile && (
          <Menu
            mode="horizontal"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            style={{ 
              border: 'none', 
              backgroundColor: 'transparent',
              minWidth: 'auto'
            }}
            className="flex-1"
          />
        )}

        <Button
          type="primary"
          icon={<ShoppingCartOutlined />}
          onClick={toggleCartVisibility}
          className="relative"
        >
          {getCartItemsCount() > 0 && (
            <Badge 
              count={getCartItemsCount()} 
              size="small" 
              style={{ 
                position: 'absolute', 
                top: -8, 
                right: -8,
                zIndex: 1
              }} 
            />
          )}
          {!isMobile && `Cart (${getCartItemsCount()})`}
        </Button>

        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileMenuVisible(true)}
          />
        )}
      </div>
    </div>
  );
        {!isMobile ? (
          <Menu
            mode="horizontal"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            className="border-none bg-transparent"
            style={{ 
              fontSize: '16px',
              fontWeight: 500,
            }}
          />
        ) : null}
        
        {/* Cart Button */}
        <Badge count={getCartItemsCount()} size="small">
          <Button
            type="text"
            icon={<ShoppingCartOutlined />}
            onClick={toggleCartVisibility}
            className="text-lg cart-button"
            style={{
              color: appConfig.primaryColor,
              borderColor: appConfig.primaryColor
            }}
          />
        </Badge>
        
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileMenuVisible(true)}
            className="text-lg"
          />
        )}
      </div>
    </div>
  );

  return (
    <Layout className="min-h-screen">
      <Header 
        className="sticky top-0 px-4 md:px-8 shadow-sm bg-white"
        style={{ 
          height: '72px', 
          lineHeight: '72px',
          zIndex: 1000,
          position: 'sticky'
        }}
      >
        <div className="max-w-7xl mx-auto">
          {headerContent}
        </div>
      </Header>

      {/* Mobile Navigation Drawer */}
      <Drawer
        title={
          <div className="flex items-center space-x-2">
            <div 
              className="text-xl font-bold"
              style={{ color: appConfig.primaryColor }}
            >
              {appConfig.siteName}
            </div>
          </div>
        }
        placement="right"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        width={280}
      >
        <Menu
          mode="vertical"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          className="border-none"
          onClick={() => setMobileMenuVisible(false)}
        />
      </Drawer>

      <Content className="flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="min-h-full"
        >
          {children}
        </motion.div>
      </Content>

      <Footer 
        className="text-center bg-gray-100 border-t"
        style={{ 
          color: '#666',
          padding: '24px 16px',
        }}
      >
        <div className="max-w-7xl mx-auto">
          <Space direction="vertical" size="small">
            <div className="text-sm font-medium">
              {appConfig.footerText}
            </div>
            <div className="text-xs text-gray-500">
              Powered by Admin Dashboard Control System
            </div>
          </Space>
        </div>
      </Footer>
    </Layout>
  );
};

export default AppLayout;
