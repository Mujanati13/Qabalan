const express = require('express');
const { executeQuery, executeTransaction, getPaginatedResults } = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');
const {
  validateOrderItems,
  validateCustomerInfo,
  validateOrderType,
  validatePaymentMethod,
  validateOrderStatus,
  validatePromoCode,
  validatePointsUsage,
  validateBulkOperation
} = require('../middleware/orderValidation');
const shippingService = require('../services/shippingService');

const router = express.Router();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate unique order number
 */
const generateOrderNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  
  // Get the last order number for this year
  const [lastOrder] = await executeQuery(
    `SELECT order_number FROM orders 
     WHERE order_number LIKE ? 
     ORDER BY created_at DESC LIMIT 1`,
    [`${prefix}%`]
  );
  
  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.order_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
};

/**
 * Calculate delivery fee using enhanced shipping system
 * Supports both legacy area-based and new distance-based calculation.
 * If coordinates are provided but branch_id is missing, automatically uses the nearest branch.
 */
const calculateDeliveryFee = async (customerData, orderType = 'delivery', orderAmount = 0) => {
  if (orderType === 'pickup') {
    return { 
      delivery_fee: 0, 
      calculation_method: 'pickup',
      free_shipping_applied: false
    };
  }

  try {
    console.log('🚚 Delivery fee calculation started:', {
      customerData,
      orderType,
      orderAmount,
      hasCoordinates: !!(customerData.latitude && customerData.longitude),
      hasBranchId: !!customerData.branch_id,
      hasAreaId: !!customerData.area_id
    });

    // Enhanced shipping calculation with coordinates
    if (customerData.latitude && customerData.longitude) {
      // Use provided branch_id or auto-pick nearest branch when missing
      let branchId = customerData.branch_id;
      if (!branchId) {
        console.log('🔍 No branch_id provided, finding nearest branch...');
        try {
          const nearest = await shippingService.getNearestBranch(
            customerData.latitude,
            customerData.longitude
          );
          branchId = nearest?.id;
          console.log('🎯 Nearest branch found:', branchId);
        } catch (e) {
          console.log('⚠️ Nearest branch lookup failed:', e.message);
          console.log('⚠️ Falling back to area-based calculation');
          // Fall through to area-based if nearest branch lookup fails
          branchId = null;
        }
      } else {
        console.log('🏢 Using provided branch_id:', branchId);
      }

      if (branchId) {
        console.log('📏 Calculating distance-based shipping from branch', branchId, 'to customer coordinates:', {
          lat: customerData.latitude,
          lng: customerData.longitude
        });
        
        try {
          const calculation = await shippingService.calculateShipping(
            customerData.latitude,
            customerData.longitude,
            branchId,
            orderAmount
          );

          console.log('✅ Distance-based calculation completed:', {
            distance: calculation.distance_km,
            zone: calculation.zone_name_en,
            deliveryFee: calculation.total_cost,
            fullCalculation: calculation
          });

          return {
            delivery_fee: calculation.total_cost,
            calculation_method: 'distance_based',
            distance_km: calculation.distance_km,
            zone_name: calculation.zone_name_en || calculation.zone?.name_en,
            free_shipping_applied: calculation.free_shipping_applied,
            shipping_calculation_id: calculation.calculation_id,
            branch_id: branchId
          };
        } catch (shippingError) {
          console.error('💥 Distance-based shipping calculation failed:', shippingError.message);
          console.log('🔄 Falling back to area-based calculation');
          // Continue to area-based fallback
        }
      }
    }

    // Fallback to legacy area-based calculation
    if (customerData.area_id) {
      console.log('📍 Using area-based calculation for area_id:', customerData.area_id);
      const [area] = await executeQuery(
        'SELECT delivery_fee FROM areas WHERE id = ? AND is_active = 1',
        [customerData.area_id]
      );
      
      console.log('🏢 Area lookup result:', area);
      const areaFee = area ? parseFloat(area.delivery_fee) : 0;
      console.log('💰 Area-based delivery fee calculated:', areaFee);
      
      return {
        delivery_fee: areaFee,
        calculation_method: 'area_based',
        free_shipping_applied: false
      };
    }

    // No delivery location provided
    console.log('❌ No delivery location data provided - returning 0 fee');
    return {
      delivery_fee: 0,
      calculation_method: 'unknown',
      free_shipping_applied: false
    };

  } catch (error) {
    console.error('💥 Error calculating delivery fee:', error.message);
    console.error('📊 Error details:', {
      customerData,
      orderType,
      orderAmount,
      errorStack: error.stack
    });
    
    // Fallback to area-based if distance calculation fails
    if (customerData.area_id) {
      console.log('🔄 Attempting area-based fallback calculation...');
      try {
        const [area] = await executeQuery(
          'SELECT delivery_fee FROM areas WHERE id = ? AND is_active = 1',
          [customerData.area_id]
        );
        
        const areaFee = area ? parseFloat(area.delivery_fee) : 0;
        console.log('✅ Fallback area-based fee calculated:', areaFee);
        
        return {
          delivery_fee: areaFee,
          calculation_method: 'area_based_fallback',
          free_shipping_applied: false,
          error_occurred: true
        };
      } catch (fallbackError) {
        console.error('💥 Area-based fallback also failed:', fallbackError.message);
      }
    }

    // Ultimate fallback
    console.log('⚠️ All delivery calculations failed, returning 0');
    return {
      delivery_fee: 0,
      calculation_method: 'error_fallback',
      free_shipping_applied: false,
      error_occurred: true
    };
  }
};

/**
 * Validate and apply promo code
 */
const applyPromoCode = async (code, subtotal, userId) => {
  if (!code) return null;
  
  const [promo] = await executeQuery(
    `SELECT * FROM promo_codes 
     WHERE code = ? AND is_active = 1 
     AND valid_from <= NOW() AND valid_until >= NOW()`,
    [code]
  );
  
  if (!promo) {
    throw new Error('Invalid or expired promo code');
  }
  
  // Check minimum order amount
  if (promo.min_order_amount && subtotal < promo.min_order_amount) {
    throw new Error(`Minimum order amount of ${promo.min_order_amount} required for this promo code`);
  }
  
  // Check usage limits
  if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
    throw new Error('Promo code usage limit exceeded');
  }
  
  // Check user usage limit (skip for guest users)
  if (promo.user_usage_limit && userId) {
    const [userUsage] = await executeQuery(
      'SELECT COUNT(*) as count FROM promo_code_usages WHERE promo_code_id = ? AND user_id = ?',
      [promo.id, userId]
    );
    
    if (userUsage.count >= promo.user_usage_limit) {
      throw new Error('You have already used this promo code the maximum number of times');
    }
  }
  
  // Calculate discount based on promo type
  let discountAmount = 0;
  
  switch (promo.discount_type) {
    case 'percentage':
      discountAmount = subtotal * (promo.discount_value / 100);
      break;
    case 'fixed_amount':
      discountAmount = promo.discount_value;
      break;
    case 'free_shipping':
      // Free shipping promos don't affect subtotal discount, handled separately
      discountAmount = 0;
      break;
    case 'bxgy':
      // Buy X Get Y promos need item-level calculation, for now treat as 0
      // This should be implemented based on cart items
      discountAmount = 0;
      break;
    default:
      // Legacy support: treat unknown types as fixed amount
      discountAmount = promo.discount_value;
      break;
  }
  
  // Apply maximum discount limit
  if (promo.max_discount_amount && discountAmount > promo.max_discount_amount) {
    discountAmount = promo.max_discount_amount;
  }
  
  return {
    promo,
    discountAmount: Math.min(discountAmount, subtotal)
  };
};

/**
 * Calculate loyalty points earned
 */
const calculatePointsEarned = (subtotal) => {
  // 1 point per 1000 currency units (configurable)
  const pointsRate = 1000; // This could come from app_settings
  return Math.floor(subtotal / pointsRate);
};

/**
 * Validate order items and calculate totals
 */
const validateAndCalculateOrderItems = async (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order must contain at least one item');
  }
  
  const validatedItems = [];
  let subtotal = 0;
  let totalPointsEarned = 0;
  
  for (const item of items) {
    const { product_id, variant_id, quantity, special_instructions } = item;
    
    if (!product_id || !quantity || quantity <= 0) {
      throw new Error('Invalid item: product_id and positive quantity required');
    }
    
    // Get product details
    const [product] = await executeQuery(
      `SELECT p.id, p.title_ar, p.title_en, p.base_price, p.sale_price, 
              p.loyalty_points, p.is_active, p.stock_status
       FROM products p WHERE p.id = ? AND p.is_active = 1`,
      [product_id]
    );
    
    if (!product) {
      throw new Error(`Product with ID ${product_id} not found or inactive`);
    }
    
    if (product.stock_status === 'out_of_stock') {
      throw new Error(`Product "${product.title_en}" is out of stock`);
    }
    
    let unitPrice = product.sale_price || product.base_price;
    let pointsPerItem = product.loyalty_points;
    
    // If variant specified, get variant details
    if (variant_id) {
      const [variant] = await executeQuery(
        `SELECT id, title_ar, title_en, price, stock_quantity, is_active
         FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1`,
        [variant_id, product_id]
      );
      
      if (!variant) {
        throw new Error(`Product variant with ID ${variant_id} not found or inactive`);
      }
      
      if (variant.stock_quantity < quantity) {
        throw new Error(`Insufficient stock for variant with ID ${variant_id}`);
      }
      
      unitPrice = variant.price;
    }
    
    const totalPrice = unitPrice * quantity;
    const itemPointsEarned = pointsPerItem * quantity;
    
    validatedItems.push({
      product_id,
      variant_id: variant_id || null,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      points_earned: itemPointsEarned,
      special_instructions: special_instructions || null
    });
    
    subtotal += totalPrice;
    totalPointsEarned += itemPointsEarned;
  }
  
  return {
    items: validatedItems,
    subtotal,
    pointsEarned: totalPointsEarned
  };
};

