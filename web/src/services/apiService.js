import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Service Class
class ApiService {
  // Offers
  async getOffer(offerId) {
    try {
      return await api.get(`/offers/${offerId}`);
    } catch (error) {
      console.error('Error fetching offer:', error);
      throw error;
    }
  }

  async getOffers(params = {}) {
    try {
      return await api.get('/offers', { params });
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw error;
    }
  }

  // Products
  async getProduct(productId) {
    try {
      return await api.get(`/products/${productId}`);
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async getProducts(params = {}) {
    try {
      return await api.get('/products', { params });
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getProductsByCategory(categoryId) {
    try {
      return await api.get(`/products/category/${categoryId}`);
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  }

  // Categories
  async getCategories() {
    try {
      return await api.get('/categories');
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Cart operations
  async addToCart(productId, quantity = 1, options = {}) {
    try {
      return await api.post('/cart/add', {
        product_id: productId,
        quantity,
        ...options
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  async getCart() {
    try {
      return await api.get('/cart');
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  }

  async updateCartItem(itemId, quantity) {
    try {
      return await api.put(`/cart/items/${itemId}`, { quantity });
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  async removeFromCart(itemId) {
    try {
      return await api.delete(`/cart/items/${itemId}`);
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  // Orders
  async createOrder(orderData) {
    try {
      return await api.post('/orders', orderData);
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async getOrder(orderId) {
    try {
      return await api.get(`/orders/${orderId}`);
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  async getOrders(params = {}) {
    try {
      return await api.get('/orders', { params });
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  // Reviews
  async getProductReviews(productId, params = {}) {
    try {
      return await api.get(`/products/${productId}/reviews`, { params });
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      throw error;
    }
  }

  async createReview(productId, reviewData) {
    try {
      return await api.post(`/products/${productId}/reviews`, reviewData);
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  // Promo codes
  async validatePromoCode(code) {
    try {
      return await api.post('/promo-codes/validate', { code });
    } catch (error) {
      console.error('Error validating promo code:', error);
      throw error;
    }
  }

  // Wishlist
  async addToWishlist(productId) {
    try {
      return await api.post('/wishlist/add', { product_id: productId });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  }

  async removeFromWishlist(productId) {
    try {
      return await api.delete(`/wishlist/items/${productId}`);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  }

  async getWishlist() {
    try {
      return await api.get('/wishlist');
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      throw error;
    }
  }

  // Customer support
  async createSupportTicket(ticketData) {
    try {
      return await api.post('/support/tickets', ticketData);
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  }

  // Search
  async search(query, filters = {}) {
    try {
      return await api.get('/search', {
        params: {
          q: query,
          ...filters
        }
      });
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  }

  // Analytics (for tracking user interactions)
  async trackEvent(eventData) {
    try {
      return await api.post('/analytics/events', eventData);
    } catch (error) {
      console.error('Error tracking event:', error);
      // Don't throw error for analytics to avoid breaking user experience
    }
  }

  // Shipping
  async getShippingOptions(address) {
    try {
      return await api.post('/shipping/options', address);
    } catch (error) {
      console.error('Error fetching shipping options:', error);
      throw error;
    }
  }

  async calculateShipping(items, address) {
    try {
      return await api.post('/shipping/calculate', { items, address });
    } catch (error) {
      console.error('Error calculating shipping:', error);
      throw error;
    }
  }

  // Settings
  async getSettings() {
    try {
      return await api.get('/settings');
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }
}

// Create and export a single instance
const apiService = new ApiService();

export default apiService;

// Export specific methods for convenience
export const {
  getOffer,
  getOffers,
  getProduct,
  getProducts,
  getProductsByCategory,
  getCategories,
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  createOrder,
  getOrder,
  getOrders,
  getProductReviews,
  createReview,
  validatePromoCode,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  createSupportTicket,
  search,
  trackEvent,
  getShippingOptions,
  calculateShipping,
  getSettings
} = apiService;
