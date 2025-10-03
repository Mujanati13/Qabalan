import { api } from './authService';

class OrderService {
  // Get all orders with filtering and pagination
  async getOrders(params = {}) {
    try {
      const response = await api.get('/orders', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch orders');
    }
  }

  // Get a specific order by ID
  async getOrderById(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order');
    }
  }

  // Update order status
  async updateOrderStatus(orderId, status) {
    try {
      const response = await api.patch(`/orders/${orderId}/status`, { status });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update order status');
    }
  }

  // Update payment status
  async updatePaymentStatus(orderId, paymentStatus) {
    try {
      const response = await api.patch(`/orders/${orderId}/payment-status`, { 
        payment_status: paymentStatus 
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update payment status');
    }
  }

  // Get order statistics
  async getOrderStatistics(params = {}) {
    try {
      const response = await api.get('/orders/statistics', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order statistics');
    }
  }

  // Get order items for a specific order
  async getOrderItems(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}/items`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order items');
    }
  }

  // Cancel an order
  async cancelOrder(orderId, reason = '') {
    try {
      const response = await api.patch(`/orders/${orderId}/cancel`, { 
        cancellation_reason: reason 
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to cancel order');
    }
  }

  // Process refund
  async processRefund(orderId, amount, reason = '') {
    try {
      const response = await api.post(`/orders/${orderId}/refund`, {
        refund_amount: amount,
        refund_reason: reason
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to process refund');
    }
  }

  // Get order tracking information
  async getOrderTracking(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}/tracking`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order tracking');
    }
  }

  // Search orders
  async searchOrders(query, filters = {}) {
    try {
      const params = { search: query, ...filters };
      const response = await api.get('/orders/search', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search orders');
    }
  }

  // Export orders to different formats
  async exportOrders(format = 'excel', filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      
      const response = await api.get(`/orders/export/${format}?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on format
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'excel' ? 'xlsx' : 'pdf';
      link.download = `orders-export-${timestamp}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      throw new Error(error.response?.data?.message || `Failed to export orders as ${format}`);
    }
  }

  // Utility methods
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-JO', {
      style: 'currency',
      currency: 'JOD',
      minimumFractionDigits: 2,
      currencyDisplay: 'narrowSymbol'
    }).format(amount || 0);
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get order status display information
  getOrderStatusInfo(status) {
    const statusMap = {
      pending: { color: 'warning', label: 'Pending' },
      confirmed: { color: 'info', label: 'Confirmed' },
      preparing: { color: 'primary', label: 'Preparing' },
      out_for_delivery: { color: 'secondary', label: 'Out for Delivery' },
      delivered: { color: 'success', label: 'Delivered' },
      cancelled: { color: 'error', label: 'Cancelled' },
      refunded: { color: 'default', label: 'Refunded' }
    };
    
    return statusMap[status] || { color: 'default', label: status };
  }

  // Get payment status display information
  getPaymentStatusInfo(paymentStatus) {
    const statusMap = {
      pending: { color: 'warning', label: 'Pending' },
      paid: { color: 'success', label: 'Paid' },
      failed: { color: 'error', label: 'Failed' },
      refunded: { color: 'default', label: 'Refunded' },
      partial: { color: 'info', label: 'Partial' }
    };
    
    return statusMap[paymentStatus] || { color: 'default', label: paymentStatus };
  }
}

export default new OrderService();
