import { api } from './authService';

const settingsService = {
  // Get all settings grouped by category
  getAllSettings: async () => {
    try {
      const response = await api.get('/settings');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get settings by category
  getSettingsByCategory: async (category) => {
    try {
      const response = await api.get(`/settings/category/${category}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update multiple settings at once
  updateSettings: async (settings) => {
    try {
      const response = await api.put('/settings/bulk', { settings });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update single setting
  updateSetting: async (category, key, value) => {
    try {
      const response = await api.put(`/settings/${category}/${key}`, {
        setting_value: value
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create new setting
  createSetting: async (settingData) => {
    try {
      const response = await api.post('/settings', settingData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete setting
  deleteSetting: async (category, key) => {
    try {
      const response = await api.delete(`/settings/${category}/${key}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Reset settings to default for a category
  resetCategorySettings: async (category) => {
    try {
      const response = await api.post(`/settings/reset/${category}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default settingsService;
