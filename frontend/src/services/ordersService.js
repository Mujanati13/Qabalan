import { api } from './authService';

const ordersService = {
  // Get all orders with filters and pagination
  getOrders: async (params = {}) => {
    try {
      const response = await api.get('/orders', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch orders');
    }
  },

  // Get single order by ID
  getOrder: async (id) => {
    try {
      const response = await api.get(`/orders/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order');
    }
  },

  // Create new order
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/orders', orderData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create order');
    }
  },

  // Update order status
  updateOrderStatus: async (id, status, notes = '') => {
    try {
      const response = await api.put(`/orders/${id}/status`, { status, notes });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update order status');
    }
  },

  // Update order details
  updateOrder: async (id, orderData) => {
    try {
      const response = await api.put(`/orders/${id}`, orderData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update order');
    }
  },

  // Cancel order
  cancelOrder: async (id, reason = '') => {
    try {
      const response = await api.post(`/orders/${id}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to cancel order');
    }
  },

  // Delete order (soft delete)
  deleteOrder: async (id) => {
    try {
      const response = await api.delete(`/orders/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete order');
    }
  },

  // Get order statistics
  getOrderStats: async (period = 'today') => {
    try {
      // Convert period to date range for dashboard endpoint
      let params = {};
      const today = new Date();
      
      switch (period) {
        case 'today':
          params.start_date = today.toISOString().split('T')[0];
          params.end_date = today.toISOString().split('T')[0];
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          params.start_date = yesterday.toISOString().split('T')[0];
          params.end_date = yesterday.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          params.start_date = weekStart.toISOString().split('T')[0];
          params.end_date = today.toISOString().split('T')[0];
          break;
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          params.start_date = monthStart.toISOString().split('T')[0];
          params.end_date = today.toISOString().split('T')[0];
          break;
        default:
          params.start_date = today.toISOString().split('T')[0];
          params.end_date = today.toISOString().split('T')[0];
      }
      
      const response = await api.get('/orders/stats/dashboard', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order statistics');
    }
  },

  // Bulk status update
  bulkUpdateStatus: async (orderIds, status, note = '') => {
    try {
      const response = await api.post('/orders/bulk-status-update', {
        order_ids: orderIds,
        status,
        note
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to bulk update orders');
    }
  },

  // DEPRECATED: Get recent orders for real-time updates
  // Real-time updates now use Socket.IO instead
  getRecentOrders: async (sinceTimestamp) => {
    console.warn('getRecentOrders is deprecated. Use Socket.IO for real-time updates.');
    return { data: [] }; // Return empty array to avoid breaking existing code
  },

  // Get order counts by status
  getOrderCounts: async () => {
    try {
      // Get all order counts, not just today's
      const response = await api.get('/orders/stats/dashboard');
      
      // Extract counts from status_stats
      const counts = {};
      if (response.data && response.data.data && response.data.data.status_stats) {
        response.data.data.status_stats.forEach(stat => {
          counts[stat.order_status] = stat.count;
        });
      }
      
      return { data: counts };
    } catch (error) {
      console.error('Error fetching order counts:', error);
      // If the dashboard stats endpoint fails, try a direct count approach
      try {
        const pendingResponse = await api.get('/orders', { 
          params: { 
            status: 'pending',
            limit: 1,
            page: 1
          }
        });
        
        const processingResponse = await api.get('/orders', { 
          params: { 
            status: 'processing',
            limit: 1,
            page: 1
          }
        });
        
        const completedResponse = await api.get('/orders', { 
          params: { 
            status: 'completed',
            limit: 1,
            page: 1
          }
        });
        
        return { 
          data: {
            pending: pendingResponse.data?.pagination?.total || 0,
            processing: processingResponse.data?.pagination?.total || 0,
            completed: completedResponse.data?.pagination?.total || 0
          }
        };
      } catch (fallbackError) {
        throw new Error(fallbackError.response?.data?.message || 'Failed to fetch order counts');
      }
    }
  },

  // Calculate order totals (including delivery fee)
  calculateOrder: async (orderData) => {
    try {
      const response = await api.post('/orders/calculate', orderData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to calculate order totals');
    }
  },

  // Update payment method
  updatePaymentMethod: async (id, paymentMethod) => {
    try {
      const response = await api.put(`/orders/${id}/payment-method`, { 
        payment_method: paymentMethod 
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update payment method');
    }
  },

  // Update payment status
  updatePaymentStatus: async (id, paymentStatus) => {
    try {
      const response = await api.put(`/orders/${id}/payment-status`, { 
        payment_status: paymentStatus 
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update payment status');
    }
  },

  // Generate payment link for order
  generatePaymentLink: async (id) => {
    try {
      const response = await api.post(`/orders/${id}/payment-link`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to generate payment link');
    }
  },

  // Alias for backward compatibility
  create: function(orderData) {
    return this.createOrder(orderData);
  }
};

export default ordersService;
