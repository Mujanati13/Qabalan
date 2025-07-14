import { api } from './authService'

const productsService = {
  // Get all products with pagination and filters
  async getProducts(params = {}) {
    try {
      const response = await api.get('/products', { params })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch products')
    }
  },

  // Get single product by ID
  async getProduct(id) {
    try {
      const response = await api.get(`/products/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product')
    }
  },

  // Create new product
  async createProduct(productData) {
    try {
      const config = {};
      
      // If productData is FormData (contains file), set appropriate headers
      if (productData instanceof FormData) {
        config.headers = {
          'Content-Type': 'multipart/form-data'
        };
      }
      
      const response = await api.post('/products', productData, config)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create product')
    }
  },

  // Update product
  async updateProduct(id, productData) {
    try {
      const config = {};
      
      // If productData is FormData (contains file), set appropriate headers
      if (productData instanceof FormData) {
        config.headers = {
          'Content-Type': 'multipart/form-data'
        };
      }
      
      const response = await api.put(`/products/${id}`, productData, config)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update product')
    }
  },

  // Delete product
  async deleteProduct(id) {
    try {
      const response = await api.delete(`/products/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete product')
    }
  },

  // Upload product images
  async uploadImages(productId, files) {
    try {
      const formData = new FormData()
      formData.append('product_id', productId)
      
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i])
      }

      const response = await api.post('/upload/product-images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to upload images')
    }
  },

  // Upload additional product images
  async uploadProductImages(productId, files) {
    try {
      const formData = new FormData()
      
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i])
      }

      const response = await api.post(`/products/${productId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to upload product images')
    }
  },

  // Delete product image
  async deleteProductImage(productId, imageId) {
    try {
      const response = await api.delete(`/products/${productId}/images/${imageId}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete product image')
    }
  },

  // Update image sort order
  async updateImageSortOrder(productId, imageId, sortOrder) {
    try {
      const response = await api.put(`/products/${productId}/images/${imageId}/sort`, {
        sort_order: sortOrder
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update image sort order')
    }
  },

  // Get categories for dropdown
  async getCategories() {
    try {
      const response = await api.get('/categories')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch categories')
    }
  },

  // Toggle product favorite status
  async toggleFavorite(productId) {
    try {
      const response = await api.post(`/products/${productId}/favorite`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to toggle favorite')
    }
  },

  // Get product reviews
  async getProductReviews(productId, params = {}) {
    try {
      const response = await api.get(`/products/${productId}/reviews`, { params })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch reviews')
    }
  },

  // Bulk update products
  async bulkUpdate(productIds, updateData) {
    try {
      const response = await api.put('/products/bulk', {
        product_ids: productIds,
        ...updateData
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to bulk update')
    }
  },

  // Export products
  async exportProducts(filters = {}) {
    try {
      const response = await api.get('/products/export', {
        params: filters,
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to export products')
    }
  },

  // Branch assignment and availability management
  
  // Assign product to branches with initial inventory
  async assignToBranches(productId, branches) {
    try {
      const response = await api.post(`/products/${productId}/branches`, { branches })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to assign product to branches')
    }
  },

  // Get product availability across branches
  async getProductBranches(productId) {
    try {
      const response = await api.get(`/products/${productId}/branches`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product branches')
    }
  },

  // Update product availability in specific branch
  async updateProductBranch(productId, branchId, inventoryData) {
    try {
      const response = await api.put(`/products/${productId}/branches/${branchId}`, inventoryData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update product branch')
    }
  },

  // Remove product from specific branch
  async removeProductFromBranch(productId, branchId, variantId = null) {
    try {
      const params = variantId ? { variant_id: variantId } : {}
      const response = await api.delete(`/products/${productId}/branches/${branchId}`, { params })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove product from branch')
    }
  },

  // Toggle product active/inactive status
  async toggleProductStatus(productId) {
    try {
      const response = await api.post(`/products/${productId}/toggle-status`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to toggle product status')
    }
  },

  // Get products with low stock across all branches
  async getLowStockProducts(params = {}) {
    try {
      const response = await api.get('/products/inventory/low-stock', { params })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch low stock products')
    }
  }
}

export default productsService
