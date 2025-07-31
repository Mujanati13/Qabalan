import axios from 'axios';

// Configure base URL for the backend API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3015';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

class ApiService {
  // ***** OFFERS API *****
  
  // Get all offers with optional filters
  async getOffers(params = {}) {
    try {
      const response = await apiClient.get('/offers', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw error;
    }
  }

  // Get specific offer by ID
  async getOffer(offerId) {
    try {
      const response = await apiClient.get(`/offers/${offerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching offer:', error);
      throw error;
    }
  }

  // Create new offer (admin only)
  async createOffer(offerData) {
    try {
      const response = await apiClient.post('/offers', offerData);
      return response.data;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  // Update existing offer (admin only)
  async updateOffer(offerId, offerData) {
    try {
      const response = await apiClient.put(`/offers/${offerId}`, offerData);
      return response.data;
    } catch (error) {
      console.error('Error updating offer:', error);
      throw error;
    }
  }

  // Delete offer (admin only)
  async deleteOffer(offerId) {
    try {
      const response = await apiClient.delete(`/offers/${offerId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting offer:', error);
      throw error;
    }
  }

  // ***** PRODUCTS API *****
  
  // Get all products
  async getProducts(params = {}) {
    try {
      const response = await apiClient.get('/products', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  // Get specific product by ID
  async getProduct(productId) {
    try {
      const response = await apiClient.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  // Get featured products
  async getFeaturedProducts() {
    try {
      const response = await apiClient.get('/products/featured');
      return response.data;
    } catch (error) {
      console.error('Error fetching featured products:', error);
      throw error;
    }
  }

  // ***** CATEGORIES API *****
  
  // Get all categories
  async getCategories() {
    try {
      const response = await apiClient.get('/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Get products by category
  async getProductsByCategory(categoryId, params = {}) {
    try {
      const response = await apiClient.get(`/categories/${categoryId}/products`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  }

  // ***** PROMO CODES API *****
  
  // Get promo code details
  async getPromoCode(code) {
    try {
      const response = await apiClient.get(`/promos/validate/${code}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching promo code:', error);
      throw error;
    }
  }

  // Apply promo code to order
  async applyPromoCode(orderData, promoCode) {
    try {
      const response = await apiClient.post('/promos/apply', {
        ...orderData,
        promoCode
      });
      return response.data;
    } catch (error) {
      console.error('Error applying promo code:', error);
      throw error;
    }
  }

  // ***** REVIEWS API *****
  
  // Get reviews for a product
  async getProductReviews(productId, params = {}) {
    try {
      const response = await apiClient.get(`/products/${productId}/reviews`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      throw error;
    }
  }

  // Submit a new review
  async submitReview(productId, reviewData) {
    try {
      const response = await apiClient.post(`/products/${productId}/reviews`, reviewData);
      return response.data;
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  }

  // ***** ORDERS API *****
  
  // Create new order
  async createOrder(orderData) {
    try {
      const response = await apiClient.post('/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Get order details
  async getOrder(orderId) {
    try {
      const response = await apiClient.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  // ***** ANALYTICS & TRACKING *****
  
  // Track user interaction
  async trackInteraction(data) {
    try {
      const response = await apiClient.post('/analytics/track', data);
      return response.data;
    } catch (error) {
      console.error('Error tracking interaction:', error);
      // Don't throw error for tracking failures
      return null;
    }
  }

  // Track URL click
  async trackUrlClick(url, metadata = {}) {
    try {
      const response = await apiClient.post('/analytics/url-click', {
        url,
        timestamp: new Date().toISOString(),
        ...metadata
      });
      return response.data;
    } catch (error) {
      console.error('Error tracking URL click:', error);
      return null;
    }
  }

  // ***** UTILITY METHODS *****
  
  // Upload file (images, etc.)
  async uploadFile(file, type = 'image') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Error checking API health:', error);
      throw error;
    }
  }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;
