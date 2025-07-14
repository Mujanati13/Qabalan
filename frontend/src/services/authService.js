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

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('admin_refresh_token')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          })

          const { tokens } = response.data.data
          localStorage.setItem('admin_token', tokens.accessToken)
          localStorage.setItem('admin_refresh_token', tokens.refreshToken)

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export const authService = {
  // Set auth token for requests
  setAuthToken: (token) => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete apiClient.defaults.headers.common['Authorization']
    }
  },

  // Login
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials)
    return response.data
  },

  // Logout
  logout: async (data) => {
    const response = await apiClient.post('/auth/logout', data)
    return response.data
  },

  // Refresh token
  refreshToken: async (data) => {
    const response = await apiClient.post('/auth/refresh', data)
    return response.data
  },

  // Get user profile
  getProfile: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data.data.user
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await apiClient.put('/auth/profile', data)
    return response.data
  },

  // Change password
  changePassword: async (data) => {
    const response = await apiClient.post('/auth/change-password', data)
    return response.data
  },

  // Forgot password
  forgotPassword: async (data) => {
    const response = await apiClient.post('/auth/forgot-password', data)
    return response.data
  },

  // Reset password
  resetPassword: async (data) => {
    const response = await apiClient.post('/auth/reset-password', data)
    return response.data
  },

  // Verify email
  verifyEmail: async (data) => {
    const response = await apiClient.post('/auth/verify-email', data)
    return response.data
  }
}

export { apiClient as api }
export default apiClient
