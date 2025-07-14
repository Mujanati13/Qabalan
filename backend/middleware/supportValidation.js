const { body, validationResult } = require('express-validator');

// Validation for creating support tickets
const validateSupportTicket = [
  body('subject')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Subject must be between 5 and 255 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Message must be between 10 and 5000 characters'),
  
  body('category')
    .optional()
    .isIn(['complaint', 'inquiry', 'compliment', 'technical', 'order_issue', 'other'])
    .withMessage('Invalid category'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  
  body('order_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order ID must be a positive integer'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation for feedback
const validateFeedback = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('subject')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Subject must be between 5 and 255 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  
  body('category')
    .optional()
    .isIn(['service', 'food_quality', 'delivery', 'app_experience', 'general'])
    .withMessage('Invalid category'),
  
  body('order_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order ID must be a positive integer'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation for replies
const validateReply = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters'),
  
  body('is_internal_note')
    .optional()
    .isBoolean()
    .withMessage('is_internal_note must be a boolean'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation for ticket status update
const validateTicketStatus = [
  body('status')
    .isIn(['open', 'in_progress', 'resolved', 'closed'])
    .withMessage('Invalid status'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation for ticket assignment
const validateTicketAssignment = [
  body('admin_id')
    .isInt({ min: 1 })
    .withMessage('Admin ID must be a positive integer'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation for feedback response
const validateFeedbackResponse = [
  body('response')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Response must be between 1 and 2000 characters'),
  
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Invalid status'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateSupportTicket,
  validateFeedback,
  validateReply,
  validateTicketStatus,
  validateTicketAssignment,
  validateFeedbackResponse
};
