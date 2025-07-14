import { api } from './authService';

class DashboardService {
  // Get dashboard statistics
  async getDashboardStats() {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard statistics');
    }
  }

  // Get order flow data for charts (daily/weekly)
  async getOrderFlow(period = 'week') {
    try {
      const response = await api.get(`/dashboard/order-flow?period=${period}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order flow data');
    }
  }

  // Get sales data
  async getSalesData(period = 'week') {
    try {
      const response = await api.get(`/dashboard/sales?period=${period}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sales data');
    }
  }

  // Get top products
  async getTopProducts(limit = 10) {
    try {
      const response = await api.get(`/dashboard/top-products?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch top products');
    }
  }

  // Get recent orders
  async getRecentOrders(limit = 10) {
    try {
      const response = await api.get(`/dashboard/recent-orders?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch recent orders');
    }
  }

  // Get customer statistics
  async getCustomerStats() {
    try {
      const response = await api.get('/dashboard/customer-stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch customer statistics');
    }
  }

  // Get inventory alerts
  async getInventoryAlerts() {
    try {
      const response = await api.get('/dashboard/inventory-alerts');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch inventory alerts');
    }
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
