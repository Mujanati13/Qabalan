import React, { useState } from 'react';
import { Layout, Menu, Button, Drawer, Typography, Space, Grid, Badge } from 'antd';
import { MenuOutlined, HomeOutlined, TagsOutlined, ShoppingOutlined, ShoppingCartOutlined, UnorderedListOutlined, PhoneOutlined, EnvironmentOutlined, MailOutlined } from '@ant-design/icons';
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
    if (location.pathname === '/contact') return 'contact';
    if (location.pathname === '/locations' || location.pathname === '/find-us') return 'locations';
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
              style={{ color: appConfig.primaryColor || '#229A95' }}
            >
              {appConfig.siteName || 'Qabalan'}
            </div>
          </div>
        }
        placement={isRTL ? 'right' : 'left'}
        open={mobileMenuVisible}
        onClose={() => setMobileMenuVisible(false)}
        width={280}
      >
        <div className="flex flex-col h-full">
          <Menu
            mode="vertical"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            className="border-none flex-1"
            onClick={() => setMobileMenuVisible(false)}
          />
          
          {/* Mobile Language Switcher */}
          {(languageConfig.languageSwitcherPosition === 'header' || 
            languageConfig.languageSwitcherPosition === 'both') && (
            <div className="mt-4 p-4 border-t">
              <LanguageSwitcher size="large" />
            </div>
          )}
        </div>
      </Drawer>

      <Content style={{ minHeight: 'calc(100vh - 72px - 80px)' }}>
        {children}
      </Content>

      <Footer className="bg-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <Title level={4} style={{ color: appConfig.primaryColor || '#229A95' }}>
                {appConfig.siteName || 'Qabalan'}
              </Title>
              <Text className="text-gray-600">
                {settings.home_page?.heroSubtitle || 'Discover amazing products and exclusive offers'}
              </Text>
            </div>

            {/* Quick Links */}
            <div>
              <Title level={5} className="mb-4">{t('footer.quickLinks')}</Title>
              <Space direction="vertical">
                {menuItems.map(item => (
                  <div key={item.key}>{item.label}</div>
                ))}
              </Space>
            </div>

            {/* Contact Info */}
            {contactConfig.enableContactPage && (
              <div>
                <Title level={5} className="mb-4">{t('footer.contactInfo')}</Title>
                <Space direction="vertical" size="small">
                  {contactConfig.primaryPhone && (
                    <Text className="text-gray-600">
                      <PhoneOutlined className="mr-2" />
                      {contactConfig.primaryPhone}
                    </Text>
                  )}
                  {contactConfig.primaryEmail && (
                    <Text className="text-gray-600">
                      <MailOutlined className="mr-2" />
                      {contactConfig.primaryEmail}
                    </Text>
                  )}
                </Space>
              </div>
            )}
          </div>

          {/* Bottom Footer */}
          <div className="border-t pt-4 flex flex-col md:flex-row justify-between items-center">
            <Text className="text-gray-500">
              {appConfig.footerText || `© ${new Date().getFullYear()} Qabalan. ${t('footer.allRightsReserved')}`}
            </Text>
            
            {/* Footer Language Switcher */}
            {(languageConfig.languageSwitcherPosition === 'footer' || 
              languageConfig.languageSwitcherPosition === 'both') && (
              <div className="mt-4 md:mt-0">
                <LanguageSwitcher />
              </div>
            )}
          </div>
        </div>
      </Footer>
    </Layout>
  );
};

export default AppLayout;
