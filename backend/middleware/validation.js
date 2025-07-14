const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      message_ar: 'فشل في التحقق من البيانات',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * User registration validation
 */
const validateUserRegistration = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  handleValidationErrors
];

/**
 * User login validation
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Password change validation
 */
const validatePasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * User profile update validation
 */
const validateUserUpdate = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('birth_date')
    .optional()
    .isISO8601()
    .withMessage('Valid birth date is required'),
  body('user_type')
    .optional()
    .isIn(['customer', 'admin', 'staff'])
    .withMessage('User type must be customer, admin, or staff'),
  handleValidationErrors
];

/**
 * User creation validation (Admin/Staff only)
 */
const validateUserCreation = [
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('user_type')
    .optional()
    .isIn(['customer', 'admin', 'staff'])
    .withMessage('User type must be customer, admin, or staff'),
  body('birth_date')
    .optional()
    .isISO8601()
    .withMessage('Valid birth date is required'),
  handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

/**
 * User search and filter validation
 */
const validateUserFilters = [
  query('user_type')
    .optional()
    .isIn(['customer', 'admin', 'staff'])
    .withMessage('User type must be customer, admin, or staff'),
  query('is_active')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('is_active must be true or false'),
  query('is_verified')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('is_verified must be true or false'),
  query('sort_by')
    .optional()
    .isIn(['created_at', 'first_name', 'last_name', 'email', 'last_login_at'])
    .withMessage('Invalid sort field'),
  query('sort_order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  validatePagination,
  handleValidationErrors
];

/**
 * Product creation validation
 */
const validateProductCreation = [
  body('title_ar')
    .trim()
    .notEmpty()
    .withMessage('Arabic title is required'),
  body('title_en')
    .trim()
    .notEmpty()
    .withMessage('English title is required'),
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid category ID is required'),
  body('base_price')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  handleValidationErrors
];

/**
 * Category creation validation
 */
const validateCategoryCreation = [
  body('title_ar')
    .trim()
    .notEmpty()
    .withMessage('Arabic title is required'),
  body('title_en')
    .trim()
    .notEmpty()
    .withMessage('English title is required'),
  body('parent_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent ID must be a positive integer'),
  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  handleValidationErrors
];

/**
 * Order creation validation
 */
const validateOrderCreation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.product_id')
    .isInt({ min: 1 })
    .withMessage('Valid product ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('delivery_address_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid delivery address ID is required'),
  body('payment_method')
    .isIn(['cash', 'card', 'online'])
    .withMessage('Valid payment method is required'),
  body('order_type')
    .isIn(['delivery', 'pickup'])
    .withMessage('Valid order type is required'),
  handleValidationErrors
];

/**
 * Address creation validation
 */
const validateAddressCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Address name is required'),
  body('city_id')
    .isInt({ min: 1 })
    .withMessage('Valid city ID is required'),
  body('area_id')
    .isInt({ min: 1 })
    .withMessage('Valid area ID is required'),
  body('street_id')
    .isInt({ min: 1 })
    .withMessage('Valid street ID is required'),
  body('building_no')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Building number must be less than 20 characters'),
  handleValidationErrors
];

/**
 * Promo code validation
 */
const validatePromoCode = [
  body('code')
    .trim()
    .isAlphanumeric()
    .isLength({ min: 3, max: 20 })
    .withMessage('Promo code must be 3-20 alphanumeric characters'),
  body('discount_type')
    .isIn(['percentage', 'fixed_amount'])
    .withMessage('Valid discount type is required'),
  body('discount_value')
    .isFloat({ min: 0 })
    .withMessage('Discount value must be positive'),
  body('valid_from')
    .isISO8601()
    .withMessage('Valid from date is required'),
  body('valid_until')
    .isISO8601()
    .withMessage('Valid until date is required'),
  handleValidationErrors
];

/**
 * ID parameter validation
 */
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange,
  validateUserUpdate,
  validateUserCreation,
  validateUserFilters,
  validateProductCreation,
  validateCategoryCreation,
  validateOrderCreation,
  validateAddressCreation,
  validatePromoCode,
  validateId,
  validatePagination
};
