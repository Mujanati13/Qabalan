import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Footer.css';

const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>{t('aboutUs')}</h3>
          <p>
            {t('footerAboutText')}
          </p>
        </div>

        <div className="footer-section">
          <h3>{t('quickLinks')}</h3>
          <ul>
            <li><Link to="/">{t('home')}</Link></li>
            <li><Link to="/shop">{t('products')}</Link></li>
            <li><Link to="/story">{t('ourStory')}</Link></li>
            <li><Link to="/recipes">{t('recipes')}</Link></li>
            <li><Link to="/contact">{t('contactUs')}</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>{t('customerService')}</h3>
          <ul>
            <li><Link to="/terms">{t('termsConditions')}</Link></li>
            <li><Link to="/privacy">{t('privacyPolicy')}</Link></li>
            <li><Link to="/contact">{t('contactSupport')}</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>{t('connectWithUs')}</h3>
          <div className="social-links">
            <a 
              href="https://www.facebook.com/QabalanBakeries?mibextid=LQQJ4d" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <i className="fa fa-facebook"></i>
            </a>
            <a 
              href="https://instagram.com/qabalanbakery?igshid=YmMyMTA2M2Y=" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <i className="fa fa-instagram"></i>
            </a>
            <a 
              href="https://youtube.com/@qabalanbakery4122" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="YouTube"
            >
              <i className="fa fa-youtube"></i>
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} {t('qabalanBakery')}. {t('allRightsReserved')}</p>
      </div>
    </footer>
  );
};

export default Footer;
