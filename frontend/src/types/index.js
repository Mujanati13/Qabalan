/**
 * Type definitions index for the FECS e-commerce admin dashboard
 * 
 * This file exports all type definitions used throughout the application.
 * Since this is a JavaScript project, types are defined using JSDoc comments.
 * 
 * For TypeScript migration, these would become actual TypeScript interfaces and types.
 */

// Import all type definition files
import './category.js';
import './product.js';
import './branch.js';

/**
 * Common response structure for API calls
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {*} data - Response data (type varies by endpoint)
 * @property {string} message - Success/error message in English
 * @property {string} message_ar - Success/error message in Arabic
 * @property {string|null} stack - Error stack trace (only in development)
 * @property {Object|null} error - Error details
 */

/**
 * Pagination metadata
 * @typedef {Object} PaginationMeta
 * @property {number} page - Current page number
 * @property {number} limit - Items per page
 * @property {number} total - Total number of items
 * @property {number} totalPages - Total number of pages
 * @property {boolean} hasNext - Whether there's a next page
 * @property {boolean} hasPrev - Whether there's a previous page
 */

/**
 * Common list parameters for paginated endpoints
 * @typedef {Object} ListParams
 * @property {number} page - Page number (default: 1)
 * @property {number} limit - Items per page
 * @property {string|null} search - Search term
 * @property {string} sort - Sort field
 * @property {string} order - Sort order: 'asc' or 'desc'
 */

/**
 * Common entity status
 * @typedef {'active'|'inactive'} EntityStatus
 */

/**
 * Common form validation error
 * @typedef {Object} ValidationError
 * @property {string} field - Field name that has error
 * @property {string} message - Error message
 * @property {string} message_ar - Error message in Arabic
 */

/**
 * User authentication data
 * @typedef {Object} AuthUser
 * @property {number} id - User ID
 * @property {string} email - User email
 * @property {string} first_name - User first name
 * @property {string} last_name - User last name
 * @property {string} user_type - User type (admin, staff, customer)
 * @property {boolean} is_active - Whether user is active
 * @property {string} token - JWT authentication token
 */

/**
 * Application language
 * @typedef {'en'|'ar'} AppLanguage
 */

/**
 * Theme mode
 * @typedef {'light'|'dark'} ThemeMode
 */

export {};