/**
 * Check if status transition is valid (relaxed for admin users)
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
  // Allow all status transitions for admin users to provide more flexibility
  // Only prevent transitions that are logically impossible
  if (currentStatus === newStatus) {
    return false; // No change
  }
  
  // Allow most transitions except some logical restrictions
  if (currentStatus === 'delivered' && newStatus !== 'cancelled') {
    return false; // Can only cancel delivered orders
  }
  
  if (currentStatus === 'cancelled' && newStatus === 'delivered') {
    return false; // Cannot deliver cancelled orders
  }
  
  return true; // Allow all other transitions
};

// =============================================================================
// NOTIFICATION SERVICE
// =============================================================================

const notificationService = require('../services/notificationService');

/**
 * Send order status change notification to customer
 */
const sendOrderStatusNotification = async (order, newStatus, oldStatus) => {
  try {
    if (!order.user_id || newStatus === oldStatus) {
      return;
    }

    // Define notification messages for each status
    const statusMessages = {
      confirmed: {
        title_en: 'Order Confirmed',
        title_ar: 'تم تأكيد الطلب',
        message_en: `Your order #${order.order_number} has been confirmed and is being prepared.`,
        message_ar: `تم تأكيد طلبك رقم #${order.order_number} وجاري تحضيره.`,
        type: 'order'
      },
      preparing: {
        title_en: 'Order Being Prepared',
        title_ar: 'جاري تحضير الطلب',
        message_en: `Your order #${order.order_number} is being prepared in our kitchen.`,
        message_ar: `جاري تحضير طلبك رقم #${order.order_number} في مطبخنا.`,
        type: 'order'
      },
      ready: {
        title_en: 'Order Ready',
        title_ar: 'الطلب جاهز',
        message_en: `Your order #${order.order_number} is ready!`,
        message_ar: `طلبك رقم #${order.order_number} جاهز!`,
        type: 'order'
      },
      ready_for_pickup: {
        title_en: 'Order Ready for Pickup',
        title_ar: 'الطلب جاهز للاستلام',
        message_en: `Your order #${order.order_number} is ready for pickup!`,
        message_ar: `طلبك رقم #${order.order_number} جاهز للاستلام!`,
        type: 'order'
      },
      out_for_delivery: {
        title_en: 'Order Out for Delivery',
        title_ar: 'الطلب في الطريق',
        message_en: `Your order #${order.order_number} is out for delivery and will arrive soon.`,
        message_ar: `طلبك رقم #${order.order_number} في الطريق وسيصل قريباً.`,
        type: 'order'
      },
      delivered: {
        title_en: 'Order Delivered',
        title_ar: 'تم توصيل الطلب',
        message_en: `Your order #${order.order_number} has been delivered. Enjoy your meal!`,
        message_ar: `تم توصيل طلبك رقم #${order.order_number}. نتمنى لك وجبة شهية!`,
        type: 'order'
      },
      cancelled: {
        title_en: 'Order Cancelled',
        title_ar: 'تم إلغاء الطلب',
        message_en: `Your order #${order.order_number} has been cancelled.`,
        message_ar: `تم إلغاء طلبك رقم #${order.order_number}.`,
        type: 'order'
      }
    };

    const notification = statusMessages[newStatus];
    if (notification) {
      const data = {
        order_id: order.id.toString(),
        order_number: order.order_number,
        status: newStatus,
        old_status: oldStatus
      };

      await notificationService.sendToUser(order.user_id, notification, data);
      console.log(`Order status notification sent to user ${order.user_id} for order ${order.order_number}: ${oldStatus} -> ${newStatus}`);
    }
  } catch (error) {
    console.error('Error sending order status notification:', error);
    // Don't throw error to avoid breaking order status update
  }
};

/**
 * Send order creation notification to customer
 */
const sendOrderCreationNotification = async (order, isAdminCreated = false) => {
  try {
    console.log('\n🔔 [NOTIFICATION DEBUG] Starting sendOrderCreationNotification...');
    console.log('🔔 [NOTIFICATION DEBUG] Order data:', {
      id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      total_amount: order.total_amount,
      isAdminCreated
    });

    // Skip if no user (guest order) or no order data
    if (!order.user_id || !order.order_number) {
      console.log('🔔 [NOTIFICATION DEBUG] ❌ Skipping notification: missing data', { 
        user_id: order.user_id, 
        order_number: order.order_number 
      });
      return;
    }

    // Check if customer has FCM tokens
    const tokens = await executeQuery(`
      SELECT token, device_type, is_active 
      FROM user_fcm_tokens 
      WHERE user_id = ? AND is_active = 1
    `, [order.user_id]);
    
    console.log(`🔔 [NOTIFICATION DEBUG] Customer FCM tokens: ${tokens.length} active tokens found`);
    if (tokens.length > 0) {
      tokens.forEach((token, index) => {
        console.log(`🔔 [NOTIFICATION DEBUG] Token ${index + 1}: ${token.token.substring(0, 30)}... (${token.device_type})`);
      });
    }

    // Define notification message for order creation
    const notification = {
      title_en: isAdminCreated ? 'New Order Created by Our Team' : 'Order Confirmation',
      title_ar: isAdminCreated ? 'تم إنشاء طلب جديد من قبل فريقنا' : 'تأكيد الطلب',
      message_en: isAdminCreated 
        ? `Your order #${order.order_number} has been created by our team. Total: ${order.total_amount} JOD`
        : `Thank you! Your order #${order.order_number} has been received. Total: ${order.total_amount} JOD`,
      message_ar: isAdminCreated
        ? `تم إنشاء طلبك رقم #${order.order_number} من قبل فريقنا. المجموع: ${order.total_amount} دينار`
        : `شكراً لك! تم استلام طلبك رقم #${order.order_number}. المجموع: ${order.total_amount} دينار`,
      type: 'order'
    };

    const data = {
      order_id: order.id.toString(),
      order_number: order.order_number,
      total_amount: order.total_amount,
      order_type: order.order_type,
      created_by: isAdminCreated ? 'admin' : 'customer',
      payment_method: order.payment_method
    };

    console.log('🔔 [NOTIFICATION DEBUG] Notification payload:', notification);
    console.log('🔔 [NOTIFICATION DEBUG] Notification data:', data);
    console.log('🔔 [NOTIFICATION DEBUG] Calling notificationService.sendToUser...');

    const result = await notificationService.sendToUser(order.user_id, notification, data);
    
    console.log('🔔 [NOTIFICATION DEBUG] ✅ Notification service result:', result);
    console.log(`🔔 [NOTIFICATION DEBUG] ✅ Order creation notification sent to user ${order.user_id} for order ${order.order_number} (admin created: ${isAdminCreated})`);
  } catch (error) {
    console.error('🔔 [NOTIFICATION DEBUG] ❌ Error sending order creation notification:', error);
    console.error('🔔 [NOTIFICATION DEBUG] ❌ Error stack:', error.stack);
    // Don't throw error to avoid breaking order creation
  }
};

// =============================================================================
// ORDER ROUTES
// =============================================================================

/**
 * @route   GET /api/orders
 * @desc    Get orders with pagination and filters
 * @access  Private
 */
