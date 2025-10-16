import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useState } from 'react';
import './Header.css';

const Header = () => {
  const { cartCount } = useCart();
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <header className="site-header" role="banner">
      <div className="site-header-flex-wrap">
        {/* Mobile Menu Toggle */}
        <button
          className="site-menu-toggle"
          onClick={toggleMobileMenu}
          aria-expanded={showMobileMenu}
          aria-label="Toggle menu"
        >
          <span className="hamburger-box">
            <span className="hamburger-inner"></span>
          </span>
        </button>

        {/* Logo */}
        <div className="header-logo">
          <Link to="/">
            <img src="/assets/images/1.png" alt="Qabalan Bakery" />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className={`mobile-menu-wrapper ${showMobileMenu ? 'active' : ''}`}>
          {/* Left Navigation */}
          <nav className="primary-navigation">
            <ul className="menu-primary">
              <li className="menu-item">
                <Link to="/shop" onClick={() => setShowMobileMenu(false)}>
                  <span>{t('shop')}</span>
                </Link>
              </li>
              <li className="menu-item">
                <Link to="/story" onClick={() => setShowMobileMenu(false)}>
                  <span>{t('ourStory')}</span>
                </Link>
              </li>
              <li className="menu-item">
                <Link to="/recipes" onClick={() => setShowMobileMenu(false)}>
                  <span>{t('recipes')}</span>
                </Link>
              </li>
              <li className="menu-item">
                <Link to="/offers" onClick={() => setShowMobileMenu(false)}>
                  <span>{t('offers')}</span>
                </Link>
              </li>
              <li className="menu-item">
                <Link to="/news" onClick={() => setShowMobileMenu(false)}>
                  <span>{t('newsEvents')}</span>
                </Link>
              </li>
              <li className="menu-item">
                <a 
                  href="https://export.qabalanbakery.com/en" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <span>{t('forExport')}</span>
                </a>
              </li>
            </ul>
          </nav>

          {/* Right Navigation */}
          <nav className="primary-navigation">
            <ul className="menu-primary">
              <li className="menu-item">
                <Link to="/contact" onClick={() => setShowMobileMenu(false)}>
                  <span>{t('contact')}</span>
                </Link>
              </li>
              {user && (
                <li className="menu-item">
                  <Link to="/account" state={{ activeTab: 'orders' }} onClick={() => setShowMobileMenu(false)}>
                    <span>{t('myOrders')}</span>
                  </Link>
                </li>
              )}
              <li className="menu-item menu-item-icon">
                <Link to="/cart" className="cart-link" onClick={() => setShowMobileMenu(false)}>
                  <svg height="18" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <g>
                      <path d="m16 1a6 6 0 0 0 -6 6v1h-.83a3.27 3.27 0 0 0 -3.27 3.12l-.79 16.45a3.28 3.28 0 0 0 3.27 3.43h15.24a3.28 3.28 0 0 0 3.27-3.43l-.79-16.45a3.27 3.27 0 0 0 -3.27-3.12h-.83v-1a6 6 0 0 0 -6-6zm-4 6a4 4 0 0 1 8 0v1h-8zm12.1 4.21.79 16.46a1.31 1.31 0 0 1 -.35.94 1.29 1.29 0 0 1 -.92.39h-15.24a1.29 1.29 0 0 1 -.92-.39 1.31 1.31 0 0 1 -.35-.94l.79-16.46a1.27 1.27 0 0 1 1.27-1.21h13.66a1.27 1.27 0 0 1 1.27 1.21z"/>
                      <circle cx="11.36" cy="12.19" r="1"/>
                      <circle cx="20.64" cy="12.19" r="1"/>
                    </g>
                  </svg>
                  {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
                </Link>
              </li>
              {/* Language Toggle */}
              <li className="menu-item menu-item-icon">
                <button 
                  className="language-toggle" 
                  onClick={toggleLanguage}
                  aria-label={`Switch to ${language === 'en' ? 'Arabic' : 'English'}`}
                >
                  <span className="lang-text">{language === 'en' ? 'ع' : 'EN'}</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Auth Button (Desktop Only) */}
        <div className="menu-secondary">
          {user ? (
            <Link to="/account" className="auth-button">
              {t('myAccount')}
            </Link>
          ) : (
            <Link to="/login" className="auth-button">
              {t('login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
