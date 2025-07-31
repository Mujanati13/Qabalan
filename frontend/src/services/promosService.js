import { api } from './authService';

const promosService = {
  // Get all promo codes with filters and pagination
  getPromoCodes: async (params = {}) => {
    try {
      const response = await api.get('/promos', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch promo codes');
    }
  },

  // Get promo code statistics
  getPromoStats: async () => {
    try {
      const response = await api.get('/promos/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch promo statistics');
    }
  },

  // Get single promo code by ID
  getPromoCode: async (id) => {
    try {
      const response = await api.get(`/promos/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch promo code');
    }
  },

  // Create new promo code
  createPromoCode: async (promoData) => {
    try {
      const response = await api.post('/promos', promoData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create promo code');
    }
  },

  // Update promo code
  updatePromoCode: async (id, promoData) => {
    try {
      const response = await api.put(`/promos/${id}`, promoData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update promo code');
    }
  },

  // Delete promo code
  deletePromoCode: async (id, hardDelete = false) => {
    try {
      const response = await api.delete(`/promos/${id}?hard_delete=${hardDelete}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete promo code');
    }
  },

  // Toggle promo code status
  togglePromoStatus: async (id) => {
    try {
      const response = await api.post(`/promos/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to toggle promo status');
    }
  },

  // Validate promo code
  validatePromoCode: async (code, orderTotal = 0) => {
    try {
      const response = await api.post('/promos/validate', {
        code,
        order_total: orderTotal
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to validate promo code');
    }
  },

  // Get usage report
  getUsageReport: async (params = {}) => {
    try {
      const response = await api.get('/promos/usage-report', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch usage report');
    }
  },

  // Export usage report as CSV
  exportUsageReport: async (params = {}) => {
    try {
      const response = await api.get('/promos/usage-report', {
        params: { ...params, format: 'csv' },
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'promo-usage-report.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Report exported successfully' };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to export usage report');
    }
  },

  // Generate random promo code
  generateRandomCode: (length = 8) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  },

  // Calculate estimated discount for preview
  calculateDiscount: (discountType, discountValue, orderTotal, maxDiscountAmount = null) => {
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
      discountAmount = orderTotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
    
    // Apply maximum discount limit
    if (maxDiscountAmount && discountAmount > maxDiscountAmount) {
      discountAmount = maxDiscountAmount;
    }
    
    return Math.min(discountAmount, orderTotal);
  },

  // Format promo code status for display
  getStatusInfo: (promo) => {
    const now = new Date();
    const validFrom = new Date(promo.valid_from);
    const validUntil = new Date(promo.valid_until);
    
    if (!promo.is_active) {
      return { status: 'inactive', color: 'default', text: 'Inactive' };
    }
    
    if (validFrom > now) {
      return { status: 'upcoming', color: 'blue', text: 'Upcoming' };
    }
    
    if (validUntil < now) {
      return { status: 'expired', color: 'red', text: 'Expired' };
    }
    
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return { status: 'exhausted', color: 'orange', text: 'Exhausted' };
    }
    
    return { status: 'active', color: 'green', text: 'Active' };
  },

  // Format discount display
  formatDiscount: (discountType, discountValue) => {
    if (discountType === 'percentage') {
      return `${discountValue}%`;
    } else if (discountType === 'free_shipping') {
      return 'Free Shipping';
    }
    return `$${discountValue}`;
  },

  // Get usage percentage
  getUsagePercentage: (usageCount, usageLimit) => {
    if (!usageLimit) return 0;
    return Math.min((usageCount / usageLimit) * 100, 100);
  }
};

export default promosService;