router.get('/', authenticate, validatePagination, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      payment_status,
      order_type,
      branch_id,
      user_id,
      start_date,
      end_date,
      search
    } = req.query;

    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100);

    let whereConditions = [];
    let queryParams = [];

    // Role-based filtering
    if (req.user.user_type === 'customer') {
      whereConditions.push('o.user_id = ?');
      queryParams.push(req.user.id);
    } else if (user_id && ['admin', 'staff'].includes(req.user.user_type)) {
      whereConditions.push('o.user_id = ?');
      queryParams.push(user_id);
    }

    // Status filters
    if (status) {
      whereConditions.push('o.order_status = ?');
      queryParams.push(status);
    }

    if (payment_status) {
      whereConditions.push('o.payment_status = ?');
      queryParams.push(payment_status);
    }

    if (order_type) {
      whereConditions.push('o.order_type = ?');
      queryParams.push(order_type);
    }

    if (branch_id) {
      whereConditions.push('o.branch_id = ?');
      queryParams.push(branch_id);
    }

    // Date range filter
    if (start_date) {
      whereConditions.push('DATE(o.created_at) >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('DATE(o.created_at) <= ?');
      queryParams.push(end_date);
    }

    // Search filter
    if (search) {
      whereConditions.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        o.id, o.order_number, o.user_id, o.branch_id, o.delivery_address_id,
        o.customer_name, o.customer_phone, o.customer_email, 
        o.order_type, o.payment_method, o.payment_status, o.order_status,
        o.subtotal, o.delivery_fee, o.tax_amount, o.discount_amount, o.total_amount,
        o.points_used, o.points_earned, o.promo_code_id, o.gift_card_id, o.special_instructions,
        o.estimated_delivery_time, o.delivered_at, o.cancelled_at, o.cancellation_reason,
        o.created_at, o.updated_at,
        u.first_name, u.last_name, u.email as user_email,
        b.title_ar as branch_title_ar, b.title_en as branch_title_en,
        pc.code as promo_code,
        addr.name as address_name, 
        addr.building_no, 
        addr.floor_no, 
        addr.apartment_no, 
        addr.details as address_details,
        addr.latitude as address_latitude,
        addr.longitude as address_longitude,
        c.title_ar as city_title_ar, 
        c.title_en as city_title_en,
        a.title_ar as area_title_ar, 
        a.title_en as area_title_en,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN branches b ON o.branch_id = b.id
      LEFT JOIN promo_codes pc ON o.promo_code_id = pc.id
      LEFT JOIN user_addresses addr ON o.delivery_address_id = addr.id
      LEFT JOIN areas a ON addr.area_id = a.id
      LEFT JOIN cities c ON addr.city_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `;

    const result = await getPaginatedResults(query, queryParams, validatedPage, validatedLimit);

    // Transform the data to structure delivery address properly
    const transformedData = result.data.map(order => {
      const transformed = { ...order };
      
      // Structure delivery address object if delivery address fields exist
      if (order.address_name || order.city_title_en || order.area_title_en) {
        transformed.delivery_address = {
          full_name: order.address_name || '',
          address_line: [
            order.building_no ? `Building ${order.building_no}` : '',
            order.floor_no ? `Floor ${order.floor_no}` : '',
            order.apartment_no ? `Apt ${order.apartment_no}` : '',
            order.address_details
          ].filter(Boolean).join(', ') || order.address_details || 'Address details not available',
          city: order.city_title_en || '',
          city_ar: order.city_title_ar || '',
          area: order.area_title_en || '',
          area_ar: order.area_title_ar || '',
          governorate: order.city_title_en || '', // Use city as governorate since no governorate table
          governorate_ar: order.city_title_ar || '',
          latitude: order.address_latitude || null,
          longitude: order.address_longitude || null
        };
      } else {
        transformed.delivery_address = null;
      }
      
      // Clean up the individual address fields from the main object
      delete transformed.address_name;
      delete transformed.building_no;
      delete transformed.floor_no;
      delete transformed.apartment_no;
      delete transformed.address_details;
      delete transformed.address_latitude;
      delete transformed.address_longitude;
      delete transformed.city_title_ar;
      delete transformed.city_title_en;
      delete transformed.area_title_ar;
      delete transformed.area_title_en;
      
      return transformed;
    });

    res.json({
      success: true,
      data: transformedData,
      pagination: result.pagination
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID with full details
 * @access  Private
 */
router.get('/:id', authenticate, validateId, async (req, res, next) => {
  try {
    // Get order details
    const [order] = await executeQuery(`
      SELECT 
        o.*, 
        u.first_name, u.last_name, u.email as user_email,
        b.title_ar as branch_title_ar, b.title_en as branch_title_en,
        b.phone as branch_phone, b.address_ar as branch_address_ar, b.address_en as branch_address_en,
        pc.code as promo_code, pc.title_ar as promo_title_ar, pc.title_en as promo_title_en,
        addr.name as address_name, 
        addr.building_no, 
        addr.floor_no, 
        addr.apartment_no, 
        addr.details as address_details,
        addr.latitude as address_latitude,
        addr.longitude as address_longitude,
        c.title_ar as city_title_ar, 
        c.title_en as city_title_en,
        a.title_ar as area_title_ar, 
        a.title_en as area_title_en,
        s.title_ar as street_title_ar, 
        s.title_en as street_title_en
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN branches b ON o.branch_id = b.id
      LEFT JOIN promo_codes pc ON o.promo_code_id = pc.id
      LEFT JOIN user_addresses addr ON o.delivery_address_id = addr.id
      LEFT JOIN cities c ON addr.city_id = c.id
      LEFT JOIN areas a ON addr.area_id = a.id
      LEFT JOIN streets s ON addr.street_id = s.id
      WHERE o.id = ?
    `, [req.params.id]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        message_ar: 'الطلب غير موجود'
      });
    }

    // Check permissions
    if (req.user.user_type === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    // Get order items
    const orderItems = await executeQuery(`
      SELECT 
        oi.*,
        p.title_ar as product_title_ar, p.title_en as product_title_en,
        p.main_image as product_image, p.sku as product_sku
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `, [req.params.id]);

    // Get status history
    const statusHistory = await executeQuery(`
      SELECT 
        osh.*,
        u.first_name, u.last_name
      FROM order_status_history osh
      LEFT JOIN users u ON osh.changed_by = u.id
      WHERE osh.order_id = ?
      ORDER BY osh.created_at ASC
    `, [req.params.id]);

    // Structure delivery address object if delivery address fields exist
    if (order.address_name || order.city_title_en || order.area_title_en) {
      order.delivery_address = {
        full_name: order.address_name || '',
        address_line: [
          order.building_no ? `Building ${order.building_no}` : '',
          order.floor_no ? `Floor ${order.floor_no}` : '',
          order.apartment_no ? `Apt ${order.apartment_no}` : '',
          order.address_details
        ].filter(Boolean).join(', ') || order.address_details || 'Address details not available',
        city: order.city_title_en || '',
        city_ar: order.city_title_ar || '',
        area: order.area_title_en || '',
        area_ar: order.area_title_ar || '',
        governorate: order.city_title_en || '', // Use city as governorate since no governorate table
        governorate_ar: order.city_title_ar || '',
        latitude: order.address_latitude || null,
        longitude: order.address_longitude || null
      };
      
      // Clean up the individual address fields from the main object
      delete order.address_name;
      delete order.building_no;
      delete order.floor_no;
      delete order.apartment_no;
      delete order.address_details;
      delete order.address_latitude;
      delete order.address_longitude;
      delete order.city_title_ar;
      delete order.city_title_en;
      delete order.area_title_ar;
      delete order.area_title_en;
      delete order.street_title_ar;
      delete order.street_title_en;
    } else {
      order.delivery_address = null;
    }

    res.json({
      success: true,
      data: {
        order,
        items: orderItems,
        status_history: statusHistory
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/orders/calculate
 * @desc    Calculate order totals (preview before creating order)
 * @access  Public/Private (supports guest users)
 */
router.post('/calculate', optionalAuth, validateOrderItems, async (req, res, next) => {
  try {
    console.log('🧮 Order calculation request received:', {
      body: req.body,
      user: req.user ? `User ID: ${req.user.id}` : 'No user (guest)',
      timestamp: new Date().toISOString()
    });

    const {
      items,
      delivery_address_id,
  delivery_coordinates,
      guest_delivery_address,
      order_type = 'delivery',
      promo_code,
      points_to_use = 0,
      is_guest = false,
      branch_id // Add branch_id parameter for proper delivery calculation
    } = req.body;

    console.log('📋 Extracted parameters:', {
      items_count: items?.length || 0,
      delivery_address_id,
      guest_delivery_address: guest_delivery_address ? 'Provided' : 'Not provided',
      order_type,
      branch_id,
      is_guest
    });

    const isGuestOrder = is_guest || !req.user;

    // Validate branch if provided (required for accurate delivery calculation)
    if (branch_id) {
      const [branch] = await executeQuery(
        'SELECT id FROM branches WHERE id = ? AND is_active = 1',
        [branch_id]
      );

      if (!branch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid branch selected',
          message_ar: 'فرع غير صالح'
        });
      }
    }

    // Validate and calculate items
    const { items: validatedItems, subtotal, pointsEarned } = await validateAndCalculateOrderItems(items);

    // Calculate delivery fee
    let deliveryCalculation = { delivery_fee: 0, calculation_method: 'pickup', free_shipping_applied: false };
    
    console.log('🚚 Starting delivery fee calculation for /calculate endpoint:', {
      order_type,
      has_branch_id: !!branch_id,
      branch_id,
      delivery_address_id,
      has_guest_delivery_address: !!guest_delivery_address,
      isGuestOrder,
      subtotal
    });
    
    if (order_type === 'delivery') {
      console.log('📍 Order type is delivery, proceeding with fee calculation...');
      
      if (!branch_id) {
        console.log('⚠️ Warning: No branch_id provided for delivery calculation');
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required for delivery fee calculation'
        });
      }
      // Highest priority: explicit coordinates provided by client (e.g., mobile app)
      if (delivery_coordinates && delivery_coordinates.latitude && delivery_coordinates.longitude) {
        const customerData = {
          latitude: Number(delivery_coordinates.latitude),
          longitude: Number(delivery_coordinates.longitude),
          branch_id: branch_id,
          area_id: delivery_coordinates.area_id || null
        };
        console.log('🧭 Using provided delivery_coordinates for calculation:', customerData);
        deliveryCalculation = await calculateDeliveryFee(customerData, order_type, subtotal);
      } else if (isGuestOrder && guest_delivery_address) {
        // Handle both string and object formats for guest_delivery_address
        if (typeof guest_delivery_address === 'object' && guest_delivery_address.latitude && guest_delivery_address.longitude) {
          // For guest orders with address coordinates (object format)
          const customerData = {
            latitude: guest_delivery_address.latitude,
            longitude: guest_delivery_address.longitude,
            branch_id: branch_id, // Use the selected branch from the order
            area_id: guest_delivery_address.area_id
          };
          deliveryCalculation = await calculateDeliveryFee(customerData, order_type, subtotal);
        } else {
          // For guest orders with text address only (string format) - use default delivery fee with branch context
          console.log('Guest delivery address is text format, using default delivery fee');
          deliveryCalculation = await calculateDeliveryFee({ branch_id: branch_id }, order_type, subtotal);
        }
      } else if (delivery_address_id) {
        // For registered user orders (admins can use any address_id)
        console.log('🏠 Looking up delivery address:', {
          delivery_address_id,
          user_id: req.user.id,
          user_type: req.user.user_type
        });

        let addressRows;
        if (['admin', 'staff'].includes(req.user?.user_type)) {
          // Admin/Staff can fetch any address by ID (calculation-only, does not change ownership)
          addressRows = await executeQuery(`
            SELECT area_id, latitude, longitude, shipping_zone_id, user_id
            FROM user_addresses
            WHERE id = ?
          `, [delivery_address_id]);
        } else {
          // Customers can only use their own addresses
          addressRows = await executeQuery(`
            SELECT area_id, latitude, longitude, shipping_zone_id, user_id
            FROM user_addresses 
            WHERE id = ? AND user_id = ?
          `, [delivery_address_id, req.user.id]);
        }

        const [address] = addressRows || [];
        console.log('📍 Address lookup result:', address);
        
        if (address) {
          const hasCoords = !!(address.latitude && address.longitude);
          const customerData = {
            latitude: hasCoords ? address.latitude : undefined,
            longitude: hasCoords ? address.longitude : undefined,
            branch_id: branch_id,
            area_id: address.area_id
          };

          console.log('🧮 Calling calculateDeliveryFee with:', customerData);
          deliveryCalculation = await calculateDeliveryFee(customerData, order_type, subtotal);
          console.log('💰 Delivery calculation result:', deliveryCalculation);
        } else {
          console.log('❌ No address found for delivery_address_id:', delivery_address_id, 'user_id:', req.user.id);
        }
      } else {
        // Fallback for legacy orders without address coordinates
        deliveryCalculation = await calculateDeliveryFee({ branch_id: branch_id }, order_type, subtotal);
      }
    }
    
    const deliveryFee = deliveryCalculation.delivery_fee;

    // Apply promo code if provided
    let discountAmount = 0;
    let promoDetails = null;
    if (promo_code) {
      try {
        const promoResult = await applyPromoCode(promo_code, subtotal, isGuestOrder ? null : req.user.id);
        if (promoResult) {
          discountAmount = promoResult.discountAmount;
          promoDetails = promoResult.promo;
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
          message_ar: 'كود الخصم غير صالح'
        });
      }
    }

    // Calculate tax (if applicable)
    const taxRate = 0; // Configure as needed
    const taxAmount = (subtotal + deliveryFee - discountAmount) * taxRate;

    // Calculate total
    const totalAmount = subtotal + deliveryFee + taxAmount - discountAmount;

    res.json({
      success: true,
      data: {
        items: validatedItems,
        subtotal,
        delivery_fee: deliveryFee,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        points_earned: pointsEarned,
        promo_details: promoDetails
      }
    });

  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('out of stock')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        message_ar: 'خطأ في بيانات الطلب'
      });
    }
    next(error);
  }
});

/**
 * @route   POST /api/orders
 * @desc    Create new order (supports both authenticated and guest users)
 * @access  Public/Private
 */
router.post('/', optionalAuth, validateOrderItems, validateOrderType, validatePaymentMethod, validatePromoCode, validatePointsUsage, async (req, res, next) => {
  try {
    const {
      items,
      branch_id,
      delivery_address_id,
      guest_delivery_address,
      customer_id, // For admin-created orders
      customer_name,
      customer_phone,
      customer_email,
      order_type = 'delivery',
      payment_method = 'cash',
      promo_code,
      points_to_use = 0,
      special_instructions,
      is_guest = false
    } = req.body;

    const isGuestOrder = is_guest || !req.user;
    const isAdminOrder = req.user && customer_id; // Admin creating order for customer

    console.log('\n🏪 [ORDER DEBUG] Order creation started...');
    console.log('🏪 [ORDER DEBUG] Request user:', req.user ? { id: req.user.id, user_type: req.user.user_type } : 'None');
    console.log('🏪 [ORDER DEBUG] Order flags:', { isGuestOrder, isAdminOrder });
    console.log('🏪 [ORDER DEBUG] Customer info:', { customer_id, customer_name, customer_phone, customer_email });

    // Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required',
        message_ar: 'عناصر الطلب مطلوبة'
      });
    }

    // Relaxed validation - more flexible for admin-created orders
    if (!branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Branch is required',
        message_ar: 'الفرع مطلوب'
      });
    }

    // For admin-created orders, allow more flexibility
    if (req.user && req.user.user_type === 'admin') {
      // Admin can create orders with minimal info
      if (!customer_name) {
        return res.status(400).json({
          success: false,
          message: 'Customer name is required',
          message_ar: 'اسم العميل مطلوب'
        });
      }
    } else {
      // For regular/guest orders, require more strict validation
      if (!customer_name || !customer_phone) {
        return res.status(400).json({
          success: false,
          message: 'Customer name and phone are required',
          message_ar: 'اسم العميل والهاتف مطلوبان'
        });
      }
    }

    // Validate branch
    const [branch] = await executeQuery(
      'SELECT id FROM branches WHERE id = ? AND is_active = 1',
      [branch_id]
    );

    if (!branch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid branch',
        message_ar: 'فرع غير صالح'
      });
    }

    // Validate delivery address for delivery orders
    let addressAreaId = null;
    if (order_type === 'delivery') {
      if (isGuestOrder) {
        // Debug: Log the guest delivery address data
        console.log('🔍 Guest delivery validation debug:', {
          guest_delivery_address,
          type: typeof guest_delivery_address,
          isString: typeof guest_delivery_address === 'string',
          stringTrimmed: typeof guest_delivery_address === 'string' ? guest_delivery_address.trim() : 'N/A',
          isEmpty: typeof guest_delivery_address === 'string' ? !guest_delivery_address.trim() : 'N/A'
        });
        
        // For guest users, require guest_delivery_address (can be string or object)
        if (!guest_delivery_address || 
            (typeof guest_delivery_address === 'string' && !guest_delivery_address.trim()) ||
            (typeof guest_delivery_address === 'object' && (!guest_delivery_address.address || !guest_delivery_address.address.trim()))) {
          console.log('❌ Guest delivery address validation failed');
          return res.status(400).json({
            success: false,
            message: 'Delivery address is required for delivery orders',
            message_ar: 'عنوان التوصيل مطلوب لطلبات التوصيل'
          });
        }
        console.log('✅ Guest delivery address validation passed');
        // For guest orders, use default area or no area-specific delivery fee
        addressAreaId = null;
      } else {
        // For authenticated users or admin orders, require delivery_address_id
        if (!delivery_address_id) {
          return res.status(400).json({
            success: false,
            message: 'Delivery address is required for delivery orders',
            message_ar: 'عنوان التوصيل مطلوب لطلبات التوصيل'
          });
        }

        // Determine which user ID to validate against
        const userIdToCheck = isAdminOrder ? customer_id : req.user.id;

        const [address] = await executeQuery(
          'SELECT area_id FROM user_addresses WHERE id = ? AND user_id = ? AND is_active = 1',
          [delivery_address_id, userIdToCheck]
        );

        if (!address) {
          return res.status(400).json({
            success: false,
            message: 'Invalid delivery address',
            message_ar: 'عنوان توصيل غير صالح'
          });
        }

        addressAreaId = address.area_id;
      }
    }

    // Calculate order totals
    const { items: validatedItems, subtotal, pointsEarned } = await validateAndCalculateOrderItems(items);

    // Calculate delivery fee using enhanced shipping system
    let deliveryCalculation = { delivery_fee: 0, calculation_method: 'pickup', free_shipping_applied: false };
    
    if (order_type === 'delivery' && addressAreaId) {
      // Try to get coordinates from the address
      const userIdForAddress = isGuestOrder ? null : (isAdminOrder ? customer_id : req.user.id);
      const [addressDetails] = await executeQuery(`
        SELECT ua.latitude, ua.longitude, ua.area_id, a.delivery_fee 
        FROM user_addresses ua
        LEFT JOIN areas a ON ua.area_id = a.id
        WHERE ua.id = ? AND ua.user_id = ?
      `, [delivery_address_id, userIdForAddress]);

      if (addressDetails) {
        const customerData = {
          latitude: addressDetails.latitude,
          longitude: addressDetails.longitude,
          branch_id: branch_id, // Use the selected branch from the order
          area_id: addressDetails.area_id
        };
        deliveryCalculation = await calculateDeliveryFee(customerData, order_type, subtotal);
      } else {
        // Fallback to area-based calculation with branch context
        const customerData = { 
          area_id: addressAreaId,
          branch_id: branch_id // Include branch for potential calculation improvements
        };
        deliveryCalculation = await calculateDeliveryFee(customerData, order_type, subtotal);
      }
    }

    const deliveryFee = deliveryCalculation.delivery_fee;

    // Apply promo code
    let discountAmount = 0;
    let promoCodeId = null;
    if (promo_code) {
      const promoResult = await applyPromoCode(promo_code, subtotal, isGuestOrder ? null : req.user.id);
      if (promoResult) {
        discountAmount = promoResult.discountAmount;
        promoCodeId = promoResult.promo.id;
      }
    }

    // Calculate tax
    const taxRate = 0; // Configure as needed
    const taxAmount = (subtotal + deliveryFee - discountAmount) * taxRate;

    // Calculate total
    const totalAmount = subtotal + deliveryFee + taxAmount - discountAmount;

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create order and items in transaction
    const orderUserId = isGuestOrder && !isAdminOrder ? null : (isAdminOrder ? customer_id : req.user.id);
    
    console.log('🔍 Order creation debug:');
    console.log('  isGuestOrder:', isGuestOrder);
    console.log('  isAdminOrder:', isAdminOrder);
    console.log('  req.user:', req.user ? `{id: ${req.user.id}}` : 'null');
    console.log('  orderUserId:', orderUserId);
    
    // Helper function to convert undefined to null for SQL
    const nullifyUndefined = (value) => value === undefined ? null : value;
    
    // Debug all parameter values before insertion
    console.log('🔍 Order parameters debug:', {
      orderNumber,
      orderUserId,
      branch_id,
      delivery_address_id: nullifyUndefined((isGuestOrder && !isAdminOrder) ? null : delivery_address_id),
      customer_name,
      customer_phone,
      customer_email: nullifyUndefined(customer_email),
      order_type,
      payment_method,
      subtotal,
      deliveryFee,
      taxAmount,
      discountAmount,
      totalAmount,
      points_to_use: isGuestOrder ? 0 : nullifyUndefined(points_to_use),
      pointsEarned: isGuestOrder ? 0 : nullifyUndefined(pointsEarned),
      promoCodeId: nullifyUndefined(promoCodeId),
      special_instructions: nullifyUndefined(special_instructions),
      guest_delivery_address: isGuestOrder && guest_delivery_address ? 
        (typeof guest_delivery_address === 'string' ? guest_delivery_address : JSON.stringify(guest_delivery_address)) : null,
      isGuestOrder: isGuestOrder ? 1 : 0
    });
    
    const queries = [
      {
        query: `
          INSERT INTO orders (
            order_number, user_id, branch_id, delivery_address_id,
            customer_name, customer_phone, customer_email, order_type, payment_method,
            subtotal, delivery_fee, tax_amount, discount_amount, total_amount,
            points_used, points_earned, promo_code_id, special_instructions,
            guest_delivery_address, is_guest
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          orderNumber, 
          orderUserId, 
          branch_id, 
          nullifyUndefined((isGuestOrder && !isAdminOrder) ? null : delivery_address_id),
          customer_name, 
          customer_phone, 
          nullifyUndefined(customer_email), 
          order_type, 
          payment_method,
          subtotal, 
          deliveryFee, 
          taxAmount, 
          discountAmount, 
          totalAmount,
          isGuestOrder ? 0 : nullifyUndefined(points_to_use), 
          isGuestOrder ? 0 : nullifyUndefined(pointsEarned), 
          nullifyUndefined(promoCodeId), 
          nullifyUndefined(special_instructions),
          isGuestOrder && guest_delivery_address ? 
            (typeof guest_delivery_address === 'string' ? guest_delivery_address : JSON.stringify(guest_delivery_address)) : null,
          isGuestOrder ? 1 : 0
        ]
      }
    ];

    // Add promo code usage update to the first transaction if applied
    if (promoCodeId) {
      console.log('🔍 Promo code update debug:', {
        promoCodeId: nullifyUndefined(promoCodeId)
      });
      
      queries.push({
        query: `
          UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = ?
        `,
        params: [nullifyUndefined(promoCodeId)]
      });
    }

    // Execute transaction with proper ID handling
    const results = await executeTransaction(queries);
    const orderId = results[0].insertId;

    // Now insert order items with the actual order ID
    const orderItemsQueries = [];
    validatedItems.forEach(item => {
      console.log('🔍 Order item debug:', {
        orderId,
        product_id: item.product_id,
        variant_id: nullifyUndefined(item.variant_id),
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        points_earned: nullifyUndefined(item.points_earned),
        special_instructions: nullifyUndefined(item.special_instructions)
      });
      
      orderItemsQueries.push({
        query: `
          INSERT INTO order_items (
            order_id, product_id, variant_id, quantity, unit_price, total_price,
            points_earned, special_instructions
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          orderId, // Use the actual order ID instead of LAST_INSERT_ID()
          item.product_id, 
          nullifyUndefined(item.variant_id), 
          item.quantity, 
          item.unit_price,
          item.total_price, 
          nullifyUndefined(item.points_earned), 
          nullifyUndefined(item.special_instructions)
        ]
      });
    });

    // Add status history entry with actual order ID
    orderItemsQueries.push({
      query: `
        INSERT INTO order_status_history (order_id, status, note, changed_by)
        VALUES (?, 'pending', 'Order created', ?)
      `,
      params: [orderId, isGuestOrder ? null : nullifyUndefined(req.user.id)]
    });

    // Add promo code usage with actual order ID if needed
    if (promoCodeId && !isGuestOrder) {
      console.log('🔍 Promo code usage debug:', {
        promoCodeId: nullifyUndefined(promoCodeId),
        user_id: req.user.id,
        orderId,
        discountAmount
      });
      
      orderItemsQueries.push({
        query: `
          INSERT INTO promo_code_usages (promo_code_id, user_id, order_id, discount_amount)
          VALUES (?, ?, ?, ?)
        `,
        params: [nullifyUndefined(promoCodeId), req.user.id, orderId, discountAmount]
      });
    }

    // Execute the order items and related data
    if (orderItemsQueries.length > 0) {
      await executeTransaction(orderItemsQueries);
    }

    // Get the created order
    const [newOrder] = await executeQuery(`
      SELECT 
        o.*, 
        u.first_name, u.last_name,
        b.title_ar as branch_title_ar, b.title_en as branch_title_en
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN branches b ON o.branch_id = b.id
      WHERE o.id = ?
    `, [orderId]);

    // Emit socket event for new order
    if (global.socketManager) {
      global.socketManager.broadcastNewOrder({
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
        customerName: newOrder.customer_name,
        customerPhone: newOrder.customer_phone,
        customerEmail: newOrder.customer_email,
        orderType: newOrder.order_type,
        paymentMethod: newOrder.payment_method,
        paymentStatus: newOrder.payment_status,
        orderTotal: newOrder.total_amount,
        createdAt: newOrder.created_at,
        itemsCount: items.length,
        items: items,
        branchTitle: newOrder.title_en || newOrder.title_ar,
        ...newOrder
      });
      
      // Send notification to admins
      global.socketManager.sendNotificationToAdmins({
        type: 'info',
        message: `New order #${orderNumber} received from ${customer_name}`,
        timestamp: new Date().toISOString(),
        orderId: orderId,
        orderNumber: orderNumber
      });

      // Update admin dashboard counts for new pending order
      const pendingCount = await executeQuery(
        'SELECT COUNT(*) as count FROM orders WHERE order_status = "pending"'
      );
      global.socketManager.emitToAdmins('orderCountsUpdated', {
        pendingOrders: pendingCount[0].count,
        lastUpdated: new Date().toISOString()
      });
      
      // Send customer notification using the unified notification function
      console.log('\n🔔 [ORDER DEBUG] Checking notification conditions...');
      console.log('🔔 [ORDER DEBUG] orderUserId:', orderUserId);
      console.log('🔔 [ORDER DEBUG] isAdminOrder:', isAdminOrder);
      console.log('🔔 [ORDER DEBUG] req.user?.user_type:', req.user?.user_type);
      
      if (orderUserId) {
        console.log('🔔 [ORDER DEBUG] ✅ orderUserId exists, proceeding with notification...');
        
        // For admin-created orders with customer_id
        if (isAdminOrder) {
          console.log('🔔 [ORDER DEBUG] 📋 Sending admin-created order notification...');
          await sendOrderCreationNotification(newOrder, true);
        } else {
          console.log('🔔 [ORDER DEBUG] 👤 Sending regular customer order notification...');
          // For regular customer orders
          await sendOrderCreationNotification(newOrder, false);
        }
      } else {
        console.log('🔔 [ORDER DEBUG] ❌ No orderUserId, skipping primary notification');
      }
      
      // Additional check: if admin creates order with customer phone/email, try to find and notify customer
      if (req.user && req.user.user_type === 'admin' && !isAdminOrder && (customer_phone || customer_email)) {
        console.log('🔔 [ORDER DEBUG] 🔍 Admin order without customer_id, searching by phone/email...');
        console.log('🔔 [ORDER DEBUG] Search criteria:', { customer_phone, customer_email });
        
        try {
          // Try to find existing customer by phone or email
          let existingCustomer = null;
          if (customer_phone) {
            console.log('🔔 [ORDER DEBUG] 📞 Searching by phone:', customer_phone);
            const [customerByPhone] = await executeQuery(
              'SELECT id, first_name, last_name FROM users WHERE phone = ? AND user_type = "customer"',
              [customer_phone]
            );
            existingCustomer = customerByPhone;
            console.log('🔔 [ORDER DEBUG] Phone search result:', existingCustomer || 'Not found');
          }
          
          if (!existingCustomer && customer_email) {
            console.log('🔔 [ORDER DEBUG] 📧 Searching by email:', customer_email);
            const [customerByEmail] = await executeQuery(
              'SELECT id, first_name, last_name FROM users WHERE email = ? AND user_type = "customer"',
              [customer_email]
            );
            existingCustomer = customerByEmail;
            console.log('🔔 [ORDER DEBUG] Email search result:', existingCustomer || 'Not found');
          }
          
          if (existingCustomer) {
            console.log('🔔 [ORDER DEBUG] ✅ Customer found, creating notification order object...');
            // Create temporary order object for notification
            const orderForNotification = {
              ...newOrder,
              user_id: existingCustomer.id
            };
            console.log('🔔 [ORDER DEBUG] 📤 Sending matched customer notification...');
            await sendOrderCreationNotification(orderForNotification, true);
            console.log(`🔔 [ORDER DEBUG] ✅ Customer notification sent for admin order ${orderNumber} to matched customer ${existingCustomer.id} (${existingCustomer.first_name} ${existingCustomer.last_name})`);
          } else {
            console.log(`🔔 [ORDER DEBUG] ❌ No existing customer found for phone ${customer_phone} or email ${customer_email} - notification not sent`);
          }
        } catch (notifError) {
          console.error('🔔 [ORDER DEBUG] ❌ Error sending customer notification for admin order by phone/email lookup:', notifError);
        }
      } else {
        console.log('🔔 [ORDER DEBUG] ⏭️ Skipping phone/email lookup (not admin order or already has customer_id)');
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      message_ar: 'تم إنشاء الطلب بنجاح',
      data: { order: newOrder }
    });

  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('out of stock') || error.message.includes('promo')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        message_ar: 'خطأ في بيانات الطلب'
      });
    }
    next(error);
  }
});

