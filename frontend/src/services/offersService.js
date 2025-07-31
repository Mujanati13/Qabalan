import { api } from './authService';

const offersService = {
  // Get all offers with filters and pagination
  getOffers: async (params = {}) => {
    try {
      const response = await api.get('/offers', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch offers');
    }
  },

  // Get offers for admin with all statuses
  getAdminOffers: async (params = {}) => {
    try {
      const response = await api.get('/offers/admin', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch offers');
    }
  },

  // Get single offer by ID
  getOffer: async (id) => {
    try {
      const response = await api.get(`/offers/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch offer');
    }
  },

  // Create new offer
  createOffer: async (offerData) => {
    try {
      const response = await api.post('/offers', offerData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create offer');
    }
  },

  // Create offer with image upload
  createOfferWithImage: async (offerData, imageFile) => {
    try {
      const formData = new FormData();
      
      // Add offer data
      Object.keys(offerData).forEach(key => {
        if (offerData[key] !== undefined && offerData[key] !== null) {
          if (Array.isArray(offerData[key])) {
            // Send arrays as JSON string for FormData
            formData.append(key, JSON.stringify(offerData[key]));
          } else {
            formData.append(key, offerData[key]);
          }
        }
      });

      // Add image file
      if (imageFile) {
        formData.append('featured_image', imageFile);
      }

      const response = await api.post('/offers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create offer');
    }
  },

  // Update offer
  updateOffer: async (id, offerData) => {
    try {
      const response = await api.put(`/offers/${id}`, offerData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update offer');
    }
  },

  // Update offer with image upload
  updateOfferWithImage: async (id, offerData, imageFile) => {
    try {
      const formData = new FormData();
      
      // Add offer data
      Object.keys(offerData).forEach(key => {
        if (offerData[key] !== undefined && offerData[key] !== null) {
          if (Array.isArray(offerData[key])) {
            // Send arrays as JSON string for FormData
            formData.append(key, JSON.stringify(offerData[key]));
          } else {
            formData.append(key, offerData[key]);
          }
        }
      });

      // Add image file
      if (imageFile) {
        formData.append('featured_image', imageFile);
      }

      const response = await api.put(`/offers/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update offer');
    }
  },

  // Delete offer
  deleteOffer: async (id) => {
    try {
      const response = await api.delete(`/offers/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete offer');
    }
  },

  // Toggle offer status
  toggleOfferStatus: async (id, isActive) => {
    try {
      const response = await api.patch(`/offers/${id}/status`, { is_active: isActive });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update offer status');
    }
  },

  // Get offer statistics
  getOfferStats: async () => {
    try {
      const response = await api.get('/offers/admin/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch offer statistics');
    }
  },

  // Get offer usage analytics
  getOfferAnalytics: async (id) => {
    try {
      const response = await api.get(`/offers/${id}/analytics`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch offer analytics');
    }
  },

  // Apply offer to order (for testing)
  applyOffer: async (offerId, orderData) => {
    try {
      const response = await api.post(`/offers/${offerId}/apply`, orderData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to apply offer');
    }
  },

  // Helper methods
  getImageUrl: (filename) => {
    if (!filename) return null;
    // Keep /api in the URL since uploads are served at /api/uploads
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
    
    // If filename already includes the full path, use it directly
    if (filename.startsWith('/uploads/')) {
      return `${apiUrl}${filename}`;
    }
    
    // Otherwise, add the offers path
    return `${apiUrl}/uploads/offers/${filename}`;
  },

  formatOfferType: (type) => {
    const types = {
      seasonal: 'Seasonal Sale',
      flash: 'Flash Sale',
      bxgy: 'Buy X Get Y',
      bundle: 'Bundle Deal',
      percentage: 'Percentage Discount',
      fixed: 'Fixed Amount Discount'
    };
    return types[type] || type;
  },

  formatDiscountText: (offer) => {
    switch (offer.discount_type) {
      case 'percentage':
        return `${offer.discount_value}% OFF`;
      case 'fixed':
        return `$${offer.discount_value} OFF`;
      case 'bxgy':
        return 'Buy X Get Y';
      default:
        return 'Special Offer';
    }
  },

  isOfferValid: (offer) => {
    const now = new Date();
    const validFrom = new Date(offer.valid_from);
    const validUntil = new Date(offer.valid_until);
    return offer.is_active && now >= validFrom && now <= validUntil;
  },

  getOfferStatus: (offer) => {
    const now = new Date();
    const validFrom = new Date(offer.valid_from);
    const validUntil = new Date(offer.valid_until);

    if (!offer.is_active) return 'inactive';
    if (now < validFrom) return 'upcoming';
    if (now > validUntil) return 'expired';
    return 'active';
  }
};

export default offersService;
