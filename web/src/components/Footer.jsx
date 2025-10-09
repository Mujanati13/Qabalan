import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>About Qabalan Bakery</h3>
          <p>
            Since our establishment, we have been committed to providing the finest
            quality bakery products with traditional recipes and modern techniques.
          </p>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/products">Products</Link></li>
            <li><Link to="/story">Our Story</Link></li>
            <li><Link to="/recipes">Recipes</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Customer Service</h3>
          <ul>
            <li><Link to="/terms">Terms & Conditions</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/contact">Contact Support</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Connect With Us</h3>
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
        <p>&copy; {new Date().getFullYear()} Qabalan Bakery. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
