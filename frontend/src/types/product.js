/**
 * Product interface definitions for the FECS e-commerce admin dashboard
 */

/**
 * @typedef {Object} Product
 * @property {number} id - Unique identifier for the product
 * @property {number} category_id - ID of the category this product belongs to
 * @property {string} title_ar - Product title in Arabic
 * @property {string} title_en - Product title in English
 * @property {string|null} description_ar - Product description in Arabic
 * @property {string|null} description_en - Product description in English
 * @property {string} slug - URL-friendly version of the product name
 * @property {string} sku - Stock Keeping Unit identifier
 * @property {number} base_price - Base price of the product
 * @property {number|null} sale_price - Sale price of the product (if on sale)
 * @property {number} loyalty_points - Loyalty points earned when purchasing
 * @property {string|null} main_image - Main product image URL
 * @property {boolean} is_featured - Whether the product is featured
 * @property {ProductStatus} status - Product status
 * @property {StockStatus} stock_status - Stock availability status
 * @property {number|null} weight - Product weight in grams
 * @property {number|null} length - Product length in cm
 * @property {number|null} width - Product width in cm
 * @property {number|null} height - Product height in cm
 * @property {string|null} meta_title - SEO meta title
 * @property {string|null} meta_description - SEO meta description
 * @property {string|null} meta_keywords - SEO meta keywords
 * @property {boolean} is_active - Whether the product is active
 * @property {string} created_at - ISO timestamp of creation
 * @property {string} updated_at - ISO timestamp of last update
 * @property {string|null} category_title_ar - Category title in Arabic
 * @property {string|null} category_title_en - Category title in English
 * @property {number} final_price - Final price (sale_price if available, else base_price)
 * @property {boolean} is_favorited - Whether the product is favorited by current user
 */

/**
 * @typedef {Object} ProductAttribute
 * @property {number} id - Unique identifier for the attribute
 * @property {number} product_id - ID of the product this attribute belongs to
 * @property {string} name_ar - Attribute name in Arabic
 * @property {string} name_en - Attribute name in English
 * @property {string} value_ar - Attribute value in Arabic
 * @property {string} value_en - Attribute value in English
 * @property {number} sort_order - Display order for attribute sorting
 * @property {string} created_at - ISO timestamp of creation
 * @property {string} updated_at - ISO timestamp of last update
 */

/**
 * @typedef {Object} ProductImage
 * @property {number} id - Unique identifier for the image
 * @property {number} product_id - ID of the product this image belongs to
 * @property {string} image_url - URL of the image
 * @property {string|null} alt_text_ar - Alt text in Arabic
 * @property {string|null} alt_text_en - Alt text in English
 * @property {number} sort_order - Display order for image sorting
 * @property {boolean} is_main - Whether this is the main product image
 * @property {string} created_at - ISO timestamp of creation
 * @property {string} updated_at - ISO timestamp of last update
 */

/**
 * @typedef {Object} BranchInventory
 * @property {number} id - Unique identifier for the inventory record
 * @property {number} branch_id - ID of the branch
 * @property {number} product_id - ID of the product
 * @property {number|null} variant_id - ID of the product variant (if applicable)
 * @property {number} stock_quantity - Current stock quantity
 * @property {number} min_stock_level - Minimum stock level threshold
 * @property {number} reserved_quantity - Reserved quantity
 * @property {number} available_quantity - Available quantity (stock - reserved)
 * @property {string} created_at - ISO timestamp of creation
 * @property {string} updated_at - ISO timestamp of last update
 * @property {string|null} branch_title_ar - Branch title in Arabic
 * @property {string|null} branch_title_en - Branch title in English
 */

/**
 * @typedef {Object} ProductFormData
 * @property {string} title_ar - Product title in Arabic
 * @property {string} title_en - Product title in English
 * @property {string} description_ar - Product description in Arabic
 * @property {string} description_en - Product description in English
 * @property {string} slug - URL-friendly version of the product name
 * @property {string} sku - Stock Keeping Unit identifier
 * @property {number} base_price - Base price of the product
 * @property {number|null} sale_price - Sale price of the product
 * @property {number} loyalty_points - Loyalty points earned when purchasing
 * @property {number} category_id - ID of the category
 * @property {string|null} main_image - Main product image URL
 * @property {boolean} is_featured - Whether the product is featured
 * @property {ProductStatus} status - Product status
 * @property {StockStatus} stock_status - Stock availability status
 * @property {number|null} weight - Product weight in grams
 * @property {number|null} length - Product length in cm
 * @property {number|null} width - Product width in cm
 * @property {number|null} height - Product height in cm
 * @property {string|null} meta_title - SEO meta title
 * @property {string|null} meta_description - SEO meta description
 * @property {string|null} meta_keywords - SEO meta keywords
 * @property {ProductAttribute[]} attributes - Product attributes
 * @property {ProductImage[]} images - Product images
 */

/**
 * @typedef {Object} BranchAssignment
 * @property {number} branch_id - ID of the branch
 * @property {number} stock_quantity - Stock quantity for this branch
 * @property {number} min_stock_level - Minimum stock level for this branch
 */

/**
 * @typedef {Object} ProductResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {Product|Product[]} data - Product data or array of products
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
 * @typedef {Object} ProductListParams
 * @property {number} page - Page number (default: 1)
 * @property {number} limit - Items per page (default: 12)
 * @property {number|null} category_id - Filter by category ID
 * @property {string|null} search - Search term for product titles
 * @property {string} sort - Sort field (default: 'created_at')
 * @property {string} order - Sort order: 'asc' or 'desc' (default: 'desc')
 * @property {boolean|null} is_featured - Filter by featured status
 * @property {number|null} min_price - Minimum price filter
 * @property {number|null} max_price - Maximum price filter
 * @property {ProductStatus|null} status - Filter by product status
 * @property {StockStatus|null} stock_status - Filter by stock status
 */

/**
 * Product status options
 * @typedef {'active'|'inactive'|'draft'|'archived'} ProductStatus
 */

/**
 * Stock status options
 * @typedef {'in_stock'|'out_of_stock'|'low_stock'} StockStatus
 */

/**
 * Sort field options for products
 * @typedef {'created_at'|'title_ar'|'title_en'|'base_price'|'sale_price'|'category_id'} ProductSortField
 */

/**
 * Sort order options
 * @typedef {'asc'|'desc'} SortOrder
 */

export {
  // Type definitions are exported as JSDoc comments for JavaScript projects
  // In TypeScript, these would be actual interface/type exports
};
