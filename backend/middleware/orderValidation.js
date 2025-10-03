/**
 * Order validation middleware
 * Provides common validation functions for order-related operations
 */

const { executeQuery } = require('../config/database');

/**
 * Validate order items structure and requirements
 */
const validateOrderItems = (req, res, next) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Order items are required and must be an array',
      message_ar: 'عناصر الطلب مطلوبة ويجب أن تكون مصفوفة'
    });
  }

  // Validate each item structure
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (!item.product_id || typeof item.product_id !== 'number') {
      return res.status(400).json({
        success: false,
        message: `Item ${i + 1}: product_id is required and must be a number`,
        message_ar: `العنصر ${i + 1}: معرف المنتج مطلوب ويجب أن يكون رقماً`
      });
    }

    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: `Item ${i + 1}: quantity is required and must be a positive number`,
        message_ar: `العنصر ${i + 1}: الكمية مطلوبة ويجب أن تكون رقماً موجباً`
      });
    }

    if (item.variant_id && typeof item.variant_id !== 'number') {
      return res.status(400).json({
        success: false,
        message: `Item ${i + 1}: variant_id must be a number if provided`,
        message_ar: `العنصر ${i + 1}: معرف المتغير يجب أن يكون رقماً إذا تم توفيره`
      });
    }
  }

  next();
};

/**
 * Validate order customer information
 */
const validateCustomerInfo = (req, res, next) => {
  const { customer_name, customer_phone, customer_email } = req.body;

  if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Customer name is required and must be at least 2 characters',
      message_ar: 'اسم العميل مطلوب ويجب أن يكون على الأقل حرفين'
    });
  }

  if (!customer_phone || typeof customer_phone !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Customer phone is required',
      message_ar: 'هاتف العميل مطلوب'
    });
  }

  // Basic phone validation (Lebanese format)
  const phoneRegex = /^(\+961|961|0)?[3-9]\d{6,7}$/;
  if (!phoneRegex.test(customer_phone.replace(/[\s-]/g, ''))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format',
      message_ar: 'تنسيق رقم الهاتف غير صالح'
    });
  }

  // Email validation if provided
  if (customer_email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        message_ar: 'تنسيق البريد الإلكتروني غير صالح'
      });
    }
  }

  next();
};

/**
 * Validate order type and delivery requirements
 */
const validateOrderType = (req, res, next) => {
  const { order_type, delivery_address_id } = req.body;

  if (!order_type || !['delivery', 'pickup'].includes(order_type)) {
    return res.status(400).json({
      success: false,
      message: 'Order type must be either "delivery" or "pickup"',
      message_ar: 'نوع الطلب يجب أن يكون "توصيل" أو "استلام"'
    });
  }

  // Validate delivery address for delivery orders
  if (order_type === 'delivery') {
    const { is_guest, guest_delivery_address } = req.body;
    const isGuestOrder = is_guest || !req.user;
    
    if (isGuestOrder) {
      // For guest orders, require guest_delivery_address (can be string or object)
      if (!guest_delivery_address || 
          (typeof guest_delivery_address === 'string' && !guest_delivery_address.trim()) ||
          (typeof guest_delivery_address === 'object' && (!guest_delivery_address.address || !guest_delivery_address.address.trim()))) {
        return res.status(400).json({
          success: false,
          message: 'Delivery address is required for delivery orders',
          message_ar: 'عنوان التوصيل مطلوب لطلبات التوصيل'
        });
      }
    } else {
      // For authenticated users, require delivery_address_id
      if (!delivery_address_id) {
        return res.status(400).json({
          success: false,
          message: 'Delivery address is required for delivery orders',
          message_ar: 'عنوان التوصيل مطلوب لطلبات التوصيل'
        });
      }
    }
  }

  next();
};

/**
 * Validate payment method
 */
const validatePaymentMethod = (req, res, next) => {
  const { payment_method } = req.body;

  if (!payment_method || !['cash', 'card', 'online'].includes(payment_method)) {
    return res.status(400).json({
      success: false,
      message: 'Payment method must be "cash", "card", or "online"',
      message_ar: 'طريقة الدفع يجب أن تكون "نقداً" أو "بطاقة" أو "عبر الإنترنت"'
    });
  }

  next();
};

/**
 * Validate order status for updates
 */
const validateOrderStatus = (req, res, next) => {
  const { status } = req.body;

  // Allow any status - validation removed per user request
  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required',
      message_ar: 'الحالة مطلوبة'
    });
  }

  next();
};

/**
 * Validate promo code format
 */
const validatePromoCode = (req, res, next) => {
  const { promo_code } = req.body;

  if (promo_code && (typeof promo_code !== 'string' || promo_code.trim().length < 3)) {
    return res.status(400).json({
      success: false,
      message: 'Promo code must be at least 3 characters',
      message_ar: 'كود الخصم يجب أن يكون على الأقل 3 أحرف'
    });
  }

  next();
};

/**
 * Validate points usage
 */
const sanitizePointsRequest = (value) => {
  if (value === undefined || value === null) {
    return 0;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.floor(numeric));
};

const validatePointsUsage = async (req, res, next) => {
  try {
    const rawPoints = req.body?.points_to_use ?? 0;
    const sanitizedPoints = sanitizePointsRequest(rawPoints);

    req.body.points_to_use = sanitizedPoints;

    if (sanitizedPoints === 0) {
      return next();
    }

    const isAdmin = req.user && ['admin', 'staff'].includes(req.user.user_type);

    let pointsUserId = null;

    if (!req.user && !isAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to redeem loyalty points',
        message_ar: 'يجب تسجيل الدخول لاستخدام نقاط الولاء'
      });
    }

    if (isAdmin) {
      const customerId = sanitizePointsRequest(req.body.customer_id);
      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required to redeem points on behalf of a customer',
          message_ar: 'مطلوب معرف العميل لاستخدام النقاط بالنيابة عن العميل'
        });
      }
      pointsUserId = customerId;
    } else {
      pointsUserId = req.user.id;
    }

    const [userPoints] = await executeQuery(
      'SELECT available_points FROM user_loyalty_points WHERE user_id = ? LIMIT 1',
      [pointsUserId]
    );

    const availablePoints = Math.max(Number(userPoints?.available_points || 0), 0);

    if (sanitizedPoints > availablePoints) {
      return res.status(400).json({
        success: false,
        message: `Insufficient points. Available: ${availablePoints}, Requested: ${sanitizedPoints}`,
        message_ar: `نقاط غير كافية. المتاح: ${availablePoints}، المطلوب: ${sanitizedPoints}`
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate bulk operation data
 */
const validateBulkOperation = (req, res, next) => {
  const { order_ids } = req.body;

  if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Order IDs array is required and must not be empty',
      message_ar: 'مصفوفة معرفات الطلبات مطلوبة ولا يجب أن تكون فارغة'
    });
  }

  // Validate that all IDs are numbers
  const invalidIds = order_ids.filter(id => typeof id !== 'number' || id <= 0);
  if (invalidIds.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'All order IDs must be positive numbers',
      message_ar: 'جميع معرفات الطلبات يجب أن تكون أرقاماً موجبة'
    });
  }

  // Limit bulk operations to reasonable size
  if (order_ids.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Bulk operations are limited to 100 orders at a time',
      message_ar: 'العمليات المجمعة محدودة بـ 100 طلب في المرة الواحدة'
    });
  }

  next();
};

module.exports = {
  validateOrderItems,
  validateCustomerInfo,
  validateOrderType,
  validatePaymentMethod,
  validateOrderStatus,
  validatePromoCode,
  validatePointsUsage,
  validateBulkOperation
};
