import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';

// Extract base server URL (without /api)
const BASE_SERVER_URL = API_URL.replace('/api', '');

// Helper function to get image URL
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // If path already includes 'uploads/', we need to add /api prefix
  if (path.includes('uploads/')) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    // Backend serves static files at /api/uploads, so we need the full API URL
    return `${API_URL}${cleanPath}`;
  }
  
  // If path starts with '/', use API URL
  if (path.startsWith('/')) return `${API_URL}${path}`;
  
  // Default to products folder for backward compatibility
  return `${API_URL}/uploads/products/${path}`;
};

// Helper function to get category image URL
export const getCategoryImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `${BASE_SERVER_URL}${path}`;
  return `${BASE_SERVER_URL}/uploads/categories/${path}`;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh on 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, { 
            refresh_token: refreshToken 
          });
          
          // Backend returns: { success: true, data: { tokens: { accessToken, refreshToken } } }
          const { tokens } = response.data.data;
          
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API service methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByCategory: (categoryId, params) => api.get(`/products/category/${categoryId}`, { params }),
  getBySubcategory: (subcategoryId, params) => api.get(`/products/subcategory/${subcategoryId}`, { params }),
  search: (query) => api.get(`/products/search`, { params: { q: query } }),
  getVariants: (productId, params) => api.get(`/products/${productId}/variants`, { params }),
};

export const categoriesAPI = {
  getAll: (params) => api.get('/categories', { params }),
  getById: (id) => api.get(`/categories/${id}`),
  getSubcategories: (id) => api.get(`/categories/${id}/subcategories`),
};

export const branchesAPI = {
  getAll: () => api.get('/branches'),
  getById: (id) => api.get(`/branches/${id}`),
};

export const cartAPI = {
  getCart: () => api.get('/cart'),
  addItem: (item) => api.post('/cart/add', item),
  updateItem: (itemId, quantity) => api.put(`/cart/${itemId}`, { quantity }),
  removeItem: (itemId) => api.delete(`/cart/${itemId}`),
  clearCart: () => api.delete('/cart'),
};

export const ordersAPI = {
  create: (orderData) => api.post('/orders', orderData),
  getMyOrders: (params = {}) => api.get('/orders', { params }), // GET /orders auto-filters for customer
  getById: (id) => api.get(`/orders/${id}`),
  checkBranchAvailability: (data) => api.post('/orders/branch-availability', data),
  calculate: (data) => api.post('/orders/calculate', data),
  retryPayment: (orderId) => api.post(`/payments/mpgs/session`, { orderId }),
};

export const addressesAPI = {
  getAll: () => api.get('/addresses'),
  create: (address) => api.post('/addresses', address),
  update: (id, address) => api.put(`/addresses/${id}`, address),
  delete: (id) => api.delete(`/addresses/${id}`),
};

export const promosAPI = {
  validate: (code) => api.post('/promos/validate', { code }),
  validateGuest: (code, orderTotal) => api.post('/promos/validate-guest', { code, order_total: orderTotal }),
  getActive: () => api.get('/promos/active'),
};

export const offersAPI = {
  getAll: (params = {}) => api.get('/offers', { params }),
  getById: (id) => api.get(`/offers/${id}`),
};

export const shippingAPI = {
  calculate: (data) => api.post('/shipping/calculate', data),
  getNearestBranch: (data) => api.post('/shipping/nearest-branch', data),
  getZones: () => api.get('/shipping/zones'),
};

export const paymentsAPI = {
  createSession: (orderId) => api.post(`/payments/mpgs/session`, { orderId }),
  checkStatus: (orderId) => api.get(`/payments/mpgs/payment/status`, { params: { orders_id: orderId } }),
  initiateCheckout: (orderId) => api.post('/payments/mpgs/initiate', { orderId }),
};

export default api;
