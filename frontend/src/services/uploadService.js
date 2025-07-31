import { api } from './authService'

const uploadService = {
  // Upload single image (general purpose)
  async uploadImage(formData) {
    try {
      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to upload image')
    }
  },

  // Upload multiple images (general purpose)
  async uploadImages(formData) {
    try {
      const response = await api.post('/upload/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to upload images')
    }
  },

  // Get image URL helper
  getImageUrl(filename, type = 'general') {
    // Remove /api from the base URL since uploads are served directly
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    const baseUrl = apiUrl.replace('/api', '');
    return `${baseUrl}/uploads/${type}/${filename}`
  },

  // Get thumbnail URL helper
  getThumbnailUrl(filename, type = 'general') {
    // Remove /api from the base URL since uploads are served directly
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    const baseUrl = apiUrl.replace('/api', '');
    return `${baseUrl}/uploads/${type}/thumbnails/${filename}`
  }
}

export default uploadService
