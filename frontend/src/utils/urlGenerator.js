/**
 * URL Generator Utility for Admin Dashboard
 * Generates valid, platform-appropriate URLs for direct navigation
 */

// Base URL for the admin dashboard
const ADMIN_BASE_URL = window.location.origin;

/**
 * URL Generation Functions
 */
export const urlGenerator = {
  
  /**
   * Generate URL for Products page
   * @param {Object} options - Optional parameters
   * @param {string} options.productId - Specific product ID to view/edit
   * @param {string} options.action - 'view', 'edit', 'add'
   * @param {string} options.category - Filter by category
   * @param {string} options.search - Search term
   * @returns {string} Complete URL
   */
  products: (options = {}) => {
    const { productId, action, category, search } = options;
    let url = `${ADMIN_BASE_URL}/products`;
    const params = new URLSearchParams();

    if (productId) {
      params.append('id', productId);
    }
    if (action) {
      params.append('action', action);
    }
    if (category) {
      params.append('category', category);
    }
    if (search) {
      params.append('search', search);
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  },

  /**
   * Generate URL for Offers/Promo Codes page
   * @param {Object} options - Optional parameters
   * @param {string} options.promoId - Specific promo code ID
   * @param {string} options.action - 'view', 'edit', 'add'
   * @param {string} options.type - 'discount', 'bxgy', 'free_shipping'
   * @param {string} options.status - 'active', 'inactive', 'expired'
   * @returns {string} Complete URL
   */
  offers: (options = {}) => {
    const { promoId, action, type, status } = options;
    let url = `${ADMIN_BASE_URL}/promos`;
    const params = new URLSearchParams();

    if (promoId) {
      params.append('id', promoId);
    }
    if (action) {
      params.append('action', action);
    }
    if (type) {
      params.append('type', type);
    }
    if (status) {
      params.append('status', status);
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  },

  /**
   * Generate URL for Orders page
   * @param {Object} options - Optional parameters
   * @param {string} options.orderId - Specific order ID
   * @param {string} options.action - 'view', 'edit'
   * @param {string} options.status - Order status filter
   * @returns {string} Complete URL
   */
  orders: (options = {}) => {
    const { orderId, action, status } = options;
    let url = `${ADMIN_BASE_URL}/orders`;
    const params = new URLSearchParams();

    if (orderId) {
      params.append('id', orderId);
    }
    if (action) {
      params.append('action', action);
    }
    if (status) {
      params.append('status', status);
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  },

  /**
   * Generate URL for Categories page
   * @param {Object} options - Optional parameters
   * @param {string} options.categoryId - Specific category ID
   * @param {string} options.action - 'view', 'edit', 'add'
   * @returns {string} Complete URL
   */
  categories: (options = {}) => {
    const { categoryId, action } = options;
    let url = `${ADMIN_BASE_URL}/categories`;
    const params = new URLSearchParams();

    if (categoryId) {
      params.append('id', categoryId);
    }
    if (action) {
      params.append('action', action);
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  },

  /**
   * Generate URL for Customers page
   * @param {Object} options - Optional parameters
   * @param {string} options.customerId - Specific customer ID
   * @param {string} options.action - 'view', 'edit'
   * @returns {string} Complete URL
   */
  customers: (options = {}) => {
    const { customerId, action } = options;
    let url = `${ADMIN_BASE_URL}/users`;
    const params = new URLSearchParams();

    if (customerId) {
      params.append('id', customerId);
    }
    if (action) {
      params.append('action', action);
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  },

  /**
   * Generate shareable URLs with authentication tokens (for external sharing)
   * @param {string} page - Page type ('products', 'offers', 'orders', etc.)
   * @param {Object} options - Page-specific options
   * @param {Object} authOptions - Authentication options
   * @param {string} authOptions.token - Optional auth token for direct access
   * @param {number} authOptions.expiresIn - Token expiration in hours (default: 24)
   * @returns {string} Shareable URL with authentication
   */
  generateShareableUrl: (page, options = {}, authOptions = {}) => {
    const { token, expiresIn = 24 } = authOptions;
    let baseUrl;

    switch (page) {
      case 'products':
        baseUrl = urlGenerator.products(options);
        break;
      case 'offers':
        baseUrl = urlGenerator.offers(options);
        break;
      case 'orders':
        baseUrl = urlGenerator.orders(options);
        break;
      case 'categories':
        baseUrl = urlGenerator.categories(options);
        break;
      case 'customers':
        baseUrl = urlGenerator.customers(options);
        break;
      default:
        baseUrl = `${ADMIN_BASE_URL}/${page}`;
    }

    const url = new URL(baseUrl);
    
    if (token) {
      url.searchParams.append('token', token);
      url.searchParams.append('expires', Date.now() + (expiresIn * 60 * 60 * 1000));
    }

    return url.toString();
  },

  /**
   * Validate and parse URL parameters
   * @param {string} url - URL to parse
   * @returns {Object} Parsed parameters
   */
  parseUrl: (url) => {
    try {
      const urlObj = new URL(url);
      const params = Object.fromEntries(urlObj.searchParams.entries());
      const pathname = urlObj.pathname;
      
      return {
        page: pathname.split('/').pop(),
        params,
        isValid: true
      };
    } catch (error) {
      return {
        page: null,
        params: {},
        isValid: false,
        error: error.message
      };
    }
  }
};

/**
 * Example Usage:
 * 
 * // Direct product page
 * urlGenerator.products() 
 * // Result: "http://localhost:3005/products"
 * 
 * // Specific product for editing
 * urlGenerator.products({ productId: '123', action: 'edit' })
 * // Result: "http://localhost:3005/products?id=123&action=edit"
 * 
 * // Products filtered by category
 * urlGenerator.products({ category: 'electronics', search: 'iphone' })
 * // Result: "http://localhost:3005/products?category=electronics&search=iphone"
 * 
 * // Offers page
 * urlGenerator.offers()
 * // Result: "http://localhost:3005/promos"
 * 
 * // Specific promo code
 * urlGenerator.offers({ promoId: '456', action: 'view' })
 * // Result: "http://localhost:3005/promos?id=456&action=view"
 * 
 * // Filtered offers
 * urlGenerator.offers({ type: 'discount', status: 'active' })
 * // Result: "http://localhost:3005/promos?type=discount&status=active"
 * 
 * // Shareable URL with authentication
 * urlGenerator.generateShareableUrl('products', { productId: '123' }, { token: 'abc123', expiresIn: 48 })
 * // Result: "http://localhost:3005/products?id=123&token=abc123&expires=1674567890123"
 */

export default urlGenerator;
