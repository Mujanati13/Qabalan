/**
 * Promo Code Validation Middleware
 */

/**
 * Validate promo code creation/update data
 */
const validatePromoCode = (req, res, next) => {
  const {
    code,
    discount_type,
    discount_value,
    valid_from,
    valid_until,
    min_order_amount,
    max_discount_amount,
    usage_limit,
    user_usage_limit
  } = req.body;

  const errors = [];

  // Code validation
  if (req.method === 'POST' && !code) {
    errors.push('Code is required');
  }

  if (code && (typeof code !== 'string' || code.trim().length < 3)) {
    errors.push('Code must be at least 3 characters long');
  }

  if (code && !/^[A-Z0-9_-]+$/i.test(code.trim())) {
    errors.push('Code can only contain letters, numbers, underscores, and hyphens');
  }

  // Discount type validation
  if (req.method === 'POST' && !discount_type) {
    errors.push('Discount type is required');
  }

  if (discount_type && !['percentage', 'fixed_amount'].includes(discount_type)) {
    errors.push('Discount type must be either "percentage" or "fixed_amount"');
  }

  // Discount value validation
  if (req.method === 'POST' && (discount_value === undefined || discount_value === null || discount_value === '')) {
    errors.push('Discount value is required');
  }

  if (discount_value !== undefined && discount_value !== null && discount_value !== '') {
    // Convert string to number if needed
    const numericValue = typeof discount_value === 'string' ? parseFloat(discount_value) : discount_value;
    
    if (isNaN(numericValue) || numericValue <= 0) {
      errors.push('Discount value must be a positive number');
    } else {
      // Update the request body with the numeric value
      req.body.discount_value = numericValue;
      
      if (discount_type === 'percentage' && numericValue > 100) {
        errors.push('Percentage discount cannot exceed 100%');
      }
    }
  }

  // Date validation
  if (req.method === 'POST' && (!valid_from || !valid_until)) {
    errors.push('Valid from and valid until dates are required');
  }

  if (valid_from && valid_until) {
    const fromDate = new Date(valid_from);
    const untilDate = new Date(valid_until);
    const now = new Date();

    if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
      errors.push('Invalid date format');
    } else {
      // Check if valid_until is after valid_from (not equal)
      if (fromDate >= untilDate) {
        errors.push('Valid until date must be after valid from date');
      }

      // For updates, allow past dates if the promo was already created
      // For new promos, only require valid_until to be in future
      if (req.method === 'POST' && untilDate <= now) {
        errors.push('Valid until date must be in the future');
      }
    }
  }

  // Minimum order amount validation
  if (min_order_amount !== undefined && min_order_amount !== null && min_order_amount !== '') {
    const numericValue = typeof min_order_amount === 'string' ? parseFloat(min_order_amount) : min_order_amount;
    if (isNaN(numericValue) || numericValue < 0) {
      errors.push('Minimum order amount must be a non-negative number');
    } else {
      req.body.min_order_amount = numericValue;
    }
  }

  // Maximum discount amount validation
  if (max_discount_amount !== undefined && max_discount_amount !== null && max_discount_amount !== '') {
    const numericValue = typeof max_discount_amount === 'string' ? parseFloat(max_discount_amount) : max_discount_amount;
    if (isNaN(numericValue) || numericValue <= 0) {
      errors.push('Maximum discount amount must be a positive number');
    } else {
      req.body.max_discount_amount = numericValue;
    }
  }

  // Usage limits validation
  if (usage_limit !== undefined && usage_limit !== null && usage_limit !== '') {
    const numericValue = typeof usage_limit === 'string' ? parseInt(usage_limit) : usage_limit;
    if (!Number.isInteger(numericValue) || numericValue <= 0) {
      errors.push('Usage limit must be a positive integer');
    } else {
      req.body.usage_limit = numericValue;
    }
  }

  if (user_usage_limit !== undefined && user_usage_limit !== null && user_usage_limit !== '') {
    const numericValue = typeof user_usage_limit === 'string' ? parseInt(user_usage_limit) : user_usage_limit;
    if (!Number.isInteger(numericValue) || numericValue <= 0) {
      errors.push('User usage limit must be a positive integer');
    } else {
      req.body.user_usage_limit = numericValue;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      message_ar: 'فشل في التحقق من صحة البيانات',
      errors
    });
  }

  next();
};

/**
 * Validate promo code application data
 */
const validatePromoApplication = (req, res, next) => {
  const { code, order_total } = req.body;

  const errors = [];

  // Code validation
  if (!code) {
    errors.push('Promo code is required');
  }

  if (code && (typeof code !== 'string' || code.trim().length === 0)) {
    errors.push('Promo code must be a non-empty string');
  }

  // Order total validation
  if (order_total !== undefined && order_total !== null) {
    if (typeof order_total !== 'number' || order_total < 0) {
      errors.push('Order total must be a non-negative number');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      message_ar: 'فشل في التحقق من صحة البيانات',
      errors
    });
  }

  next();
};

/**
 * Validate promo code filters for listing
 */
const validatePromoFilters = (req, res, next) => {
  const { status, type, sort, order } = req.query;

  const errors = [];

  // Status filter validation
  if (status && !['all', 'active', 'inactive', 'expired', 'upcoming'].includes(status)) {
    errors.push('Status must be one of: all, active, inactive, expired, upcoming');
  }

  // Type filter validation
  if (type && !['all', 'percentage', 'fixed_amount'].includes(type)) {
    errors.push('Type must be one of: all, percentage, fixed_amount');
  }

  // Sort field validation
  const allowedSortFields = ['created_at', 'code', 'discount_value', 'usage_count', 'valid_from', 'valid_until'];
  if (sort && !allowedSortFields.includes(sort)) {
    errors.push(`Sort field must be one of: ${allowedSortFields.join(', ')}`);
  }

  // Order validation
  if (order && !['asc', 'desc'].includes(order.toLowerCase())) {
    errors.push('Order must be either "asc" or "desc"');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid filter parameters',
      message_ar: 'معاملات تصفية غير صالحة',
      errors
    });
  }

  next();
};

/**
 * Validate date range for reports
 */
const validateDateRange = (req, res, next) => {
  const { start_date, end_date } = req.query;

  const errors = [];

  if (start_date) {
    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid start date format');
    }
  }

  if (end_date) {
    const endDate = new Date(end_date);
    if (isNaN(endDate.getTime())) {
      errors.push('Invalid end date format');
    }
  }

  if (start_date && end_date) {
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate >= endDate) {
      errors.push('End date must be after start date');
    }

    // Check if date range is too large (more than 1 year)
    const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      errors.push('Date range cannot exceed 365 days');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date range',
      message_ar: 'نطاق التاريخ غير صالح',
      errors
    });
  }

  next();
};

module.exports = {
  validatePromoCode,
  validatePromoApplication,
  validatePromoFilters,
  validateDateRange
};
