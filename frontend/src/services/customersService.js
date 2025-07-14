import { api } from './authService';

const customersService = {
  // Get all customers with filters and pagination
  getCustomers: async (params = {}) => {
    try {
      const response = await api.get('/users', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch customers');
    }
  },

  // Get customer statistics
  getCustomerStats: async () => {
    try {
      const response = await api.get('/users/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch customer statistics');
    }
  },

  // Get single customer by ID
  getCustomer: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch customer');
    }
  },

  // Create new customer
  createCustomer: async (customerData) => {
    try {
      const response = await api.post('/users', customerData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create customer');
    }
  },

  // Update customer
  updateCustomer: async (id, customerData) => {
    try {
      const response = await api.put(`/users/${id}`, customerData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update customer');
    }
  },

  // Change customer password
  changePassword: async (id, passwordData) => {
    try {
      const response = await api.put(`/users/${id}/password`, passwordData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to change password');
    }
  },

  // Delete customer (soft delete)
  deleteCustomer: async (id, hardDelete = false) => {
    try {
      const response = await api.delete(`/users/${id}?hard_delete=${hardDelete}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete customer');
    }
  },

  // Activate customer
  activateCustomer: async (id) => {
    try {
      const response = await api.post(`/users/${id}/activate`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to activate customer');
    }
  },

  // Get customer orders
  getCustomerOrders: async (id, params = {}) => {
    try {
      const response = await api.get(`/users/${id}/orders`, { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch customer orders');
    }
  },

  // Address management
  getAddresses: async (params = {}) => {
    try {
      const response = await api.get('/addresses', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch addresses');
    }
  },

  getAddress: async (id) => {
    try {
      const response = await api.get(`/addresses/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch address');
    }
  },

  createAddress: async (addressData) => {
    try {
      const response = await api.post('/addresses', addressData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create address');
    }
  },

  updateAddress: async (id, addressData) => {
    try {
      const response = await api.put(`/addresses/${id}`, addressData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update address');
    }
  },

  deleteAddress: async (id, hardDelete = false) => {
    try {
      const response = await api.delete(`/addresses/${id}?hard_delete=${hardDelete}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete address');
    }
  },

  setDefaultAddress: async (id) => {
    try {
      const response = await api.post(`/addresses/${id}/set-default`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to set default address');
    }
  },

  // Location helpers
  getCities: async () => {
    try {
      const response = await api.get('/addresses/locations/cities');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch cities');
    }
  },

  getAreas: async (cityId) => {
    try {
      const response = await api.get(`/addresses/locations/areas/${cityId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch areas');
    }
  },

  getStreets: async (areaId) => {
    try {
      const response = await api.get(`/addresses/locations/streets/${areaId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch streets');
    }
  }
};

export default customersService;