/**
 * @route   PUT /api/orders/:id
 * @desc    Update order (limited fields for security)
 * @access  Private
 */
router.put('/:id', authenticate, validateId, async (req, res, next) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      special_instructions,
      estimated_delivery_time,
      delivery_address_id,
      order_type,
      items,
      subtotal,
      total_amount
    } = req.body;

    // Get current order
    const [currentOrder] = await executeQuery(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.id]
    );

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        message_ar: 'الطلب غير موجود'
      });
    }

    // Check permissions
    const canEdit = (
      req.user.user_type === 'customer' && currentOrder.user_id === req.user.id && currentOrder.order_status === 'pending'
    ) || ['admin', 'staff'].includes(req.user.user_type);

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit this order',
        message_ar: 'لا يمكن تعديل هذا الطلب'
      });
    }

    // Validate delivery address if order type is being changed to delivery or if it's already delivery
    const finalOrderType = order_type || currentOrder.order_type;
    if (finalOrderType === 'delivery') {
      const finalDeliveryAddressId = delivery_address_id || currentOrder.delivery_address_id;
      if (!finalDeliveryAddressId) {
        return res.status(400).json({
          success: false,
          message: 'Delivery address is required for delivery orders',
          message_ar: 'عنوان التوصيل مطلوب لطلبات التوصيل'
        });
      }

      // Validate address exists and belongs to user
      const [address] = await executeQuery(
        'SELECT area_id, user_id, is_active FROM user_addresses WHERE id = ?',
        [finalDeliveryAddressId]
      );

      if (!address) {
        return res.status(400).json({
          success: false,
          message: 'Delivery address not found',
          message_ar: 'عنوان التوصيل غير موجود',
          details: `Address ID ${finalDeliveryAddressId} does not exist`
        });
      }

      if (address.user_id !== currentOrder.user_id) {
        return res.status(400).json({
          success: false,
          message: 'Delivery address does not belong to this customer',
          message_ar: 'عنوان التوصيل لا يخص هذا العميل',
          details: `Address belongs to user ${address.user_id} but order belongs to user ${currentOrder.user_id}`
        });
      }

      if (!address.is_active) {
        return res.status(400).json({
          success: false,
          message: 'Delivery address is inactive',
          message_ar: 'عنوان التوصيل غير نشط',
          details: 'The selected address has been deactivated'
        });
      }
    }

    // Update order
    await executeQuery(`
      UPDATE orders SET
        customer_name = COALESCE(?, customer_name),
        customer_phone = COALESCE(?, customer_phone),
        customer_email = COALESCE(?, customer_email),
        special_instructions = ?,
        estimated_delivery_time = COALESCE(?, estimated_delivery_time),
        delivery_address_id = COALESCE(?, delivery_address_id),
        order_type = COALESCE(?, order_type),
        subtotal = COALESCE(?, subtotal),
        total_amount = COALESCE(?, total_amount),
        updated_at = NOW()
      WHERE id = ?
    `, [customer_name, customer_phone, customer_email, special_instructions, estimated_delivery_time, delivery_address_id, order_type, subtotal, total_amount, req.params.id]);

    // Update order items if provided
    if (items && Array.isArray(items)) {
      // Delete existing order items
      await executeQuery('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
      
      // Insert new order items
      for (const item of items) {
        if (item.product_id && item.quantity && item.unit_price) {
          await executeQuery(`
            INSERT INTO order_items (
              order_id, product_id, quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?)
          `, [
            req.params.id,
            item.product_id,
            item.quantity,
            item.unit_price,
            item.total_price || (item.quantity * item.unit_price)
          ]);
        }
      }
    }

    // Get updated order
    const [updatedOrder] = await executeQuery(`
      SELECT 
        o.*, 
        u.first_name, u.last_name,
        b.title_ar as branch_title_ar, b.title_en as branch_title_en
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN branches b ON o.branch_id = b.id
      WHERE o.id = ?
    `, [req.params.id]);

    res.json({
      success: true,
      message: 'Order updated successfully',
      message_ar: 'تم تحديث الطلب بنجاح',
      data: { order: updatedOrder }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (Admin/Staff only)
 * @access  Private (Admin/Staff)
 */
router.put('/:id/status', authenticate, authorize('admin', 'staff'), validateId, validateOrderStatus, async (req, res, next) => {
  try {
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
        message_ar: 'الحالة مطلوبة'
      });
    }

    // Get current order
    const [currentOrder] = await executeQuery(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.id]
    );

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        message_ar: 'الطلب غير موجود'
      });
    }

    // Allow any status change for admin flexibility - removed strict transitions
    // This gives admins full control over order status management

    console.log('Updating order status:', {
      orderId: req.params.id,
      newStatus: status,
      statusLength: status ? status.length : 'null',
      statusType: typeof status
    });

    const queries = [
      {
        query: `
          UPDATE orders SET 
            order_status = ?,
            delivered_at = CASE WHEN ? = 'delivered' THEN NOW() ELSE delivered_at END,
            cancelled_at = CASE WHEN ? = 'cancelled' THEN NOW() ELSE cancelled_at END,
            updated_at = NOW()
          WHERE id = ?
        `,
        params: [status, status, status, req.params.id]
      },
      {
        query: `
          INSERT INTO order_status_history (order_id, status, note, changed_by)
          VALUES (?, ?, ?, ?)
        `,
        params: [req.params.id, status, note || null, req.user.id]
      }
    ];

    // If order is cancelled, release reserved inventory
    if (status === 'cancelled') {
      const orderItems = await executeQuery(
        'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?',
        [req.params.id]
      );

      orderItems.forEach(item => {
        queries.push({
          query: `
            UPDATE branch_inventory 
            SET reserved_quantity = GREATEST(0, reserved_quantity - ?)
            WHERE product_id = ? 
            AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
          `,
          params: [item.quantity, item.product_id, item.variant_id, item.variant_id]
        });
      });
    }

    await executeTransaction(queries);

    // Get updated order
    const [updatedOrder] = await executeQuery(`
      SELECT 
        o.*, 
        u.first_name, u.last_name,
        b.title_ar as branch_title_ar, b.title_en as branch_title_en
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN branches b ON o.branch_id = b.id
      WHERE o.id = ?
    `, [req.params.id]);

    // Send notification to customer about status change
    await sendOrderStatusNotification(updatedOrder, status, currentOrder.order_status);

    // Emit socket events for real-time updates
    if (global.socketManager) {
      // Emit order status update to all admin users
      global.socketManager.emitToAdmins('orderStatusUpdated', {
        orderId: updatedOrder.id,
        previousStatus: currentOrder.order_status,
        newStatus: updatedOrder.order_status,
        customerName: updatedOrder.customer_name,
        orderTotal: updatedOrder.total_amount,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.username || req.user.email
      });

      // Emit to specific customer if they are connected
      global.socketManager.emitToUser(updatedOrder.user_id, 'orderStatusChanged', {
        orderId: updatedOrder.id,
        status: updatedOrder.order_status,
        customerMessage: `Your order #${updatedOrder.id} status has been updated to: ${updatedOrder.order_status}`,
        updatedAt: new Date().toISOString()
      });

      // Update admin dashboard counts
      const pendingCount = await executeQuery(
        'SELECT COUNT(*) as count FROM orders WHERE order_status = "pending"'
      );
      global.socketManager.emitToAdmins('orderCountsUpdated', {
        pendingOrders: pendingCount[0].count,
        lastUpdated: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      message_ar: 'تم تحديث حالة الطلب بنجاح',
      data: { order: updatedOrder }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/orders/:id
 * @desc    Cancel/Delete order
 * @access  Private
 */
router.delete('/:id', authenticate, validateId, async (req, res, next) => {
  try {
    const { reason } = req.body;

    // Get current order
    const [currentOrder] = await executeQuery(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.id]
    );

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        message_ar: 'الطلب غير موجود'
      });
    }

    // Check permissions
    const canCancel = (
      req.user.user_type === 'customer' && 
      currentOrder.user_id === req.user.id && 
      ['pending', 'confirmed'].includes(currentOrder.order_status)
    ) || ['admin', 'staff'].includes(req.user.user_type);

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: 'Cannot cancel this order',
        message_ar: 'لا يمكن إلغاء هذا الطلب'
      });
    }

    // Check if already cancelled
    if (currentOrder.order_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
        message_ar: 'الطلب ملغى مسبقاً'
      });
    }

    const queries = [
      {
        query: `
          UPDATE orders SET 
            order_status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = ?,
            updated_at = NOW()
          WHERE id = ?
        `,
        params: [reason || 'Cancelled by user', req.params.id]
      },
      {
        query: `
          INSERT INTO order_status_history (order_id, status, note, changed_by)
          VALUES (?, 'cancelled', ?, ?)
        `,
        params: [req.params.id, reason || 'Order cancelled', req.user.id]
      }
    ];

    // Release reserved inventory
    const orderItems = await executeQuery(
      'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?',
      [req.params.id]
    );

    orderItems.forEach(item => {
      queries.push({
        query: `
          UPDATE branch_inventory 
          SET reserved_quantity = GREATEST(0, reserved_quantity - ?)
          WHERE product_id = ? 
          AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
        `,
        params: [item.quantity, item.product_id, item.variant_id, item.variant_id]
      });
    });

    // Reverse promo code usage if applicable
    if (currentOrder.promo_code_id) {
      queries.push({
        query: `
          UPDATE promo_codes SET usage_count = GREATEST(0, usage_count - 1) WHERE id = ?
        `,
        params: [currentOrder.promo_code_id]
      });
    }

    await executeTransaction(queries);

    // Send notification to customer about order cancellation
    await sendOrderStatusNotification(currentOrder, 'cancelled', currentOrder.order_status);

    // Emit socket events for real-time updates
    if (global.socketManager) {
      // Emit order cancellation to all admin users
      global.socketManager.emitToAdmins('orderCancelled', {
        orderId: currentOrder.id,
        customerName: currentOrder.customer_name,
        orderTotal: currentOrder.total_amount,
        cancellationReason: reason || 'Cancelled by user',
        cancelledBy: req.user.user_type === 'customer' ? 'Customer' : req.user.username || req.user.email,
        cancelledAt: new Date().toISOString()
      });

      // Emit to specific customer if they are connected
      global.socketManager.emitToUser(currentOrder.user_id, 'orderCancelled', {
        orderId: currentOrder.id,
        customerMessage: `Your order #${currentOrder.id} has been cancelled`,
        reason: reason || 'Cancelled by user',
        cancelledAt: new Date().toISOString()
      });

      // Update admin dashboard counts
      const pendingCount = await executeQuery(
        'SELECT COUNT(*) as count FROM orders WHERE order_status = "pending"'
      );
      global.socketManager.emitToAdmins('orderCountsUpdated', {
        pendingOrders: pendingCount[0].count,
        lastUpdated: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      message_ar: 'تم إلغاء الطلب بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/orders/:id/status-history
 * @desc    Get order status history
 * @access  Private
 */
router.get('/:id/status-history', authenticate, validateId, async (req, res, next) => {
  try {
    // Check if order exists and user has access
    const [order] = await executeQuery(
      'SELECT user_id FROM orders WHERE id = ?',
      [req.params.id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        message_ar: 'الطلب غير موجود'
      });
    }

    // Check permissions
    if (req.user.user_type === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    const statusHistory = await executeQuery(`
      SELECT 
        osh.*,
        u.first_name, u.last_name, u.user_type
      FROM order_status_history osh
      LEFT JOIN users u ON osh.changed_by = u.id
      WHERE osh.order_id = ?
      ORDER BY osh.created_at ASC
    `, [req.params.id]);

    res.json({
      success: true,
      data: statusHistory
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/orders/delivery-fee/:area_id
 * @desc    Get delivery fee for specific area
 * @access  Public
 */
router.get('/delivery-fee/:area_id', validateId, async (req, res, next) => {
  try {
    const [area] = await executeQuery(
      'SELECT id, title_ar, title_en, delivery_fee FROM areas WHERE id = ? AND is_active = 1',
      [req.params.area_id]
    );

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found',
        message_ar: 'المنطقة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: {
        area_id: area.id,
        area_title_ar: area.title_ar,
        area_title_en: area.title_en,
        delivery_fee: parseFloat(area.delivery_fee)
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/orders/:id/apply-promo
 * @desc    Apply promo code to existing order
 * @access  Private
 */
router.post('/:id/apply-promo', authenticate, validateId, validatePromoCode, async (req, res, next) => {
  try {
    const { promo_code } = req.body;

    if (!promo_code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required',
        message_ar: 'كود الخصم مطلوب'
      });
    }

    // Get current order
    const [currentOrder] = await executeQuery(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.id]
    );

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        message_ar: 'الطلب غير موجود'
      });
    }

    // Check permissions
    if (req.user.user_type === 'customer' && currentOrder.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    // Check if order can be modified
    if (!['pending', 'confirmed'].includes(currentOrder.order_status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot apply promo code to this order',
        message_ar: 'لا يمكن تطبيق كود الخصم على هذا الطلب'
      });
    }

    // Check if promo already applied
    if (currentOrder.promo_code_id) {
      return res.status(400).json({
        success: false,
        message: 'Promo code already applied to this order',
        message_ar: 'تم تطبيق كود خصم على هذا الطلب مسبقاً'
      });
    }

    // Validate promo code
    const promoResult = await applyPromoCode(promo_code, currentOrder.subtotal, req.user.id);
    if (!promoResult) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code',
        message_ar: 'كود خصم غير صالح'
      });
    }

    // Recalculate totals
    const newDiscountAmount = promoResult.discountAmount;
    const newTotalAmount = currentOrder.subtotal + currentOrder.delivery_fee + currentOrder.tax_amount - newDiscountAmount;

    const queries = [
      {
        query: `
          UPDATE orders SET
            promo_code_id = ?,
            discount_amount = ?,
            total_amount = ?,
            updated_at = NOW()
          WHERE id = ?
        `,
        params: [promoResult.promo.id, newDiscountAmount, newTotalAmount, req.params.id]
      },
      {
        query: `
          UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = ?
        `,
        params: [promoResult.promo.id]
      },
      {
        query: `
          INSERT INTO promo_code_usages (promo_code_id, user_id, order_id, discount_amount)
          VALUES (?, ?, ?, ?)
        `,
        params: [promoResult.promo.id, req.user.id, req.params.id, newDiscountAmount]
      }
    ];

    await executeTransaction(queries);

    // Get updated order
    const [updatedOrder] = await executeQuery(`
      SELECT 
        o.*, 
        pc.code as promo_code, pc.title_ar as promo_title_ar, pc.title_en as promo_title_en
      FROM orders o
      LEFT JOIN promo_codes pc ON o.promo_code_id = pc.id
      WHERE o.id = ?
    `, [req.params.id]);

    res.json({
      success: true,
      message: 'Promo code applied successfully',
      message_ar: 'تم تطبيق كود الخصم بنجاح',
      data: { order: updatedOrder }
    });

  } catch (error) {
    if (error.message.includes('promo')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        message_ar: 'خطأ في كود الخصم'
      });
    }
    next(error);
  }
});

