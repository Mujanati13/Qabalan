/**
 * Branch interface definitions for the FECS e-commerce admin dashboard
 */

/**
 * @typedef {Object} Branch
 * @property {number} id - Unique identifier for the branch
 * @property {string} title_ar - Branch title in Arabic
 * @property {string} title_en - Branch title in English
 * @property {string|null} phone - Branch phone number
 * @property {string|null} email - Branch email address
 * @property {string|null} address_ar - Branch address in Arabic
 * @property {string|null} address_en - Branch address in English
 * @property {number|null} latitude - Latitude coordinate
 * @property {number|null} longitude - Longitude coordinate
 * @property {string|null} working_hours_ar - Working hours in Arabic
 * @property {string|null} working_hours_en - Working hours in English
 * @property {boolean} is_active - Whether the branch is active
 * @property {string} created_at - ISO timestamp of creation
 * @property {string} updated_at - ISO timestamp of last update
 */

/**
 * @typedef {Object} BranchFormData
 * @property {string} title_ar - Branch title in Arabic
 * @property {string} title_en - Branch title in English
 * @property {string} phone - Branch phone number
 * @property {string} email - Branch email address
 * @property {string} address_ar - Branch address in Arabic
 * @property {string} address_en - Branch address in English
 * @property {number|null} latitude - Latitude coordinate
 * @property {number|null} longitude - Longitude coordinate
 * @property {string|null} working_hours_ar - Working hours in Arabic
 * @property {string|null} working_hours_en - Working hours in English
 * @property {boolean} is_active - Whether the branch is active
 */

/**
 * @typedef {Object} BranchResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {Branch|Branch[]} data - Branch data or array of branches
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
 * @typedef {Object} BranchListParams
 * @property {number} page - Page number (default: 1)
 * @property {number} limit - Items per page (default: 20)
 * @property {string|null} search - Search term for branch titles
 * @property {boolean} include_inactive - Include inactive branches (default: false)
 */

/**
 * Branch status options
 * @typedef {'active'|'inactive'} BranchStatus
 */

export {
  // Type definitions are exported as JSDoc comments for JavaScript projects
  // In TypeScript, these would be actual interface/type exports
};
