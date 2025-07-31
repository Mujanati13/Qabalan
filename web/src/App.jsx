import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { CartProvider } from './contexts/CartContext';
import { OrderProvider } from './contexts/OrderContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { TranslationProvider, useTranslation } from './contexts/TranslationContext';
import HomePage from './components/HomePage';
import OffersPageNew from './components/OffersPageNew';
import ProductPageNew from './components/ProductPageNew';
import ProductsPage from './components/ProductsPage';
import CheckoutPage from './components/CheckoutPage';
import OrdersPage from './components/OrdersPage';
import ContactPage from './components/ContactPage';
import LocationsPage from './components/LocationsPage';
import CartDrawer from './components/CartDrawer';
import NotFound from './components/NotFound';
import './index.css';

// Main App Content Component
const AppContent = () => {
  const { getThemeConfig, settings } = useSettings();
  const { isRTL } = useTranslation();

  // Apply custom CSS if provided
  useEffect(() => {
    const customCSS = settings.theme?.customCSS;
    if (customCSS) {
      const styleElement = document.getElementById('custom-styles');
      if (styleElement) {
        styleElement.textContent = customCSS;
      } else {
        const newStyleElement = document.createElement('style');
        newStyleElement.id = 'custom-styles';
        newStyleElement.textContent = customCSS;
        document.head.appendChild(newStyleElement);
      }
    }

    // Apply animation speed CSS variables
    const animationSpeed = settings.theme?.animationSpeed || 0.3;
    document.documentElement.style.setProperty('--animation-speed', `${animationSpeed}s`);

    // Apply RTL direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = isRTL ? 'ar' : 'en';
  }, [settings.theme, isRTL]);

  return (
    <ConfigProvider theme={getThemeConfig()}>
      <CartProvider>
        <OrderProvider>
          <Router>
            <div className="App min-h-screen bg-gray-50">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/offers" element={<OffersPageNew />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/product/:productId" element={<ProductPageNew />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/find-us" element={<LocationsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <CartDrawer />
            </div>
          </Router>
        </OrderProvider>
      </CartProvider>
    </ConfigProvider>
  );
};

function App() {
  return (
    <SettingsProvider>
      <TranslationProvider>
        <AppContent />
      </TranslationProvider>
    </SettingsProvider>
  );
}

export default App;
