import { api } from './authService'

const categoriesService = {
  // Get all categories with optional filters
  getCategories: async (params = {}) => {
    try {
      const response = await api.get('/categories', { params })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch categories')
    }
  },

  // Get categories in tree structure
  getCategoriesTree: async (includeInactive = false) => {
    try {
      const response = await api.get('/categories/tree', { 
        params: { include_inactive: includeInactive }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch categories tree')
    }
  },

  // Get category by ID
  getCategory: async (id) => {
    try {
      const response = await api.get(`/categories/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch category')
    }
  },

  // Create new category
  createCategory: async (categoryData) => {
    try {
      const config = categoryData instanceof FormData ? {
        headers: { 'Content-Type': 'multipart/form-data' }
      } : {};
      
      const response = await api.post('/categories', categoryData, config);
      return response.data;
    } catch (error) {
      // Preserve the original error response for detailed error handling
      throw error;
    }
  },

  // Update category
  updateCategory: async (id, categoryData) => {
    try {
      const config = categoryData instanceof FormData ? {
        headers: { 'Content-Type': 'multipart/form-data' }
      } : {};
      
      const response = await api.put(`/categories/${id}`, categoryData, config);
      return response.data;
    } catch (error) {
      // Preserve the original error response for detailed error handling
      throw error;
    }
  },

  // Delete category (soft delete)
  deleteCategory: async (id) => {
    try {
      const response = await api.delete(`/categories/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete category')
    }
  },

  // Activate/deactivate category
  toggleCategoryStatus: async (id, isActive) => {
    try {
      const response = await api.post(`/categories/${id}/activate`, { 
        is_active: isActive 
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to toggle category status')
    }
  },

  // Get root categories (no parent)
  getRootCategories: async () => {
    try {
      const response = await api.get('/categories', { 
        params: { parent_id: 'null' }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch root categories')
    }
  },

  // Get subcategories of a parent category
  getSubcategories: async (parentId) => {
    try {
      const response = await api.get('/categories', { 
        params: { parent_id: parentId }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch subcategories')
    }
  },

  // Search categories
  searchCategories: async (searchTerm) => {
    try {
      const response = await api.get('/categories', { 
        params: { search: searchTerm }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search categories')
    }
  },

  // Update category sort order
  updateSortOrder: async (categoryId, sortOrder) => {
    try {
      const response = await api.put(`/categories/${categoryId}/sort-order`, {
        sort_order: sortOrder
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update category sort order')
    }
  },

  // Increment/Decrement category sort order
  adjustSortOrder: async (categoryId, direction) => {
    try {
      const response = await api.put(`/categories/${categoryId}/sort-order`, {
        direction: direction // 'increment' or 'decrement'
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to adjust category sort order')
    }
  }
}

export default categoriesService;
