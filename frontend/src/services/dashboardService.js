import { api } from './authService';

class DashboardService {
  // Get dashboard statistics
  async getDashboardStats(dateParams = {}) {
    try {
      const params = new URLSearchParams(dateParams);
      const response = await api.get(`/dashboard/stats?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard statistics');
    }
  }

  // Get order flow data for charts (daily/weekly)
  async getOrderFlow(params = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await api.get(`/dashboard/order-flow?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order flow data');
    }
  }

  // Get sales data
  async getSalesData(params = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await api.get(`/dashboard/sales?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sales data');
    }
  }

  // Get top products
  async getTopProducts(limit = 10, dateParams = {}) {
    try {
      const params = new URLSearchParams({ limit, ...dateParams });
      const response = await api.get(`/dashboard/top-products?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch top products');
    }
  }

  // Get recent orders
  async getRecentOrders(limit = 10, dateParams = {}) {
    try {
      const params = new URLSearchParams({ limit, ...dateParams });
      const response = await api.get(`/dashboard/recent-orders?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch recent orders');
    }
  }

  // Get customer statistics
  async getCustomerStats(dateParams = {}) {
    try {
      const params = new URLSearchParams(dateParams);
      const response = await api.get(`/dashboard/customer-stats?${params}`);
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
