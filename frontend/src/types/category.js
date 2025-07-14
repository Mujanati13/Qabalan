/**
 * Category interface definitions for the FECS e-commerce admin dashboard
 */

/**
 * @typedef {Object} Category
 * @property {number} id - Unique identifier for the category
 * @property {number|null} parent_id - ID of the parent category (null for root categories)
 * @property {number|null} flavour_id - ID of the associated flavour
 * @property {string} title_ar - Category title in Arabic
 * @property {string} title_en - Category title in English
 * @property {string|null} description_ar - Category description in Arabic
 * @property {string|null} description_en - Category description in English
 * @property {string} slug - URL-friendly version of the category name
 * @property {string|null} image - Main category image URL
 * @property {string|null} banner_image - Banner image URL
 * @property {string|null} banner_mobile - Mobile banner image URL
 * @property {number} sort_order - Display order for category sorting
 * @property {boolean} is_active - Whether the category is active
 * @property {string} created_at - ISO timestamp of creation
 * @property {string} updated_at - ISO timestamp of last update
 * @property {string|null} parent_title_ar - Parent category title in Arabic
 * @property {string|null} parent_title_en - Parent category title in English
 * @property {string|null} flavour_title_ar - Flavour title in Arabic
 * @property {string|null} flavour_title_en - Flavour title in English
 * @property {number} products_count - Number of products in this category
 */

/**
 * @typedef {Object} CategoryFormData
 * @property {string} title_ar - Category title in Arabic
 * @property {string} title_en - Category title in English
 * @property {string} description_ar - Category description in Arabic
 * @property {string} description_en - Category description in English
 * @property {string} slug - URL-friendly version of the category name
 * @property {number|null} parent_id - ID of the parent category
 * @property {number|null} flavour_id - ID of the associated flavour
 * @property {string|null} image - Main category image URL
 * @property {string|null} banner_image - Banner image URL
 * @property {string|null} banner_mobile - Mobile banner image URL
 * @property {number} sort_order - Display order for category sorting
 * @property {boolean} is_active - Whether the category is active
 */

/**
 * @typedef {Object} CategoryTreeNode
 * @property {number} id - Unique identifier for the category
 * @property {string} title_ar - Category title in Arabic
 * @property {string} title_en - Category title in English
 * @property {string} slug - URL-friendly version of the category name
 * @property {number|null} parent_id - ID of the parent category
 * @property {boolean} is_active - Whether the category is active
 * @property {number} sort_order - Display order for category sorting
 * @property {number} products_count - Number of products in this category
 * @property {CategoryTreeNode[]} children - Child categories
 */

/**
 * @typedef {Object} CategoryCreateRequest
 * @property {string} title_ar - Category title in Arabic
 * @property {string} title_en - Category title in English
 * @property {string} description_ar - Category description in Arabic
 * @property {string} description_en - Category description in English
 * @property {string} slug - URL-friendly version of the category name
 * @property {number|null} parent_id - ID of the parent category
 * @property {number|null} flavour_id - ID of the associated flavour
 * @property {string|null} image - Main category image URL
 * @property {string|null} banner_image - Banner image URL
 * @property {string|null} banner_mobile - Mobile banner image URL
 * @property {number} sort_order - Display order for category sorting
 * @property {boolean} is_active - Whether the category is active
 */

/**
 * @typedef {Object} CategoryUpdateRequest
 * @property {string} title_ar - Category title in Arabic
 * @property {string} title_en - Category title in English
 * @property {string} description_ar - Category description in Arabic
 * @property {string} description_en - Category description in English
 * @property {string} slug - URL-friendly version of the category name
 * @property {number|null} parent_id - ID of the parent category
 * @property {number|null} flavour_id - ID of the associated flavour
 * @property {string|null} image - Main category image URL
 * @property {string|null} banner_image - Banner image URL
 * @property {string|null} banner_mobile - Mobile banner image URL
 * @property {number} sort_order - Display order for category sorting
 * @property {boolean} is_active - Whether the category is active
 */

/**
 * @typedef {Object} CategoryResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {Category|Category[]} data - Category data or array of categories
 * @property {string} message - Success message
 * @property {string} message_ar - Success message in Arabic
 * @property {Object} pagination - Pagination information (for list responses)
 * @property {number} pagination.page - Current page number
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.total - Total number of items
 * @property {number} pagination.totalPages - Total number of pages
 * @property {boolean} pagination.hasNext - Whether there's a next page
 * @property {boolean} pagination.hasPrev - Whether there's a previous page
 */

/**
 * @typedef {Object} CategoryListParams
 * @property {number} page - Page number (default: 1)
 * @property {number} limit - Items per page (default: 20)
 * @property {number|null} parent_id - Filter by parent category ID
 * @property {string|null} search - Search term for category titles
 * @property {boolean} include_inactive - Include inactive categories (default: false)
 */

/**
 * Status options for categories
 * @typedef {'active'|'inactive'} CategoryStatus
 */

export {
  // Type definitions are exported as JSDoc comments for JavaScript projects
  // In TypeScript, these would be actual interface/type exports
};
