/**
 * Notification validation middleware
 */

/**
 * Validate notification data
 */
const validateNotification = (req, res, next) => {
  const {
    title_ar,
    title_en,
    message_ar,
    message_en,
    type,
    recipient_type
  } = req.body;

  const errors = [];

  // Title validation
  if (!title_ar || typeof title_ar !== 'string' || title_ar.trim().length < 3) {
    errors.push('Arabic title must be at least 3 characters long');
  }

  if (!title_en || typeof title_en !== 'string' || title_en.trim().length < 3) {
    errors.push('English title must be at least 3 characters long');
  }

  // Message validation
  if (!message_ar || typeof message_ar !== 'string' || message_ar.trim().length < 10) {
    errors.push('Arabic message must be at least 10 characters long');
  }

  if (!message_en || typeof message_en !== 'string' || message_en.trim().length < 10) {
    errors.push('English message must be at least 10 characters long');
  }

  // Type validation
  if (type && !['general', 'order', 'promotion', 'system'].includes(type)) {
    errors.push('Type must be one of: general, order, promotion, system');
  }

  // Recipient type validation for admin send
  if (req.route.path.includes('/admin/send')) {
    if (!recipient_type || !['user', 'users', 'broadcast', 'topic'].includes(recipient_type)) {
      errors.push('Recipient type must be one of: user, users, broadcast, topic');
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
 * Validate FCM token registration
 */
const validateFCMToken = (req, res, next) => {
  const {
    token,
    device_type,
    device_id,
    app_version
  } = req.body;

  const errors = [];

  // Token validation
  if (!token || typeof token !== 'string' || token.trim().length < 10) {
    errors.push('Valid FCM token is required');
  }

  // Device type validation
  if (!device_type || !['android', 'ios', 'web'].includes(device_type)) {
    errors.push('Device type must be one of: android, ios, web');
  }

  // Device ID validation (optional but if provided should be valid)
  if (device_id && (typeof device_id !== 'string' || device_id.trim().length < 3)) {
    errors.push('Device ID must be at least 3 characters long if provided');
  }

  // App version validation (optional but if provided should be valid)
  if (app_version && (typeof app_version !== 'string' || !/^\d+\.\d+(\.\d+)?$/.test(app_version))) {
    errors.push('App version must be in format x.y.z if provided');
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
 * Validate topic name
 */
const validateTopic = (req, res, next) => {
  const { topic } = req.body;

  if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Topic name must be at least 3 characters long',
      message_ar: 'اسم الموضوع يجب أن يكون 3 أحرف على الأقل'
    });
  }

  // Topic name should only contain alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(topic.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Topic name can only contain letters, numbers, hyphens, and underscores',
      message_ar: 'اسم الموضوع يمكن أن يحتوي فقط على أحرف وأرقام وشرطات وشرطات سفلية'
    });
  }

  next();
};

/**
 * Validate notification filters
 */
const validateNotificationFilters = (req, res, next) => {
  const { type, status, device_type, active } = req.query;

  // Type filter validation
  if (type && !['all', 'general', 'order', 'promotion', 'system'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Type filter must be one of: all, general, order, promotion, system',
      message_ar: 'مرشح النوع يجب أن يكون واحداً من: الكل، عام، طلب، ترويج، نظام'
    });
  }

  // Status filter validation
  if (status && !['all', 'pending', 'sent', 'delivered', 'failed', 'clicked'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status filter must be one of: all, pending, sent, delivered, failed, clicked',
      message_ar: 'مرشح الحالة يجب أن يكون واحداً من: الكل، في الانتظار، مرسل، مُسلم، فشل، نقر'
    });
  }

  // Device type filter validation
  if (device_type && !['all', 'android', 'ios', 'web'].includes(device_type)) {
    return res.status(400).json({
      success: false,
      message: 'Device type filter must be one of: all, android, ios, web',
      message_ar: 'مرشح نوع الجهاز يجب أن يكون واحداً من: الكل، أندرويد، آيفون، ويب'
    });
  }

  // Active filter validation
  if (active && !['all', 'true', 'false'].includes(active)) {
    return res.status(400).json({
      success: false,
      message: 'Active filter must be one of: all, true, false',
      message_ar: 'مرشح النشط يجب أن يكون واحداً من: الكل، صحيح، خطأ'
    });
  }

  next();
};

module.exports = {
  validateNotification,
  validateFCMToken,
  validateTopic,
  validateNotificationFilters
};
