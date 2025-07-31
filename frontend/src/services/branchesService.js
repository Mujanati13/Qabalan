import { api } from './authService'

const branchesService = {
  // Get all branches with optional filters
  getBranches: async (params = {}) => {
    try {
      const response = await api.get('/branches', { params })
      return response.data
    } catch (error) {
      // Return the error response so the frontend can handle it properly
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch branches',
        error: error.response?.data || error.message
      }
    }
  },

  // Get branch by ID
  getBranch: async (id) => {
    try {
      const response = await api.get(`/branches/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch branch')
    }
  },

  // Create new branch
  createBranch: async (branchData) => {
    try {
      const response = await api.post('/branches', branchData)
      return response.data
    } catch (error) {
      // Return the error response so the frontend can handle it properly
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create branch',
        error: error.response?.data || error.message
      }
    }
  },

  // Update branch
  updateBranch: async (id, branchData) => {
    try {
      const response = await api.put(`/branches/${id}`, branchData)
      return response.data
    } catch (error) {
      // Return the error response so the frontend can handle it properly
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update branch',
        error: error.response?.data || error.message
      }
    }
  },

  // Delete branch (soft delete)
  deleteBranch: async (id) => {
    try {
      const response = await api.delete(`/branches/${id}`)
      return response.data
    } catch (error) {
      // Return the error response so the frontend can handle it properly
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete branch',
        error: error.response?.data || error.message
      }
    }
  },

  // Update branch status
  updateBranchStatus: async (id, isActive) => {
    try {
      const response = await api.patch(`/branches/${id}/status`, { is_active: isActive })
      return response.data
    } catch (error) {
      // Return the error response so the frontend can handle it properly
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update branch status',
        error: error.response?.data || error.message
      }
    }
  },

  // Get branch inventory
  getBranchInventory: async (branchId, params = {}) => {
    try {
      const response = await api.get(`/branches/${branchId}/inventory`, { params })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch branch inventory')
    }
  },

  // Add or update product inventory for branch
  updateBranchInventory: async (branchId, inventoryData) => {
    try {
      const response = await api.post(`/branches/${branchId}/inventory`, inventoryData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update branch inventory')
    }
  },

  // Update specific inventory record
  updateInventoryRecord: async (branchId, inventoryId, inventoryData) => {
    try {
      const response = await api.put(`/branches/${branchId}/inventory/${inventoryId}`, inventoryData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update inventory record')
    }
  },

  // Remove product from branch inventory
  removeFromInventory: async (branchId, inventoryId) => {
    try {
      const response = await api.delete(`/branches/${branchId}/inventory/${inventoryId}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove from inventory')
    }
  },

  // Search branches
  searchBranches: async (searchTerm) => {
    try {
      const response = await api.get('/branches', { 
        params: { search: searchTerm }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search branches')
    }
  },

  // Get active branches only
  getActiveBranches: async () => {
    try {
      const response = await api.get('/branches', { 
        params: { include_inactive: false }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch active branches')
    }
  }
}

export default branchesService
