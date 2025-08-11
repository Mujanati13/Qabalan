import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add language header
    const language = localStorage.getItem('admin_language') || 'en'
    config.headers['Accept-Language'] = language
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

const notificationsService = {
  // Get all notifications (admin)
  async getAllNotifications(params = {}) {
    try {
      const response = await apiClient.get('/notifications/admin/all', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching all notifications:', error)
      throw error.response?.data || error
    }
  },

  // Send notification (admin)
  async sendNotification(notificationData) {
    try {
      const response = await apiClient.post('/notifications/admin/send', notificationData)
      return response.data
    } catch (error) {
      console.error('Error sending notification:', error)
      throw error.response?.data || error
    }
  },

  // Get notification statistics (admin)
  async getStatistics(days = 7) {
    try {
      const response = await apiClient.get('/notifications/admin/stats', { 
        params: { days } 
      })
      return response.data
    } catch (error) {
      console.error('Error fetching notification statistics:', error)
      throw error.response?.data || error
    }
  },

  // Get notification logs (admin)
  async getLogs(params = {}) {
    try {
      const response = await apiClient.get('/notifications/admin/logs', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching notification logs:', error)
      throw error.response?.data || error
    }
  },

  // Get FCM tokens (admin)
  async getTokens(params = {}) {
    try {
      const response = await apiClient.get('/notifications/admin/tokens', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching FCM tokens:', error)
      throw error.response?.data || error
    }
  },

  // Get customers for notification targeting
  async getCustomers(params = {}) {
    try {
      // Ensure we only get customers
      const customerParams = { 
        user_type: 'customer',
        is_active: 'true',
        ...params 
      }
      const response = await apiClient.get('/users', { params: customerParams })
      return response.data
    } catch (error) {
      console.error('Error fetching customers:', error)
      throw error.response?.data || error
    }
  }
}

export default notificationsService