/**
 * @route   GET /api/orders/user/:user_id
 * @desc    Get orders for specific user (Admin/Staff or own orders)
 * @access  Private
 */
router.get('/user/:user_id', authenticate, validateId, validatePagination, async (req, res, next) => {
  try {
    const targetUserId = req.params.user_id;

    // Check permissions
    if (req.user.user_type === 'customer' && req.user.id != targetUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    const { page = 1, limit = 20, status } = req.query;
    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100);

    let whereConditions = ['o.user_id = ?'];
    let queryParams = [targetUserId];

    if (status) {
      whereConditions.push('o.order_status = ?');
      queryParams.push(status);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT 
        o.id, o.order_number, o.order_type, o.payment_method, 
        o.payment_status, o.order_status, o.total_amount,
        o.estimated_delivery_time, o.delivered_at, o.created_at,
        b.title_ar as branch_title_ar, b.title_en as branch_title_en,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
      FROM orders o
      LEFT JOIN branches b ON o.branch_id = b.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `;

    const result = await getPaginatedResults(query, queryParams, validatedPage, validatedLimit);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/orders/stats/dashboard
 * @desc    Get order statistics for dashboard (Admin/Staff only)
 * @access  Private (Admin/Staff)
 */
router.get('/stats/dashboard', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const { start_date, end_date, branch_id } = req.query;

    let dateFilter = '';
    let branchFilter = '';
    let queryParams = [];

    if (start_date && end_date) {
      dateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    }

    if (branch_id) {
      branchFilter = 'AND o.branch_id = ?';
      queryParams.push(branch_id);
    }

    // Get order counts by status
    const statusStats = await executeQuery(`
      SELECT 
        order_status,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM orders o
      WHERE 1=1 ${dateFilter} ${branchFilter}
      GROUP BY order_status
    `, queryParams);

    // Get payment method stats
    const paymentStats = await executeQuery(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM orders o
      WHERE order_status != 'cancelled' ${dateFilter} ${branchFilter}
      GROUP BY payment_method
    `, queryParams);

    // Get order type stats
    const orderTypeStats = await executeQuery(`
      SELECT 
        order_type,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM orders o
      WHERE order_status != 'cancelled' ${dateFilter} ${branchFilter}
      GROUP BY order_type
    `, queryParams);

    // Get daily revenue (last 7 days if no date range specified)
    let dailyRevenueParams = [...queryParams];
    let dailyRevenueFilter = dateFilter;
    
    if (!start_date || !end_date) {
      dailyRevenueFilter = 'AND DATE(o.created_at) >= DATE(NOW() - INTERVAL 7 DAY)';
      dailyRevenueParams = branch_id ? [branch_id] : [];
    }

    const dailyRevenue = await executeQuery(`
      SELECT 
        DATE(o.created_at) as date,
        COUNT(*) as orders_count,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders o
      WHERE order_status IN ('delivered', 'ready', 'out_for_delivery') ${dailyRevenueFilter} ${branchFilter}
      GROUP BY DATE(o.created_at)
      ORDER BY date DESC
      LIMIT 30
    `, dailyRevenueParams);

    // Get top products
    const topProducts = await executeQuery(`
      SELECT 
        p.id, p.title_ar, p.title_en, p.main_image,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        COUNT(DISTINCT oi.order_id) as orders_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.order_status IN ('delivered', 'ready', 'out_for_delivery') ${dateFilter} ${branchFilter}
      GROUP BY p.id, p.title_ar, p.title_en, p.main_image
      ORDER BY total_quantity DESC
      LIMIT 10
    `, queryParams);

    res.json({
      success: true,
      data: {
        status_stats: statusStats,
        payment_stats: paymentStats,
        order_type_stats: orderTypeStats,
        daily_revenue: dailyRevenue,
        top_products: topProducts
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/orders/stats
 * @desc    Get order statistics with flexible period filtering
 * @access  Private (Admin/Staff)
 */
router.get('/stats', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const { period = 'today', branch_id } = req.query;

    let dateFilter = '';
    let branchFilter = '';
    let queryParams = [];

    // Set date filter based on period
    switch (period) {
      case 'today':
        dateFilter = 'AND DATE(o.created_at) = CURDATE()';
        break;
      case 'yesterday':
        dateFilter = 'AND DATE(o.created_at) = DATE(CURDATE() - INTERVAL 1 DAY)';
        break;
      case 'week':
        dateFilter = 'AND WEEK(o.created_at) = WEEK(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())';
        break;
      case 'month':
        dateFilter = 'AND MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())';
        break;
      case 'year':
        dateFilter = 'AND YEAR(o.created_at) = YEAR(CURDATE())';
        break;
    }

    if (branch_id) {
      branchFilter = 'AND o.branch_id = ?';
      queryParams.push(branch_id);
    }

    // Get basic stats
    const [basicStats] = await executeQuery(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN order_status != 'cancelled' THEN total_amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN order_status != 'cancelled' THEN total_amount ELSE NULL END) as avg_order_value,
        COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders o
      WHERE 1=1 ${dateFilter} ${branchFilter}
    `, queryParams);

    res.json({
      success: true,
      data: {
        period,
        total_orders: parseInt(basicStats.total_orders) || 0,
        total_revenue: parseFloat(basicStats.total_revenue) || 0,
        avg_order_value: parseFloat(basicStats.avg_order_value) || 0,
        completed_orders: parseInt(basicStats.completed_orders) || 0,
        cancelled_orders: parseInt(basicStats.cancelled_orders) || 0,
        completion_rate: basicStats.total_orders > 0 ? 
          ((basicStats.completed_orders / basicStats.total_orders) * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/orders/recent
 * @desc    Get recent orders since timestamp for real-time updates
 * @access  Private
 * @deprecated This endpoint is deprecated - real-time updates now use Socket.IO
 */
router.get('/recent', authenticate, async (req, res, next) => {
  try {
    // This endpoint is deprecated - return empty array for now to avoid breaking existing clients
    res.json({
      success: true,
      message: 'This endpoint is deprecated. Real-time updates now use Socket.IO.',
      data: [],
      count: 0
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/orders/counts
 * @desc    Get order counts by status for dashboard widgets
 * @access  Private
 */
router.get('/counts', authenticate, async (req, res, next) => {
  try {
    const { branch_id } = req.query;
    
    let branchFilter = '';
    let queryParams = [];

    // Role-based filtering
    if (req.user.user_type === 'customer') {
      branchFilter = 'WHERE o.user_id = ?';
      queryParams.push(req.user.id);
    } else if (branch_id) {
      branchFilter = 'WHERE o.branch_id = ?';
      queryParams.push(branch_id);
    }

    const statusCounts = await executeQuery(`
      SELECT 
        order_status,
        COUNT(*) as count
      FROM orders o
      ${branchFilter}
      GROUP BY order_status
    `, queryParams);

    // Convert to object for easier frontend consumption
    const counts = {};
    statusCounts.forEach(row => {
      counts[row.order_status] = parseInt(row.count);
    });

    // Add today's orders count
    const todayFilter = branchFilter ? 
      `${branchFilter} AND DATE(o.created_at) = CURDATE()` : 
      'WHERE DATE(o.created_at) = CURDATE()';

    const [todayStats] = await executeQuery(`
      SELECT COUNT(*) as today_count
      FROM orders o
      ${todayFilter}
    `, queryParams);

    counts.today = parseInt(todayStats.today_count) || 0;

    res.json({
      success: true,
      data: counts
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order with reason
 * @access  Private
 */
router.post('/:id/cancel', authenticate, validateId, async (req, res, next) => {
  try {
    const { reason } = req.body;

    // Get current order
    const [currentOrder] = await executeQuery(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.id]
    );

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        message_ar: 'الطلب غير موجود'
      });
    }

    // Check permissions
    const canCancel = (
      req.user.user_type === 'customer' && 
      currentOrder.user_id === req.user.id && 
      ['pending', 'confirmed'].includes(currentOrder.order_status)
    ) || ['admin', 'staff'].includes(req.user.user_type);

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: 'Cannot cancel this order',
        message_ar: 'لا يمكن إلغاء هذا الطلب'
      });
    }

    // Check if already cancelled
    if (currentOrder.order_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
        message_ar: 'الطلب ملغى مسبقاً'
      });
    }

    const queries = [
      {
        query: `
          UPDATE orders SET 
            order_status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = ?,
            updated_at = NOW()
          WHERE id = ?
        `,
        params: [reason || 'Cancelled by user', req.params.id]
      },
      {
        query: `
          INSERT INTO order_status_history (order_id, status, note, changed_by)
          VALUES (?, 'cancelled', ?, ?)
        `,
        params: [req.params.id, reason || 'Order cancelled', req.user.id]
      }
    ];

    // Reverse promo code usage if applicable
    if (currentOrder.promo_code_id) {
      queries.push({
        query: `
          UPDATE promo_codes SET usage_count = GREATEST(0, usage_count - 1) WHERE id = ?
        `,
        params: [currentOrder.promo_code_id]
      });
    }

    await executeTransaction(queries);

    // Send notification to customer about order cancellation
    await sendOrderStatusNotification(currentOrder, 'cancelled', currentOrder.order_status);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      message_ar: 'تم إلغاء الطلب بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/orders/export
 * @desc    Export orders data (Admin/Staff only)
 * @access  Private (Admin/Staff)
 */
router.get('/export', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const { 
      start_date, 
      end_date, 
      status, 
      branch_id, 
      format = 'json' 
    } = req.query;

    let whereConditions = [];
    let queryParams = [];

    if (start_date) {
      whereConditions.push('DATE(o.created_at) >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('DATE(o.created_at) <= ?');
      queryParams.push(end_date);
    }

    if (status) {
      whereConditions.push('o.order_status = ?');
      queryParams.push(status);
    }

    if (branch_id) {
      whereConditions.push('o.branch_id = ?');
      queryParams.push(branch_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const orders = await executeQuery(`
      SELECT 
        o.order_number, o.customer_name, o.customer_phone, o.customer_email,
        o.order_type, o.payment_method, o.payment_status, o.order_status,
        o.subtotal, o.delivery_fee, o.tax_amount, o.discount_amount, o.total_amount,
        o.points_used, o.points_earned, o.special_instructions,
        o.created_at, o.delivered_at, o.cancelled_at,
        u.first_name, u.last_name, u.email as user_email,
        b.title_en as branch_name,
        pc.code as promo_code,
        CONCAT(addr.name, ', ', c.title_en, ', ', a.title_en) as delivery_address
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN branches b ON o.branch_id = b.id
      LEFT JOIN promo_codes pc ON o.promo_code_id = pc.id
      LEFT JOIN user_addresses addr ON o.delivery_address_id = addr.id
      LEFT JOIN areas a ON addr.area_id = a.id
      LEFT JOIN cities c ON addr.city_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `, queryParams);

    // Get order items for each order
    for (let order of orders) {
      const items = await executeQuery(`
        SELECT 
          oi.quantity, oi.unit_price, oi.total_price,
          p.title_en as product_name, p.sku as product_sku
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = (SELECT id FROM orders WHERE order_number = ?)
      `, [order.order_number]);
      
      order.items = items;
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(orders);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=orders_export.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: orders,
        total: orders.length,
        exported_at: new Date().toISOString()
      });
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/orders/bulk-status-update
 * @desc    Update status for multiple orders (Admin/Staff only)
 * @access  Private (Admin/Staff)
 */
router.post('/bulk-status-update', authenticate, authorize('admin', 'staff'), validateBulkOperation, validateOrderStatus, async (req, res, next) => {
  try {
    const { order_ids, status, note } = req.body;

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required',
        message_ar: 'مصفوفة معرفات الطلبات مطلوبة'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
        message_ar: 'الحالة مطلوبة'
      });
    }

    // Get current orders
    const placeholders = order_ids.map(() => '?').join(',');
    const currentOrders = await executeQuery(
      `SELECT id, order_status FROM orders WHERE id IN (${placeholders})`,
      order_ids
    );

    if (currentOrders.length !== order_ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Some orders not found',
        message_ar: 'بعض الطلبات غير موجودة'
      });
    }

    // Validate status transitions
    const invalidTransitions = currentOrders.filter(order => 
      !isValidStatusTransition(order.order_status, status)
    );

    if (invalidTransitions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition for ${invalidTransitions.length} orders`,
        message_ar: 'انتقال حالة غير صالح لبعض الطلبات'
      });
    }

    const queries = [];

    // Update orders
    currentOrders.forEach(order => {
      queries.push({
        query: `
          UPDATE orders SET 
            order_status = ?,
            delivered_at = CASE WHEN ? = 'delivered' THEN NOW() ELSE delivered_at END,
            cancelled_at = CASE WHEN ? = 'cancelled' THEN NOW() ELSE cancelled_at END,
            updated_at = NOW()
          WHERE id = ?
        `,
        params: [status, status, status, order.id]
      });

      queries.push({
        query: `
          INSERT INTO order_status_history (order_id, status, note, changed_by)
          VALUES (?, ?, ?, ?)
        `,
        params: [order.id, status, note || `Bulk update to ${status}`, req.user.id]
      });
    });

    await executeTransaction(queries);

    // Send notifications for bulk status update
    for (const order of currentOrders) {
      try {
        // Get the full order details for notification
        const [fullOrder] = await executeQuery(`
          SELECT o.*, u.first_name, u.last_name
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.id
          WHERE o.id = ?
        `, [order.id]);
        
        if (fullOrder) {
          await sendOrderStatusNotification(fullOrder, status, order.order_status);
        }
      } catch (error) {
        console.error(`Error sending notification for order ${order.id}:`, error);
        // Continue with other notifications even if one fails
      }
    }

    res.json({
      success: true,
      message: `${currentOrders.length} orders updated successfully`,
      message_ar: `تم تحديث ${currentOrders.length} طلب بنجاح`,
      data: {
        updated_count: currentOrders.length,
        new_status: status
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to convert orders to CSV format
 */
function convertToCSV(orders) {
  if (!orders.length) return '';

  const headers = [
    'Order Number', 'Customer Name', 'Customer Phone', 'Customer Email',
    'Order Type', 'Payment Method', 'Payment Status', 'Order Status',
    'Subtotal', 'Delivery Fee', 'Tax Amount', 'Discount Amount', 'Total Amount',
    'Points Used', 'Points Earned', 'Promo Code', 'Branch Name',
    'Delivery Address', 'Created At', 'Delivered At'
  ];

  const csvContent = [
    headers.join(','),
    ...orders.map(order => [
      order.order_number,
      `"${order.customer_name}"`,
      order.customer_phone,
      order.customer_email || '',
      order.order_type,
      order.payment_method,
      order.payment_status,
      order.order_status,
      order.subtotal,
      order.delivery_fee,
      order.tax_amount,
      order.discount_amount,
      order.total_amount,
      order.points_used,
      order.points_earned,
      order.promo_code || '',
      `"${order.branch_name}"`,
      `"${order.delivery_address || ''}"`,
      order.created_at,
      order.delivered_at || ''
    ].join(','))
  ].join('\n');

  return csvContent;
}

/**
 * @route   POST /api/orders/:id/confirm-receipt
 * @desc    Confirm order receipt by customer
 * @access  Private (Customer who placed the order)
 */
router.post('/:id/confirm-receipt', authenticate, validateId, async (req, res, next) => {
  try {
    console.log('🔍 Order receipt confirmation request:', {
      orderId: req.params.id,
      userId: req.user?.id,
      userType: req.user?.user_type,
      timestamp: new Date().toISOString()
    });
    
    // Get order details
    const [order] = await executeQuery(
      'SELECT id, user_id, order_status FROM orders WHERE id = ?',
      [req.params.id]
    );

    console.log('🔍 Found order for confirmation:', order);

    if (!order) {
      console.log('❌ Order not found for ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        message_ar: 'الطلب غير موجود'
      });
    }

    // Check permissions - only the customer who placed the order can confirm receipt
    if (req.user.user_type === 'customer' && order.user_id !== req.user.id) {
      console.log('❌ Access denied - user mismatch:', {
        orderUserId: order.user_id,
        requestUserId: req.user.id
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    // Check if order is eligible for confirmation (should be delivered)
    if (order.order_status !== 'delivered') {
      console.log('❌ Order not eligible for confirmation:', {
        currentStatus: order.order_status,
        requiredStatus: 'delivered'
      });
      return res.status(400).json({
        success: false,
        message: 'Order cannot be confirmed. It must be delivered first.',
        message_ar: 'لا يمكن تأكيد الطلب. يجب أن يكون مُسلماً أولاً.'
      });
    }

    console.log('✅ Order eligible for confirmation, updating status...');

    // Update order status to indicate customer confirmed receipt
    const queries = [
      {
        query: `UPDATE orders 
                SET delivered_at = COALESCE(delivered_at, NOW()),
                    updated_at = NOW()
                WHERE id = ?`,
        params: [req.params.id]
      },
      {
        query: `INSERT INTO order_status_history (order_id, status, note, changed_by, created_at)
                VALUES (?, 'receipt_confirmed', 'Customer confirmed order receipt', ?, NOW())`,
        params: [req.params.id, req.user.id]
      }
    ];

    console.log('🔍 Executing confirmation queries:', queries);
    await executeTransaction(queries);

    console.log('✅ Order confirmation queries executed successfully');

    // Get updated order
    const [updatedOrder] = await executeQuery(`
      SELECT 
        o.*, 
        u.first_name, u.last_name, u.email as user_email,
        b.title_ar as branch_title_ar, b.title_en as branch_title_en
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN branches b ON o.branch_id = b.id
      WHERE o.id = ?
    `, [req.params.id]);

    console.log('✅ Order receipt confirmed successfully:', {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.order_number
    });

    res.json({
      success: true,
      message: 'Order receipt confirmed successfully',
      message_ar: 'تم تأكيد استلام الطلب بنجاح',
      data: updatedOrder
    });

  } catch (error) {
    console.error('❌ Error confirming order receipt:', error);
    next(error);
  }
});

module.exports = router;
