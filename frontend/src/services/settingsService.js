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
  },

  // System settings methods
  // Get all system settings
  getSystemSettings: async () => {
    try {
      const response = await api.get('/settings/system');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update system setting
  updateSystemSetting: async (key, value) => {
    try {
      const response = await api.put(`/settings/system/${key}`, {
        setting_value: value
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Global disable/enable methods
  globalDisableAction: async (action, notes = null) => {
    try {
      const response = await api.post('/settings/global-disable', {
        action,
        notes
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get global disable logs
  getGlobalDisableLogs: async (page = 1, limit = 20) => {
    try {
      const response = await api.get(`/settings/global-disable/logs?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get scheduler status
  getSchedulerStatus: async () => {
    try {
      const response = await api.get('/settings/global-disable/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default settingsService;
