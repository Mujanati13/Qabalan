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
  const shortYear = year.toString().slice(-2); // Get last 2 digits of year (25 for 2025)
  const prefix = `ORD-${shortYear}-`;
  
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
  
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`; // 3-digit padding instead of 6
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
 * @param {string} code - Promo code
 * @param {number} subtotal - Order subtotal
 * @param {number} userId - User ID (nullable for guest orders)
 * @param {number} deliveryFee - Delivery fee (needed for free_shipping calculation)
 * @returns {Object|null} Promo result with discount amount
 */
const applyPromoCode = async (code, subtotal, userId, deliveryFee = 0) => {
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
      // For free shipping promos, the discount is the delivery fee amount
      // This ensures the discount_amount column reflects the actual savings
      discountAmount = deliveryFee;
      console.log(`🚚 Free shipping promo applied: delivery fee ${deliveryFee} will be recorded as discount`);
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
    discountAmount: Math.min(discountAmount, subtotal + (promo.discount_type === 'free_shipping' ? deliveryFee : 0)),
    isFreeShipping: promo.discount_type === 'free_shipping'
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

const parseNumericValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numeric = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(numeric)) {
    return null;
  }
  return numeric;
};

const getProductBasePrice = (product) => {
  const salePrice = parseNumericValue(product?.sale_price);
  if (salePrice !== null && salePrice > 0) {
    return salePrice;
  }
  const basePrice = parseNumericValue(product?.base_price);
  if (basePrice !== null) {
    return basePrice;
  }
  return 0;
};

const resolveVariantUnitPrice = (basePrice, variant) => {
  if (!variant) {
    return basePrice;
  }

  const directPrice = parseNumericValue(variant.price);
  if (directPrice !== null) {
    return directPrice;
  }

  const priceModifier = parseNumericValue(variant.price_modifier);
  if (priceModifier !== null) {
    // Check price_behavior: 'override' replaces base price, 'add' adds to it
    const priceBehavior = variant.price_behavior || 'add';
    if (priceBehavior === 'override') {
      return priceModifier;
    } else {
      return basePrice + priceModifier;
    }
  }

  return basePrice;
};

const parseDbInt = (value, defaultValue = 0) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const parsedPointsRate = parseFloat(process.env.LOYALTY_POINTS_RATE);
const LOYALTY_POINTS_RATE = Number.isFinite(parsedPointsRate) && parsedPointsRate > 0
  ? parsedPointsRate
  : 0.01;

const sanitizePointsValue = (value) => {
  if (value === undefined || value === null) {
    return 0;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.floor(numeric));
};

const calculatePointsRedemption = async ({ userId, requestedPoints, orderTotal }) => {
  const summary = {
    requestedPoints: sanitizePointsValue(requestedPoints),
    appliedPoints: 0,
    discountValue: 0,
    availablePoints: 0,
    remainingPoints: 0
  };

  if (!userId || summary.requestedPoints <= 0 || !Number.isFinite(orderTotal) || orderTotal <= 0 || LOYALTY_POINTS_RATE <= 0) {
    return summary;
  }

  await ensureLoyaltyAccount(userId);

  const [account] = await executeQuery(
    'SELECT available_points FROM user_loyalty_points WHERE user_id = ? LIMIT 1',
    [userId]
  );

  summary.availablePoints = Math.max(parseDbInt(account?.available_points, 0), 0);

  if (summary.availablePoints <= 0) {
    summary.remainingPoints = summary.availablePoints;
    return summary;
  }

  const maxRedeemableByOrder = Math.max(0, Math.floor(orderTotal / LOYALTY_POINTS_RATE));
  const appliedPoints = Math.min(summary.requestedPoints, summary.availablePoints, maxRedeemableByOrder);

  summary.appliedPoints = appliedPoints;
  summary.discountValue = Number((appliedPoints * LOYALTY_POINTS_RATE).toFixed(2));
  summary.remainingPoints = Math.max(summary.availablePoints - appliedPoints, 0);

  return summary;
};

const getBranchInventoryRecord = async (branchId, productId, variantId) => {
  if (!branchId) {
    return null;
  }

  let query;
  let params;

  if (variantId) {
    query = `SELECT id, branch_id, product_id, variant_id, stock_quantity, reserved_quantity, is_available
              FROM branch_inventory
              WHERE branch_id = ? AND product_id = ? AND variant_id = ?
              LIMIT 1`;
    params = [branchId, productId, variantId];
  } else {
    query = `SELECT id, branch_id, product_id, variant_id, stock_quantity, reserved_quantity, is_available
              FROM branch_inventory
              WHERE branch_id = ? AND product_id = ? AND variant_id IS NULL
              LIMIT 1`;
    params = [branchId, productId];
  }

  let [record] = await executeQuery(query, params);

  if (!record && variantId) {
    const [fallbackRecord] = await executeQuery(
      `SELECT id, branch_id, product_id, variant_id, stock_quantity, reserved_quantity, is_available
         FROM branch_inventory
         WHERE branch_id = ? AND product_id = ? AND variant_id IS NULL
         LIMIT 1`,
      [branchId, productId]
    );

    record = fallbackRecord || null;
  }

  return record || null;
};

const ensureLoyaltyAccount = async (userId) => {
  if (!userId) {
    return;
  }

  await executeQuery(
    `INSERT INTO user_loyalty_points (user_id, total_points, available_points, lifetime_earned, lifetime_redeemed)
     VALUES (?, 0, 0, 0, 0)
     ON DUPLICATE KEY UPDATE updated_at = updated_at`,
    [userId]
  );
};

const pointTransactionExists = async (userId, orderId, type) => {
  if (!userId || !orderId || !type) {
    return false;
  }

  const [existing] = await executeQuery(
    `SELECT id FROM point_transactions WHERE user_id = ? AND order_id = ? AND type = ? LIMIT 1`,
    [userId, orderId, type]
  );

  return !!existing;
};

const recordPointTransaction = async (userId, orderId, points, type, descriptionEn, descriptionAr) => {
  if (!userId || !orderId || !points || points <= 0) {
    return;
  }

  await executeQuery(
    `INSERT INTO point_transactions (user_id, order_id, points, type, description_en, description_ar)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, orderId, points, type, descriptionEn, descriptionAr]
  );
};

const redeemLoyaltyPoints = async ({ userId, orderId, orderNumber, points }) => {
  if (!userId || !orderId || !points || points <= 0) {
    return;
  }

  const alreadyRedeemed = await pointTransactionExists(userId, orderId, 'redeemed');
  if (alreadyRedeemed) {
    return;
  }

  await ensureLoyaltyAccount(userId);

  await executeQuery(
    `UPDATE user_loyalty_points
     SET 
       total_points = GREATEST(total_points - ?, 0),
       available_points = GREATEST(available_points - ?, 0),
       lifetime_redeemed = lifetime_redeemed + ?
     WHERE user_id = ?`,
    [points, points, points, userId]
  );

  await recordPointTransaction(
    userId,
    orderId,
    points,
    'redeemed',
    `Points redeemed on order #${orderNumber}`,
    `تم استخدام النقاط للطلب رقم #${orderNumber}`
  );
};

const awardLoyaltyPoints = async ({ userId, orderId, orderNumber, points }) => {
  if (!userId || !orderId || !points || points <= 0) {
    return;
  }

  const alreadyAwarded = await pointTransactionExists(userId, orderId, 'earned');
  if (alreadyAwarded) {
    return;
  }

  await ensureLoyaltyAccount(userId);

  await executeQuery(
    `UPDATE user_loyalty_points
     SET 
       total_points = total_points + ?,
       available_points = available_points + ?,
       lifetime_earned = lifetime_earned + ?
     WHERE user_id = ?`,
    [points, points, points, userId]
  );

  await recordPointTransaction(
    userId,
    orderId,
    points,
    'earned',
    `Points earned from order #${orderNumber}`,
    `نقاط مكتسبة من الطلب رقم #${orderNumber}`
  );
};

const refundRedeemedPoints = async ({ userId, orderId, orderNumber, points }) => {
  if (!userId || !orderId || !points || points <= 0) {
    return;
  }

  const redeemedExists = await pointTransactionExists(userId, orderId, 'redeemed');
  if (!redeemedExists) {
    return;
  }

  const alreadyRefunded = await pointTransactionExists(userId, orderId, 'bonus');
  if (alreadyRefunded) {
    return;
  }

  await ensureLoyaltyAccount(userId);

  await executeQuery(
    `UPDATE user_loyalty_points
     SET 
       total_points = total_points + ?,
       available_points = available_points + ?,
       lifetime_redeemed = GREATEST(lifetime_redeemed - ?, 0)
     WHERE user_id = ?`,
    [points, points, points, userId]
  );

  await recordPointTransaction(
    userId,
    orderId,
    points,
    'bonus',
    `Points refunded for cancelled order #${orderNumber}`,
    `تمت إعادة النقاط للطلب الملغى رقم #${orderNumber}`
  );
};

const revokeEarnedPoints = async ({ userId, orderId, orderNumber, points }) => {
  if (!userId || !orderId || !points || points <= 0) {
    return;
  }

  const earnedExists = await pointTransactionExists(userId, orderId, 'earned');
  if (!earnedExists) {
    return;
  }

  const alreadyRevoked = await pointTransactionExists(userId, orderId, 'expired');
  if (alreadyRevoked) {
    return;
  }

  await ensureLoyaltyAccount(userId);

  await executeQuery(
    `UPDATE user_loyalty_points
     SET 
       total_points = GREATEST(total_points - ?, 0),
       available_points = GREATEST(available_points - ?, 0),
       lifetime_earned = GREATEST(lifetime_earned - ?, 0)
     WHERE user_id = ?`,
    [points, points, points, userId]
  );

  await recordPointTransaction(
    userId,
    orderId,
    points,
    'expired',
    `Points reversed for cancelled order #${orderNumber}`,
    `تم خصم النقاط بعد إلغاء الطلب رقم #${orderNumber}`
  );
};

/**
 * Validate order items and calculate totals
 */
const validateAndCalculateOrderItems = async (items, branchId = null) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order must contain at least one item');
  }
  
  const validatedItems = [];
  let subtotal = 0;
  let totalPointsEarned = 0;
  const inventoryAdjustments = [];
  
  for (const item of items) {
    const { product_id, variant_id, variants, quantity, special_instructions } = item;
    
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
    
    // Allow in_stock and limited status, only block out_of_stock
    if (product.stock_status === 'out_of_stock') {
      throw new Error(`Product "${product.title_en}" is out of stock`);
    }
    
    const baseProductPrice = getProductBasePrice(product);
    let unitPrice = baseProductPrice;
    let pointsPerItem = product.loyalty_points;
    let branchInventoryRecord = null;
    let variantDetails = null; // Store variant info for special_instructions

    if (branchId) {
      branchInventoryRecord = await getBranchInventoryRecord(branchId, product_id, variant_id || null);
    }
    
    // Handle multiple variants (additions like color + size + weight)
    if (variants && Array.isArray(variants) && variants.length > 0) {
      let currentPrice = baseProductPrice;
      const variantNames = [];
      
      // First, fetch all variant details
      const variantsList = [];
      for (const variantItem of variants) {
        const variantId = typeof variantItem === 'object' ? variantItem.id : variantItem;
        
        const [variant] = await executeQuery(
          `SELECT * FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1`,
          [variantId, product_id]
        );
        
        if (!variant) {
          throw new Error(`Product variant with ID ${variantId} not found or inactive`);
        }
        
        const variantStockQuantity = parseNumericValue(variant.stock_quantity);
        if (variantStockQuantity !== null && variantStockQuantity < quantity && !branchInventoryRecord) {
          throw new Error(`Insufficient stock for variant: ${variant.title_en || variant.variant_value}`);
        }
        
        variantsList.push(variant);
      }
      
      // Sort variants: override variants first (by priority), then add variants
      variantsList.sort((a, b) => {
        const behaviorA = a.price_behavior || 'add';
        const behaviorB = b.price_behavior || 'add';
        
        // Override variants come first
        if (behaviorA === 'override' && behaviorB !== 'override') return -1;
        if (behaviorA !== 'override' && behaviorB === 'override') return 1;
        
        // If both are override, sort by priority (lower number = higher priority)
        if (behaviorA === 'override' && behaviorB === 'override') {
          const priorityA = a.override_priority !== null ? a.override_priority : 999999;
          const priorityB = b.override_priority !== null ? b.override_priority : 999999;
          return priorityA - priorityB;
        }
        
        return 0;
      });
      
      // Find the winning override variant (first override after sorting = lowest priority number)
      let winningOverride = null;
      for (const variant of variantsList) {
        if ((variant.price_behavior || 'add') === 'override') {
          winningOverride = variant;
          break; // Take the first override (lowest priority number wins)
        }
      }
      
      // Apply the winning override first (if any)
      if (winningOverride) {
        const directPrice = parseFloat(winningOverride.price);
        const priceModifier = parseFloat(winningOverride.price_modifier);
        
        if (directPrice && directPrice > 0) {
          currentPrice = directPrice;
        } else if (priceModifier && priceModifier > 0) {
          currentPrice = priceModifier;
        } else {
          throw new Error(`Unable to determine override price for variant with ID ${winningOverride.id}`);
        }
      }
      
      // Now apply all add variants and collect names
      for (const variant of variantsList) {
        const priceBehavior = variant.price_behavior || 'add';
        
        if (priceBehavior === 'add') {
          // Add: add the modifier to current price
          const priceModifier = parseFloat(variant.price_modifier);
          if (priceModifier) {
            currentPrice += priceModifier;
          }
        }
        
        // Collect all variant names for display
        variantNames.push(variant.title_en || `${variant.variant_name}: ${variant.variant_value}`);
      }
      
      // Final unit price after all variants applied
      unitPrice = currentPrice;
      
      // Store variant details for special_instructions
      variantDetails = JSON.stringify({
        type: 'multi_variant',
        variant_ids: variants.map(v => typeof v === 'object' ? v.id : v),
        variant_names: variantNames
      });
    }
    // If single variant specified, get variant details
    else if (variant_id) {
      const [variant] = await executeQuery(
        `SELECT * FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1`,
        [variant_id, product_id]
      );
      
      if (!variant) {
        throw new Error(`Product variant with ID ${variant_id} not found or inactive`);
      }
      
      const variantStockQuantity = parseNumericValue(variant.stock_quantity);
      if (variantStockQuantity !== null && variantStockQuantity < quantity && !branchInventoryRecord) {
        throw new Error(`Insufficient stock for variant with ID ${variant_id}`);
      }
      
      unitPrice = resolveVariantUnitPrice(baseProductPrice, variant);
      if (unitPrice === null) {
        throw new Error(`Unable to determine price for variant with ID ${variant_id}`);
      }
    }

    if (branchId) {
      if (branchInventoryRecord) {
        if (branchInventoryRecord.is_available === 0) {
          throw new Error(`Selected item is not available at branch ${branchId}`);
        }
        const branchStock = parseDbInt(branchInventoryRecord.stock_quantity);
        const branchReserved = parseDbInt(branchInventoryRecord.reserved_quantity);
        const branchAvailable = branchStock - branchReserved;

        if (branchAvailable < quantity) {
          throw new Error(`Insufficient stock for ${variant_id ? 'variant' : 'product'} at branch ${branchId}`);
        }

        inventoryAdjustments.push({
          branch_inventory_id: branchInventoryRecord.id,
          branch_id: branchInventoryRecord.branch_id,
          product_id,
          variant_id: variant_id || null,
          quantity,
          branch_stock: branchStock,
          branch_reserved: branchReserved,
          branch_available: branchAvailable,
          remaining_after_order: branchAvailable - quantity
        });
      } else {
        throw new Error(`Selected item is not available at branch ${branchId}`);
      }
    }
    
    const resolvedUnitPrice = parseNumericValue(unitPrice);
    if (resolvedUnitPrice === null) {
      throw new Error(`Unable to determine price for product with ID ${product_id}`);
    }
    
    const totalPrice = resolvedUnitPrice * quantity;
    const itemPointsEarned = pointsPerItem * quantity;
    
    // Combine user's special instructions with variant details
    let combinedInstructions = special_instructions || '';
    if (variantDetails) {
      combinedInstructions = combinedInstructions 
        ? `${combinedInstructions}\n__VARIANT_DATA__:${variantDetails}`
        : `__VARIANT_DATA__:${variantDetails}`;
    }
    
    validatedItems.push({
      product_id,
      variant_id: variant_id || null,
      quantity,
      unit_price: resolvedUnitPrice,
      total_price: totalPrice,
      points_earned: itemPointsEarned,
      special_instructions: combinedInstructions || null,
      // Snapshot fields for product deletion handling
      product_name_en: product.title_en,
      product_name_ar: product.title_ar,
      product_sku: product.sku || null
    });
    
    subtotal += totalPrice;
    totalPointsEarned += itemPointsEarned;
  }
  
  return {
    items: validatedItems,
    subtotal,
    pointsEarned: totalPointsEarned,
    inventoryAdjustments
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
      payment_method,
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

    // Status filters - support both single values and comma-separated arrays
    if (status) {
      const statusArray = status.includes(',') ? status.split(',').map(s => s.trim()) : [status];
      if (statusArray.length > 0) {
        whereConditions.push(`o.order_status IN (${statusArray.map(() => '?').join(',')})`);
        queryParams.push(...statusArray);
      }
    }

    if (payment_status) {
      const paymentStatusArray = payment_status.includes(',') ? payment_status.split(',').map(s => s.trim()) : [payment_status];
      if (paymentStatusArray.length > 0) {
        whereConditions.push(`o.payment_status IN (${paymentStatusArray.map(() => '?').join(',')})`);
        queryParams.push(...paymentStatusArray);
      }
    }

    if (order_type) {
      const orderTypeArray = order_type.includes(',') ? order_type.split(',').map(s => s.trim()) : [order_type];
      if (orderTypeArray.length > 0) {
        whereConditions.push(`o.order_type IN (${orderTypeArray.map(() => '?').join(',')})`);
        queryParams.push(...orderTypeArray);
      }
    }

    // Payment method filter - support multi-select
    if (payment_method) {
      const paymentMethodArray = payment_method.includes(',') ? payment_method.split(',').map(s => s.trim()) : [payment_method];
      if (paymentMethodArray.length > 0) {
        whereConditions.push(`o.payment_method IN (${paymentMethodArray.map(() => '?').join(',')})`);
        queryParams.push(...paymentMethodArray);
      }
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
        o.subtotal, o.delivery_fee, o.delivery_fee_original, o.tax_amount, 
        o.discount_amount, o.shipping_discount_amount, o.total_amount,
        o.points_used, o.points_earned, o.promo_code_id, o.gift_card_id, o.special_instructions,
        o.estimated_delivery_time, o.delivered_at, o.cancelled_at, o.cancellation_reason,
        o.created_at, o.updated_at, o.guest_delivery_address,
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

    // Fetch order items for all orders in the result
    const orderIds = result.data.map(order => order.id);
    let allOrderItems = [];
    
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      allOrderItems = await executeQuery(`
        SELECT 
          oi.*,
          COALESCE(p.title_ar, oi.product_name_ar, '[Deleted Product]') as product_title_ar,
          COALESCE(p.title_en, oi.product_name_en, '[Deleted Product]') as product_title_en,
          p.main_image as product_image,
          COALESCE(p.sku, oi.product_sku) as product_sku,
          pv.title_ar as variant_title_ar,
          pv.title_en as variant_title_en,
          pv.variant_name,
          pv.variant_value
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.id
        WHERE oi.order_id IN (${placeholders})
        ORDER BY oi.order_id, oi.id ASC
      `, orderIds);
    }

    // Group order items by order_id for efficient lookup
    const orderItemsMap = {};
    allOrderItems.forEach(item => {
      if (!orderItemsMap[item.order_id]) {
        orderItemsMap[item.order_id] = [];
      }
      orderItemsMap[item.order_id].push(item);
    });

    // Transform the data to structure delivery address properly and attach order items
    const transformedData = result.data.map(order => {
      const transformed = { ...order };
      
      // Structure delivery address object if delivery address fields exist
      if (order.address_name || order.city_title_en || order.area_title_en) {
        // Regular user address from user_addresses table
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
      } else if (order.guest_delivery_address) {
        // Guest order address
        try {
          if (typeof order.guest_delivery_address === 'string') {
            // Try to parse as JSON first, if that fails, treat as plain text
            let guestAddress;
            try {
              guestAddress = JSON.parse(order.guest_delivery_address);
            } catch {
              // Plain text address
              guestAddress = order.guest_delivery_address;
            }
            
            if (typeof guestAddress === 'object') {
              // JSON object with coordinates
              transformed.delivery_address = {
                full_name: guestAddress.name || order.customer_name || 'Guest Customer',
                address_line: guestAddress.address || guestAddress.address_line || 'Guest address',
                city: guestAddress.city || '',
                area: guestAddress.area || '',
                governorate: guestAddress.governorate || guestAddress.city || '',
                latitude: guestAddress.latitude || null,
                longitude: guestAddress.longitude || null
              };
            } else {
              // Plain text address
              transformed.delivery_address = {
                full_name: order.customer_name || 'Guest Customer',
                address_line: guestAddress,
                city: '',
                area: '',
                governorate: '',
                latitude: null,
                longitude: null
              };
            }
          }
        } catch (error) {
          console.warn('Error parsing guest_delivery_address:', error);
          transformed.delivery_address = {
            full_name: order.customer_name || 'Guest Customer',
            address_line: 'Unable to parse guest address',
            city: '',
            area: '',
            governorate: '',
            latitude: null,
            longitude: null
          };
        }
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
      delete transformed.guest_delivery_address;
      
      // Attach order items to this order
      transformed.order_items = orderItemsMap[order.id] || [];
      
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

    // Get order items with fallback to snapshot fields for deleted products
    const orderItems = await executeQuery(`
      SELECT 
        oi.*,
        COALESCE(p.title_ar, oi.product_name_ar, '[Deleted Product]') as product_title_ar,
        COALESCE(p.title_en, oi.product_name_en, '[Deleted Product]') as product_title_en,
        p.main_image as product_image,
        COALESCE(p.sku, oi.product_sku) as product_sku,
        pv.title_ar as variant_title_ar,
        pv.title_en as variant_title_en,
        pv.variant_name,
        pv.variant_value
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `, [req.params.id]);

    // Attach order items on the order object for downstream consumers
    order.order_items = orderItems;

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
      // Regular user address from user_addresses table
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
    } else if (order.guest_delivery_address) {
      // Guest order address
      try {
        if (typeof order.guest_delivery_address === 'string') {
          // Try to parse as JSON first, if that fails, treat as plain text
          let guestAddress;
          try {
            guestAddress = JSON.parse(order.guest_delivery_address);
          } catch {
            // Plain text address
            guestAddress = order.guest_delivery_address;
          }
          
          if (typeof guestAddress === 'object') {
            // JSON object with coordinates
            order.delivery_address = {
              full_name: guestAddress.name || order.customer_name || 'Guest Customer',
              address_line: guestAddress.address || guestAddress.address_line || 'Guest address',
              city: guestAddress.city || '',
              area: guestAddress.area || '',
              governorate: guestAddress.governorate || guestAddress.city || '',
              latitude: guestAddress.latitude || null,
              longitude: guestAddress.longitude || null
            };
          } else {
            // Plain text address
            order.delivery_address = {
              full_name: order.customer_name || 'Guest Customer',
              address_line: guestAddress,
              city: '',
              area: '',
              governorate: '',
              latitude: null,
              longitude: null
            };
          }
        }
      } catch (error) {
        console.warn('Error parsing guest_delivery_address:', error);
        order.delivery_address = {
          full_name: order.customer_name || 'Guest Customer',
          address_line: 'Unable to parse guest address',
          city: '',
          area: '',
          governorate: '',
          latitude: null,
          longitude: null
        };
      }
      
      // Clean up the guest_delivery_address field
      delete order.guest_delivery_address;
    } else {
      order.delivery_address = null;
    }

    res.json({
      success: true,
      data: {
        order,
        order_items: orderItems,
        // Maintain legacy "items" key for backward compatibility
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
      branch_id, // Add branch_id parameter for proper delivery calculation
      customer_id
    } = req.body;

    const isDeliveryOrder = order_type === 'delivery';

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
  const { items: validatedItems, subtotal, pointsEarned } = await validateAndCalculateOrderItems(items, branch_id || null);

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
    
  if (isDeliveryOrder) {
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
    
  const originalDeliveryFee = Number(deliveryCalculation.delivery_fee || 0);
  const distanceBasedFreeShipping = deliveryCalculation.free_shipping_applied || false;

  let adjustedDeliveryFee = originalDeliveryFee;
  let shippingDiscountAmount = 0;
  let promoDiscountAmount = 0;

  // If distance-based free shipping is already applied, record it
  if (distanceBasedFreeShipping && originalDeliveryFee === 0) {
    // The delivery fee is already 0 from distance-based calculation
    // No need to adjust, but we should note this in the response
    console.log('✅ Distance-based free shipping already applied in delivery calculation');
  }

    const promoUserId = (() => {
      if (isGuestOrder) {
        return null;
      }
      if (req.user && ['admin', 'staff'].includes(req.user.user_type)) {
        const parsedCustomerId = sanitizePointsValue(customer_id);
        if (parsedCustomerId > 0) {
          return parsedCustomerId;
        }
      }
      return req.user?.id || null;
    })();

    // Apply promo code if provided
  let promoDetails = null;
    
    if (promo_code) {
      try {
        const promoResult = await applyPromoCode(
          promo_code,
          subtotal,
          promoUserId,
          originalDeliveryFee
        );
        if (promoResult) {
          if (promoResult.isFreeShipping) {
            if (isDeliveryOrder) {
              const computedShippingDiscount = Number(promoResult.discountAmount || 0);
              shippingDiscountAmount = Math.min(originalDeliveryFee, computedShippingDiscount);
              adjustedDeliveryFee = Math.max(originalDeliveryFee - shippingDiscountAmount, 0);
              console.log('🚚 Free shipping applied:', {
                originalDeliveryFee,
                shippingDiscountAmount,
                adjustedDeliveryFee
              });
            } else {
              console.log('🚫 Skipping free shipping promo for non-delivery order');
            }
          } else {
            promoDiscountAmount = Number(promoResult.discountAmount || 0);
          }
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
  const taxAmount = (subtotal + adjustedDeliveryFee - promoDiscountAmount) * taxRate;

    const sanitizedPointsRequest = sanitizePointsValue(points_to_use);
    let pointsSummary = {
      requestedPoints: sanitizedPointsRequest,
      appliedPoints: 0,
      discountValue: 0,
      availablePoints: 0,
      remainingPoints: 0,
      blocked: false
    };

  const orderTotalBeforePoints = subtotal + adjustedDeliveryFee + taxAmount - promoDiscountAmount;

    if (sanitizedPointsRequest > 0) {
      let pointsUserId = null;

      if (req.user && ['admin', 'staff'].includes(req.user.user_type) && customer_id) {
        const parsedCustomerId = sanitizePointsValue(customer_id); // reuse sanitizer for integer conversion
        pointsUserId = parsedCustomerId > 0 ? parsedCustomerId : null;
      } else if (req.user?.id) {
        pointsUserId = req.user.id;
      }

      if (pointsUserId) {
        pointsSummary = await calculatePointsRedemption({
          userId: pointsUserId,
          requestedPoints: sanitizedPointsRequest,
          orderTotal: orderTotalBeforePoints
        });
      } else {
        pointsSummary.blocked = true;
      }
    }

    const totalAmount = Math.max(0, orderTotalBeforePoints - pointsSummary.discountValue);
    const totalPromoDiscount = promoDiscountAmount + shippingDiscountAmount;

    res.json({
      success: true,
      data: {
        items: validatedItems,
        subtotal,
  delivery_fee: adjustedDeliveryFee,
  delivery_fee_original: originalDeliveryFee,
        tax_amount: taxAmount,
        discount_amount: promoDiscountAmount,
        shipping_discount_amount: shippingDiscountAmount,
        total_discount_amount: totalPromoDiscount,
        total_amount: totalAmount,
        points_requested: pointsSummary.requestedPoints,
        points_applied: pointsSummary.appliedPoints,
        points_discount_amount: pointsSummary.discountValue,
        points_available: pointsSummary.availablePoints,
        points_remaining: pointsSummary.remainingPoints,
        points_blocked: pointsSummary.blocked,
        points_rate: LOYALTY_POINTS_RATE,
        points_earned: pointsEarned,
        promo_details: promoDetails,
        // Include delivery calculation details
        delivery_calculation: {
          calculation_method: deliveryCalculation.calculation_method,
          distance_km: deliveryCalculation.distance_km,
          zone_name: deliveryCalculation.zone_name,
          free_shipping_applied: deliveryCalculation.free_shipping_applied || distanceBasedFreeShipping,
          free_shipping_threshold: deliveryCalculation.free_shipping_threshold
        }
      }
    });

  } catch (error) {
    const normalizedMessage = (error?.message || '').toLowerCase();
    if (
      normalizedMessage.includes('not found') ||
      normalizedMessage.includes('out of stock') ||
      normalizedMessage.includes('insufficient stock') ||
      normalizedMessage.includes('not available at branch')
    ) {
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
 * @route   POST /api/orders/branch-availability
 * @desc    Get availability status per branch for the provided cart items
 * @access  Public/Private (guest and authenticated)
 */
router.post('/branch-availability', optionalAuth, validateOrderItems, async (req, res, next) => {
  try {
    const { branch_ids, include_inactive } = req.body;
    const items = req.body.items || [];

    // Determine which branches to evaluate
    let branches = [];
    const uniqueBranchIds = Array.isArray(branch_ids)
      ? Array.from(new Set(branch_ids.filter(id => Number.isFinite(Number(id))).map(id => Number(id))))
      : [];

    if (uniqueBranchIds.length > 0) {
      const placeholders = uniqueBranchIds.map(() => '?').join(',');
      branches = await executeQuery(
        `SELECT id, title_en, title_ar, is_active FROM branches WHERE id IN (${placeholders})`,
        uniqueBranchIds
      );
    } else {
      const onlyActive = include_inactive === true || include_inactive === 'true' ? '' : 'WHERE is_active = 1';
      branches = await executeQuery(
        `SELECT id, title_en, title_ar, is_active FROM branches ${onlyActive} ORDER BY title_en ASC`
      );
    }

    if (!branches || branches.length === 0) {
      return res.json({
        success: true,
        data: {
          branches: []
        }
      });
    }

    const availability = [];

    for (const branch of branches) {
      if (!branch?.is_active) {
        availability.push({
          branch_id: branch.id,
          status: 'inactive',
          issues: ['Branch is inactive'],
          message: 'Branch is inactive'
        });
        continue;
      }

      try {
        const { inventoryAdjustments } = await validateAndCalculateOrderItems(items, branch.id);

        let minRemaining = null;
        let minAvailable = null;

        inventoryAdjustments.forEach((adjustment) => {
          const branchAvailable = Number(adjustment?.branch_available);
          const remainingAfterOrder = Number(adjustment?.remaining_after_order);

          if (Number.isFinite(branchAvailable)) {
            minAvailable = minAvailable === null ? branchAvailable : Math.min(minAvailable, branchAvailable);
          }

          if (Number.isFinite(remainingAfterOrder)) {
            minRemaining = minRemaining === null ? remainingAfterOrder : Math.min(minRemaining, remainingAfterOrder);
          }
        });

        availability.push({
          branch_id: branch.id,
          status: 'available',
          min_available: minAvailable,
          min_remaining: minRemaining,
          issues: []
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Branch cannot fulfill this order';
        availability.push({
          branch_id: branch.id,
          status: 'unavailable',
          issues: [message],
          message
        });
      }
    }

    res.json({
      success: true,
      data: {
        branches: availability
      }
    });
  } catch (error) {
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
  const resolvedCustomerId = sanitizePointsValue(customer_id);
  const customerIdForOrder = resolvedCustomerId > 0 ? resolvedCustomerId : null;
  const isAdminOrder = req.user && customerIdForOrder; // Admin creating order for customer
  const isDeliveryOrder = order_type === 'delivery';

    console.log('\n🏪 [ORDER DEBUG] Order creation started...');
    console.log('🏪 [ORDER DEBUG] Request user:', req.user ? { id: req.user.id, user_type: req.user.user_type } : 'None');
  console.log('🏪 [ORDER DEBUG] Order flags:', { isGuestOrder, isAdminOrder });
  console.log('🏪 [ORDER DEBUG] Customer info:', { customer_id: customerIdForOrder, customer_name, customer_phone, customer_email });

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
  if (isDeliveryOrder) {
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
  const userIdToCheck = isAdminOrder ? customerIdForOrder : req.user.id;

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
  const { items: validatedItems, subtotal, pointsEarned, inventoryAdjustments } = await validateAndCalculateOrderItems(items, branch_id);

    // Calculate delivery fee using enhanced shipping system
    let deliveryCalculation = { delivery_fee: 0, calculation_method: 'pickup', free_shipping_applied: false };
    
  if (isDeliveryOrder) {
      // For guest orders with delivery address coordinates
      if (isGuestOrder && guest_delivery_address) {
        let guestCoordinates = null;
        
        // Parse guest_delivery_address (can be string or object)
        if (typeof guest_delivery_address === 'string') {
          try {
            const parsed = JSON.parse(guest_delivery_address);
            if (parsed.latitude && parsed.longitude) {
              guestCoordinates = {
                latitude: Number(parsed.latitude),
                longitude: Number(parsed.longitude),
                branch_id: branch_id
              };
            }
          } catch (e) {
            console.log('⚠️ Could not parse guest_delivery_address as JSON, using default delivery fee');
          }
        } else if (typeof guest_delivery_address === 'object') {
          if (guest_delivery_address.latitude && guest_delivery_address.longitude) {
            guestCoordinates = {
              latitude: Number(guest_delivery_address.latitude),
              longitude: Number(guest_delivery_address.longitude),
              branch_id: branch_id
            };
          }
        }
        
        if (guestCoordinates) {
          console.log('📍 Calculating delivery fee for guest with coordinates:', guestCoordinates);
          deliveryCalculation = await calculateDeliveryFee(guestCoordinates, order_type, subtotal);
          console.log('💰 Guest delivery fee calculated:', deliveryCalculation);
        } else {
          // Fallback: use default delivery fee for branch
          console.log('⚠️ No coordinates for guest, using default delivery fee');
          deliveryCalculation = await calculateDeliveryFee({ branch_id: branch_id }, order_type, subtotal);
        }
      }
      // For authenticated users with delivery address
      else if (!isGuestOrder && addressAreaId) {
      // Try to get coordinates from the address
  const userIdForAddress = isGuestOrder ? null : (isAdminOrder ? customerIdForOrder : req.user.id);
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
    }

    const originalDeliveryFee = Number(deliveryCalculation.delivery_fee || 0);
    const distanceBasedFreeShipping = deliveryCalculation.free_shipping_applied || false;
    
    let deliveryFee = originalDeliveryFee;
    let shippingDiscountAmount = 0;
    let promoDiscountAmount = 0;
    let promoCodeId = null;
    let isFreeShippingPromo = false;
    
    // Important: If distance-based free shipping is already applied, 
    // the delivery_fee is already 0, so we should NOT apply promo code free shipping on top
    if (promo_code && !distanceBasedFreeShipping) {
      const promoResult = await applyPromoCode(
        promo_code,
        subtotal,
        isGuestOrder ? null : (isAdminOrder ? customerIdForOrder : req.user.id),
        originalDeliveryFee
      );
      if (promoResult) {
        promoCodeId = promoResult.promo.id;
        isFreeShippingPromo = promoResult.isFreeShipping;
        
        if (isFreeShippingPromo) {
          if (isDeliveryOrder) {
            const computedShippingDiscount = Number(promoResult.discountAmount || 0);
            shippingDiscountAmount = Math.min(originalDeliveryFee, computedShippingDiscount);
            deliveryFee = Math.max(originalDeliveryFee - shippingDiscountAmount, 0);
            console.log('🚚 Free shipping promo applied for order:', {
              originalDeliveryFee,
              shippingDiscountAmount,
              deliveryFee
            });
          } else {
            console.log('🚫 Skipping free shipping promo for non-delivery order');
            isFreeShippingPromo = false;
          }
        } else {
          promoDiscountAmount = Number(promoResult.discountAmount || 0);
        }
      }
    } else if (promo_code && distanceBasedFreeShipping) {
      console.log('⚠️ Distance-based free shipping already applied. Promo code free shipping will be ignored.');
      // Still apply non-shipping promo codes
      const promoResult = await applyPromoCode(
        promo_code,
        subtotal,
        isGuestOrder ? null : (isAdminOrder ? customerIdForOrder : req.user.id),
        originalDeliveryFee
      );
      if (promoResult && !promoResult.isFreeShipping) {
        promoCodeId = promoResult.promo.id;
        promoDiscountAmount = Number(promoResult.discountAmount || 0);
      }
    }

    // Calculate tax
    const taxRate = 0; // Configure as needed
    const taxAmount = (subtotal + deliveryFee - promoDiscountAmount) * taxRate;

  const orderUserId = isGuestOrder && !isAdminOrder ? null : (isAdminOrder ? customerIdForOrder : req.user.id);
    const orderTotalBeforePoints = subtotal + deliveryFee + taxAmount - promoDiscountAmount;
    const sanitizedPointsRequest = sanitizePointsValue(points_to_use);

    let pointsSummary = {
      requestedPoints: sanitizedPointsRequest,
      appliedPoints: 0,
      discountValue: 0,
      availablePoints: 0,
      remainingPoints: 0
    };

    if (!isGuestOrder && orderUserId && sanitizedPointsRequest > 0) {
      pointsSummary = await calculatePointsRedemption({
        userId: orderUserId,
        requestedPoints: sanitizedPointsRequest,
        orderTotal: orderTotalBeforePoints
      });
    }

    const totalAmount = Math.max(0, orderTotalBeforePoints - pointsSummary.discountValue);

    // Generate order number
    const orderNumber = await generateOrderNumber();
    
    console.log('🔍 Order creation debug:');
    console.log('  isGuestOrder:', isGuestOrder);
    console.log('  isAdminOrder:', isAdminOrder);
    console.log('  req.user:', req.user ? `{id: ${req.user.id}}` : 'null');
    console.log('  orderUserId:', orderUserId);
    console.log('  pointsSummary:', pointsSummary);
    
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
  originalDeliveryFee,
      taxAmount,
  promoDiscountAmount,
  shippingDiscountAmount,
      totalAmount,
      isFreeShippingPromo,
      points_to_use: isGuestOrder ? 0 : pointsSummary.requestedPoints,
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
            subtotal, delivery_fee_original, delivery_fee, tax_amount, discount_amount, shipping_discount_amount, total_amount,
            points_used, points_earned, promo_code_id, special_instructions,
            guest_delivery_address, is_guest
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          originalDeliveryFee,
          deliveryFee,
          taxAmount, 
          promoDiscountAmount,
          shippingDiscountAmount,
          totalAmount,
          isGuestOrder ? 0 : pointsSummary.appliedPoints, 
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
            points_earned, special_instructions, product_name_en, product_name_ar, product_sku
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          orderId, // Use the actual order ID instead of LAST_INSERT_ID()
          item.product_id, 
          nullifyUndefined(item.variant_id), 
          item.quantity, 
          item.unit_price,
          item.total_price, 
          nullifyUndefined(item.points_earned), 
          nullifyUndefined(item.special_instructions),
          item.product_name_en,
          item.product_name_ar,
          nullifyUndefined(item.product_sku)
        ]
      });
    });

      if (inventoryAdjustments && inventoryAdjustments.length > 0) {
        inventoryAdjustments.forEach(adjustment => {
          orderItemsQueries.push({
            query: `
              UPDATE branch_inventory
              SET reserved_quantity = reserved_quantity + ?, updated_at = NOW()
              WHERE id = ?
            `,
            params: [adjustment.quantity, adjustment.branch_inventory_id]
          });
        });
      }

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
        totalDiscountApplied: promoDiscountAmount + shippingDiscountAmount
      });
      
      orderItemsQueries.push({
        query: `
          INSERT INTO promo_code_usages (promo_code_id, user_id, order_id, discount_amount)
          VALUES (?, ?, ?, ?)
        `,
        params: [nullifyUndefined(promoCodeId), req.user.id, orderId, promoDiscountAmount + shippingDiscountAmount]
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

    if (newOrder) {
      const normalizedDeliveryFee = Number(newOrder.delivery_fee || 0);
      const normalizedShippingDiscount = Number(newOrder.shipping_discount_amount || 0);
      const normalizedPromoDiscount = Number(newOrder.discount_amount || 0);

      newOrder.delivery_fee = normalizedDeliveryFee;
      newOrder.shipping_discount_amount = normalizedShippingDiscount;
      newOrder.discount_amount = normalizedPromoDiscount;
      newOrder.delivery_fee_original = newOrder.delivery_fee_original !== null && newOrder.delivery_fee_original !== undefined
        ? Number(newOrder.delivery_fee_original)
        : Number((normalizedDeliveryFee + normalizedShippingDiscount).toFixed(2));
      newOrder.total_discount_amount = Number((normalizedPromoDiscount + normalizedShippingDiscount).toFixed(2));

      newOrder.points_discount_amount = pointsSummary.discountValue;
      newOrder.points_requested = pointsSummary.requestedPoints;
      newOrder.points_remaining = pointsSummary.remainingPoints;
      newOrder.points_rate = LOYALTY_POINTS_RATE;
    }

    // Handle loyalty points redemption immediately after order creation
    if (!isGuestOrder && orderUserId) {
      const pointsUsed = parseDbInt(newOrder.points_used, 0);
      if (pointsUsed > 0) {
        try {
          await redeemLoyaltyPoints({
            userId: orderUserId,
            orderId,
            orderNumber,
            points: pointsUsed
          });
        } catch (loyaltyError) {
          console.error('❌ Loyalty points redemption failed for order', orderId, loyaltyError);
        }
      }
    }

    // Emit socket event for new order
    if (global.socketManager) {
      // Apply address transformation for socket broadcast (same logic as main orders endpoint)
      let transformedAddress = null;
      
      if (newOrder.guest_delivery_address) {
        // Guest order address transformation
        try {
          if (typeof newOrder.guest_delivery_address === 'string') {
            // Try to parse as JSON first, if that fails, treat as plain text
            let guestAddress;
            try {
              guestAddress = JSON.parse(newOrder.guest_delivery_address);
            } catch {
              // Plain text address
              guestAddress = newOrder.guest_delivery_address;
            }
            
            if (typeof guestAddress === 'object') {
              // JSON object with coordinates
              transformedAddress = {
                full_name: guestAddress.name || newOrder.customer_name || 'Guest Customer',
                address_line: guestAddress.address || guestAddress.address_line || 'Guest address',
                city: guestAddress.city || '',
                area: guestAddress.area || '',
                governorate: guestAddress.governorate || guestAddress.city || '',
                latitude: guestAddress.latitude || null,
                longitude: guestAddress.longitude || null
              };
            } else {
              // Plain text address
              transformedAddress = {
                full_name: newOrder.customer_name || 'Guest Customer',
                address_line: guestAddress,
                city: '',
                area: '',
                governorate: '',
                latitude: null,
                longitude: null
              };
            }
          }
        } catch (error) {
          console.warn('Error parsing guest_delivery_address for socket broadcast:', error);
          transformedAddress = {
            full_name: newOrder.customer_name || 'Guest Customer',
            address_line: 'Unable to parse guest address',
            city: '',
            area: '',
            governorate: '',
            latitude: null,
            longitude: null
          };
        }
      }
      
      if (!transformedAddress && newOrder.delivery_address_id) {
        try {
          const [addressInfo] = await executeQuery(`
            SELECT ua.name, ua.building_no, ua.floor_no, ua.apartment_no, ua.details,
                   ua.latitude, ua.longitude,
                   a.title_en AS area_title_en, a.title_ar AS area_title_ar,
                   c.title_en AS city_title_en, c.title_ar AS city_title_ar
            FROM user_addresses ua
            LEFT JOIN areas a ON ua.area_id = a.id
            LEFT JOIN cities c ON ua.city_id = c.id
            WHERE ua.id = ?
          `, [newOrder.delivery_address_id]);

          if (addressInfo) {
            transformedAddress = {
              full_name: addressInfo.name || newOrder.customer_name || '',
              address_line: [
                addressInfo.building_no ? `Building ${addressInfo.building_no}` : '',
                addressInfo.floor_no ? `Floor ${addressInfo.floor_no}` : '',
                addressInfo.apartment_no ? `Apt ${addressInfo.apartment_no}` : '',
                addressInfo.details || ''
              ].filter(Boolean).join(', ') || addressInfo.details || 'Address details not available',
              city: addressInfo.city_title_en || '',
              city_ar: addressInfo.city_title_ar || '',
              area: addressInfo.area_title_en || '',
              area_ar: addressInfo.area_title_ar || '',
              governorate: addressInfo.city_title_en || '',
              governorate_ar: addressInfo.city_title_ar || '',
              latitude: addressInfo.latitude || null,
              longitude: addressInfo.longitude || null
            };
          }
        } catch (addressError) {
          console.warn('Error fetching delivery address for socket broadcast:', addressError);
        }
      }
      
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
        delivery_address: transformedAddress, // Add transformed address
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

    const loyaltyMeta = {
      requested_points: pointsSummary.requestedPoints,
      applied_points: pointsSummary.appliedPoints,
      discount_value: pointsSummary.discountValue,
      points_rate: LOYALTY_POINTS_RATE,
      remaining_points: pointsSummary.remainingPoints
    };

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      message_ar: 'تم إنشاء الطلب بنجاح',
      data: { order: newOrder, loyalty: loyaltyMeta }
    });

  } catch (error) {
    const normalizedMessage = (error?.message || '').toLowerCase();
    if (
      normalizedMessage.includes('not found') ||
      normalizedMessage.includes('out of stock') ||
      normalizedMessage.includes('insufficient stock') ||
      normalizedMessage.includes('not available at branch') ||
      normalizedMessage.includes('promo')
    ) {
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
      total_amount,
      discount_amount,
      promo_code_id,
      promo_code,
      promo_discount_amount
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

    // Calculate delivery fee based on order type change
    let deliveryFee = currentOrder.delivery_fee;
    let recalculateTotal = false;
    
    if (order_type && order_type !== currentOrder.order_type) {
      if (order_type === 'pickup') {
        // Set delivery fee to 0 when changing to pickup
        deliveryFee = 0;
        recalculateTotal = true;
        console.log(`Order ${req.params.id}: Changed to pickup, setting delivery_fee to 0`);
      } else if (order_type === 'delivery' && delivery_address_id) {
        // Recalculate delivery fee when changing to delivery
        try {
          const [address] = await executeQuery(
            'SELECT latitude, longitude, area_id FROM user_addresses WHERE id = ?',
            [delivery_address_id]
          );
          
          if (address) {
            const deliveryCalc = await calculateDeliveryFee(
              {
                latitude: address.latitude,
                longitude: address.longitude,
                area_id: address.area_id,
                branch_id: currentOrder.branch_id
              },
              'delivery',
              currentOrder.subtotal
            );
            deliveryFee = deliveryCalc.delivery_fee;
            recalculateTotal = true;
            console.log(`Order ${req.params.id}: Changed to delivery, recalculated delivery_fee: ${deliveryFee}`);
          }
        } catch (error) {
          console.error('Error recalculating delivery fee:', error);
        }
      }
    }

    // Recalculate total amount if delivery fee changed
    let finalTotalAmount = total_amount;
    if (recalculateTotal && !total_amount) {
      const finalSubtotal = subtotal || currentOrder.subtotal;
      const taxAmount = currentOrder.tax_amount || 0;
      const discountAmount = (discount_amount !== undefined && discount_amount !== null)
        ? discount_amount
        : (currentOrder.discount_amount || 0);
      finalTotalAmount = Number(finalSubtotal) + Number(deliveryFee) + Number(taxAmount) - Number(discountAmount);
      console.log(`Order ${req.params.id}: Recalculated total: ${finalTotalAmount} (subtotal: ${finalSubtotal}, delivery: ${deliveryFee}, tax: ${taxAmount}, discount: ${discountAmount})`);
    }

    // Log promo code update
    console.log(`Order ${req.params.id}: Updating promo code:`, {
      promo_code: promo_code,
      promo_code_id: promo_code_id,
      promo_discount_amount: promo_discount_amount,
      discount_amount: discount_amount,
      previous_promo_code: currentOrder.promo_code,
      previous_promo_code_id: currentOrder.promo_code_id,
      previous_promo_discount_amount: currentOrder.promo_discount_amount
    });

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
        delivery_fee = ?,
        subtotal = COALESCE(?, subtotal),
        discount_amount = ?,
        total_amount = COALESCE(?, total_amount),
        promo_code_id = ?,
        promo_code = ?,
        promo_discount_amount = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      customer_name, 
      customer_phone, 
      customer_email, 
      special_instructions, 
      estimated_delivery_time, 
      delivery_address_id, 
      order_type, 
      deliveryFee,
      subtotal, 
      (discount_amount !== undefined && discount_amount !== null) ? discount_amount : currentOrder.discount_amount,
      finalTotalAmount,
      promo_code_id ?? null,
      promo_code,
      promo_discount_amount || 0,
      req.params.id
    ]);

    // Verify the update
    const [verifyOrder] = await executeQuery(
      'SELECT promo_code, promo_code_id, promo_discount_amount, discount_amount FROM orders WHERE id = ?',
      [req.params.id]
    );
    console.log(`Order ${req.params.id}: After update verification:`, {
      promo_code: verifyOrder.promo_code,
      promo_code_id: verifyOrder.promo_code_id,
      promo_discount_amount: verifyOrder.promo_discount_amount,
      discount_amount: verifyOrder.discount_amount
    });

    // Update order items if provided
    if (items && Array.isArray(items)) {
      // Delete existing order items
      await executeQuery('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
      
      // Insert new order items with product snapshot
      for (const item of items) {
        if (item.product_id && item.quantity && item.unit_price) {
          // Fetch product details for snapshot
          const [product] = await executeQuery(
            'SELECT title_en, title_ar, sku FROM products WHERE id = ?',
            [item.product_id]
          );
          
          await executeQuery(`
            INSERT INTO order_items (
              order_id, product_id, variant_id, quantity, unit_price, total_price,
              product_name_en, product_name_ar, product_sku
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            req.params.id,
            item.product_id,
            item.variant_id || null,
            item.quantity,
            item.unit_price,
            item.total_price || (item.quantity * item.unit_price),
            product?.title_en || item.product_name_en,
            product?.title_ar || item.product_name_ar,
            product?.sku || item.product_sku || null
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

    if (status === 'delivered' && currentOrder.order_status !== 'delivered') {
      const deliveryItems = await executeQuery(
        'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?',
        [req.params.id]
      );

      for (const item of deliveryItems) {
        let branchInventoryRecord = null;
        if (currentOrder.branch_id) {
          branchInventoryRecord = await getBranchInventoryRecord(currentOrder.branch_id, item.product_id, item.variant_id);
        }

        if (branchInventoryRecord) {
          queries.push({
            query: `
              UPDATE branch_inventory
              SET 
                stock_quantity = GREATEST(stock_quantity - ?, 0),
                reserved_quantity = GREATEST(reserved_quantity - ?, 0),
                updated_at = NOW()
              WHERE id = ?
            `,
            params: [item.quantity, item.quantity, branchInventoryRecord.id]
          });
        }

        if (!branchInventoryRecord) {
          console.warn(`No branch inventory found when delivering order ${req.params.id} for product ${item.product_id} variant ${item.variant_id || 'null'}. Applying fallback stock deduction.`);
        }

        if (item.variant_id) {
          queries.push({
            query: `
              UPDATE product_variants
              SET stock_quantity = GREATEST(stock_quantity - ?, 0)
              WHERE id = ?
            `,
            params: [item.quantity, item.variant_id]
          });
        } else {
          queries.push({
            query: `
              UPDATE products
              SET stock_quantity = GREATEST(stock_quantity - ?, 0)
              WHERE id = ?
            `,
            params: [item.quantity, item.product_id]
          });
        }
      }
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

    if (updatedOrder.user_id) {
      if (status === 'delivered' && currentOrder.order_status !== 'delivered') {
        const earnedPoints = parseDbInt(updatedOrder.points_earned, 0);
        if (earnedPoints > 0) {
          try {
            await awardLoyaltyPoints({
              userId: updatedOrder.user_id,
              orderId: updatedOrder.id,
              orderNumber: updatedOrder.order_number,
              points: earnedPoints
            });
          } catch (loyaltyError) {
            console.error('❌ Loyalty points awarding failed for order', req.params.id, loyaltyError);
          }
        }
      }

      if (status === 'cancelled' && currentOrder.order_status !== 'cancelled') {
        const pointsUsed = parseDbInt(currentOrder.points_used, 0);
        if (pointsUsed > 0) {
          try {
            await refundRedeemedPoints({
              userId: updatedOrder.user_id,
              orderId: updatedOrder.id,
              orderNumber: updatedOrder.order_number,
              points: pointsUsed
            });
          } catch (loyaltyError) {
            console.error('❌ Loyalty points refund failed for order', req.params.id, loyaltyError);
          }
        }

        if (currentOrder.order_status === 'delivered') {
          const earnedPoints = parseDbInt(currentOrder.points_earned, 0);
          if (earnedPoints > 0) {
            try {
              await revokeEarnedPoints({
                userId: updatedOrder.user_id,
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.order_number,
                points: earnedPoints
              });
            } catch (loyaltyError) {
              console.error('❌ Loyalty points revocation failed for order', req.params.id, loyaltyError);
            }
          }
        }
      }
    }

    // Send notification to customer about status change
    await sendOrderStatusNotification(updatedOrder, status, currentOrder.order_status);

    // Emit socket events for real-time updates
    if (global.socketManager) {
      // Emit order status update to all admin users
      global.socketManager.emitToAdmins('orderStatusUpdated', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.order_number,
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
        orderNumber: updatedOrder.order_number,
        status: updatedOrder.order_status,
        customerMessage: `Your order ${updatedOrder.order_number} status has been updated to: ${updatedOrder.order_status}`,
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

    if (currentOrder.user_id) {
      const pointsUsed = parseDbInt(currentOrder.points_used, 0);
      if (pointsUsed > 0) {
        try {
          await refundRedeemedPoints({
            userId: currentOrder.user_id,
            orderId: currentOrder.id,
            orderNumber: currentOrder.order_number,
            points: pointsUsed
          });
        } catch (loyaltyError) {
          console.error('❌ Loyalty points refund failed for cancelled order', req.params.id, loyaltyError);
        }
      }

      if (currentOrder.order_status === 'delivered') {
        const earnedPoints = parseDbInt(currentOrder.points_earned, 0);
        if (earnedPoints > 0) {
          try {
            await revokeEarnedPoints({
              userId: currentOrder.user_id,
              orderId: currentOrder.id,
              orderNumber: currentOrder.order_number,
              points: earnedPoints
            });
          } catch (loyaltyError) {
            console.error('❌ Loyalty points revocation failed for cancelled order', req.params.id, loyaltyError);
          }
        }
      }
    }

    // Send notification to customer about order cancellation
    await sendOrderStatusNotification(currentOrder, 'cancelled', currentOrder.order_status);

    // Emit socket events for real-time updates
    if (global.socketManager) {
      // Emit order cancellation to all admin users
      global.socketManager.emitToAdmins('orderCancelled', {
        orderId: currentOrder.id,
        orderNumber: currentOrder.order_number,
        customerName: currentOrder.customer_name,
        orderTotal: currentOrder.total_amount,
        cancellationReason: reason || 'Cancelled by user',
        cancelledBy: req.user.user_type === 'customer' ? 'Customer' : req.user.username || req.user.email,
        cancelledAt: new Date().toISOString()
      });

      // Emit to specific customer if they are connected
      global.socketManager.emitToUser(currentOrder.user_id, 'orderCancelled', {
        orderId: currentOrder.id,
        orderNumber: currentOrder.order_number,
        customerMessage: `Your order ${currentOrder.order_number} has been cancelled`,
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
    const promoResult = await applyPromoCode(
      promo_code,
      currentOrder.subtotal,
      req.user.id,
      Number(currentOrder.delivery_fee_original ?? currentOrder.delivery_fee ?? 0)
    );
    if (!promoResult) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code',
        message_ar: 'كود خصم غير صالح'
      });
    }

    // Recalculate totals with shipping adjustments
    const originalDeliveryFee = Number(currentOrder.delivery_fee_original ?? currentOrder.delivery_fee ?? 0);
    let updatedDeliveryFee = originalDeliveryFee;
    let newDiscountAmount = 0;
    let newShippingDiscount = 0;

    if (promoResult.isFreeShipping) {
      newShippingDiscount = Math.min(originalDeliveryFee, Number(promoResult.discountAmount || 0));
      updatedDeliveryFee = Math.max(originalDeliveryFee - newShippingDiscount, 0);
    } else {
      newDiscountAmount = Number(promoResult.discountAmount || 0);
    }

    const newTotalAmount = currentOrder.subtotal + updatedDeliveryFee + currentOrder.tax_amount - newDiscountAmount;

    const queries = [
      {
        query: `
          UPDATE orders SET
            promo_code_id = ?,
            discount_amount = ?,
            shipping_discount_amount = ?,
            delivery_fee_original = ?,
            delivery_fee = ?,
            total_amount = ?,
            updated_at = NOW()
          WHERE id = ?
        `,
        params: [
          promoResult.promo.id,
          newDiscountAmount,
          newShippingDiscount,
          originalDeliveryFee,
          updatedDeliveryFee,
          newTotalAmount,
          req.params.id
        ]
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
        params: [
          promoResult.promo.id,
          req.user.id,
          req.params.id,
          newDiscountAmount + newShippingDiscount
        ]
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
      `SELECT id, order_status, branch_id FROM orders WHERE id IN (${placeholders})`,
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

    if (status === 'delivered') {
      for (const order of currentOrders) {
        if (order.order_status === 'delivered') {
          continue;
        }

        const deliveryItems = await executeQuery(
          'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?',
          [order.id]
        );

        for (const item of deliveryItems) {
          let branchInventoryRecord = null;
          if (order.branch_id) {
            branchInventoryRecord = await getBranchInventoryRecord(order.branch_id, item.product_id, item.variant_id);
          }

          if (branchInventoryRecord) {
            queries.push({
              query: `
                UPDATE branch_inventory
                SET 
                  stock_quantity = GREATEST(stock_quantity - ?, 0),
                  reserved_quantity = GREATEST(reserved_quantity - ?, 0),
                  updated_at = NOW()
                WHERE id = ?
              `,
              params: [item.quantity, item.quantity, branchInventoryRecord.id]
            });
          } else {
            console.warn(`Bulk delivery: no branch inventory found for order ${order.id}, product ${item.product_id}, variant ${item.variant_id || 'null'}. Applying fallback stock deduction.`);
          }

          if (item.variant_id) {
            queries.push({
              query: `
                UPDATE product_variants
                SET stock_quantity = GREATEST(stock_quantity - ?, 0)
                WHERE id = ?
              `,
              params: [item.quantity, item.variant_id]
            });
          } else {
            queries.push({
              query: `
                UPDATE products
                SET stock_quantity = GREATEST(stock_quantity - ?, 0)
                WHERE id = ?
              `,
              params: [item.quantity, item.product_id]
            });
          }
        }
      }
    }

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

/**
 * @route   PUT /api/orders/:id/payment-method
 * @desc    Update order payment method
 * @access  Private (Admin/Staff)
 */
router.put('/:id/payment-method', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { payment_method } = req.body;
    
    if (!payment_method || !['cash', 'card', 'online'].includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment method is required (cash, card, online)',
        message_ar: 'طريقة الدفع مطلوبة (نقد، بطاقة، أونلاين)'
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

    // Update payment method
    await executeQuery(
      'UPDATE orders SET payment_method = ?, updated_at = NOW() WHERE id = ?',
      [payment_method, req.params.id]
    );

    // Log the change
    await executeQuery(
      `INSERT INTO order_status_history (order_id, status, note, changed_by) 
       VALUES (?, ?, ?, ?)`,
      [
        req.params.id,
        currentOrder.order_status,
        `Payment method changed from ${currentOrder.payment_method} to ${payment_method}`,
        req.user.id
      ]
    );

    res.json({
      success: true,
      message: 'Payment method updated successfully',
      message_ar: 'تم تحديث طريقة الدفع بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/orders/:id/payment-status
 * @desc    Update order payment status
 * @access  Private (Admin/Staff)
 */
router.put('/:id/payment-status', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { payment_status } = req.body;
    
    if (!payment_status || !['pending', 'paid', 'failed', 'refunded'].includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment status is required (pending, paid, failed, refunded)',
        message_ar: 'حالة الدفع مطلوبة (معلق، مدفوع، فشل، مسترد)'
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

    // Update payment status
    await executeQuery(
      'UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      [payment_status, req.params.id]
    );

    // Log the change
    await executeQuery(
      `INSERT INTO order_status_history (order_id, status, note, changed_by) 
       VALUES (?, ?, ?, ?)`,
      [
        req.params.id,
        currentOrder.order_status,
        `Payment status changed from ${currentOrder.payment_status} to ${payment_status}`,
        req.user.id
      ]
    );

    // Emit socket events for real-time updates
    if (global.socketManager) {
      global.socketManager.emitToAdmins('orderPaymentUpdated', {
        orderId: currentOrder.id,
        customerName: currentOrder.customer_name,
        oldPaymentStatus: currentOrder.payment_status,
        newPaymentStatus: payment_status,
        updatedBy: req.user.username || req.user.email,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      message_ar: 'تم تحديث حالة الدفع بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/orders/:id/payment-link
 * @desc    Generate payment link for order
 * @access  Private (Admin/Staff)
 */
router.post('/:id/payment-link', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
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

    if (currentOrder.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid',
        message_ar: 'الطلب مدفوع بالفعل'
      });
    }

    // Generate the payment link using backend base URL
    const rawBaseUrl = (
      process.env.MPGS_PAYMENT_LINK_BASE_URL ||
      process.env.API_BASE_URL ||
      process.env.BACKEND_URL ||
      process.env.APP_BASE_URL ||
      ''
    ).trim();

    const normalizedBase = rawBaseUrl
      ? rawBaseUrl.replace(/\/+$/, '')
      : `http://localhost:${process.env.PORT || 3015}`;

    // Avoid double "/api" if the configured base already includes it
    const paymentBase = normalizedBase.replace(/\/api$/i, '');
    const paymentLink = `${paymentBase}/api/payments/mpgs/payment/view?orders_id=${currentOrder.id}&lang=en`;
    
    // You can also create a shorter link using a URL shortener service if needed
    const shortLink = paymentLink; // For now, use the full link

    // Log the payment link generation
    await executeQuery(
      `INSERT INTO order_status_history (order_id, status, note, changed_by) 
       VALUES (?, ?, ?, ?)`,
      [
        req.params.id,
        currentOrder.order_status,
        `Payment link generated: ${shortLink}`,
        req.user.id
      ]
    );

    res.json({
      success: true,
      message: 'Payment link generated successfully',
      message_ar: 'تم إنشاء رابط الدفع بنجاح',
      data: {
        payment_link: paymentLink,
        short_link: shortLink,
        order_id: currentOrder.id,
        order_number: currentOrder.order_number,
        total_amount: currentOrder.total_amount,
        customer_name: currentOrder.customer_name,
        customer_phone: currentOrder.customer_phone
      }
    });

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// GUEST ORDER LOOKUP
// =============================================================================

/**
 * Lookup guest orders by phone number and order number
 * This allows guest users to track their order status without authentication
 */
router.post('/guest/lookup', async (req, res, next) => {
  try {
    const { customer_phone, order_number } = req.body;

    // Validate required fields
    if (!customer_phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer phone number is required',
        message_ar: 'رقم هاتف العميل مطلوب'
      });
    }

    if (!order_number) {
      return res.status(400).json({
        success: false,
        message: 'Order number is required', 
        message_ar: 'رقم الطلب مطلوب'
      });
    }

    console.log('🔍 Guest order lookup request:', { customer_phone, order_number });

    // Query guest orders by phone and order number
    const [order] = await executeQuery(`
      SELECT 
        o.id,
        o.order_number,
        o.customer_name,
        o.customer_phone,
        o.customer_email,
        o.order_status,
        o.payment_status,
        o.order_type,
        o.payment_method,
        o.total_amount,
        o.delivery_fee,
        o.tax_amount,
        o.discount_amount,
        o.subtotal,
        o.special_instructions,
        o.guest_delivery_address,
        o.created_at,
        o.updated_at,
        o.estimated_delivery_time,
        o.delivered_at,
        o.cancelled_at,
        o.is_guest,
        b.title_en as branch_title_en,
        b.title_ar as branch_title_ar
      FROM orders o
      LEFT JOIN branches b ON o.branch_id = b.id
      WHERE o.customer_phone = ? 
        AND o.order_number = ? 
        AND o.is_guest = 1
    `, [customer_phone, order_number]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found with provided phone number and order number',
        message_ar: 'لم يتم العثور على الطلب برقم الهاتف ورقم الطلب المقدم'
      });
    }

    // Apply the same address transformation logic as other endpoints
    if (order.guest_delivery_address) {
      try {
        if (typeof order.guest_delivery_address === 'string') {
          let guestAddress;
          try {
            guestAddress = JSON.parse(order.guest_delivery_address);
          } catch {
            guestAddress = order.guest_delivery_address;
          }
          
          if (typeof guestAddress === 'object') {
            order.delivery_address = {
              full_name: guestAddress.name || order.customer_name || 'Guest Customer',
              address_line: guestAddress.address || guestAddress.address_line || 'Guest address',
              city: guestAddress.city || '',
              area: guestAddress.area || '',
              governorate: guestAddress.governorate || guestAddress.city || '',
              latitude: guestAddress.latitude || null,
              longitude: guestAddress.longitude || null
            };
          } else {
            order.delivery_address = {
              full_name: order.customer_name || 'Guest Customer',
              address_line: guestAddress,
              city: '',
              area: '',
              governorate: '',
              latitude: null,
              longitude: null
            };
          }
        }
      } catch (error) {
        console.warn('Error parsing guest_delivery_address in lookup:', error);
        order.delivery_address = {
          full_name: order.customer_name || 'Guest Customer',
          address_line: 'Unable to parse guest address',
          city: '',
          area: '',
          governorate: '',
          latitude: null,
          longitude: null
        };
      }
    } else {
      order.delivery_address = null;
    }

    // Remove the raw guest_delivery_address field for cleaner response
    delete order.guest_delivery_address;

    console.log('✅ Guest order found:', { 
      order_id: order.id, 
      order_number: order.order_number,
      status: order.order_status 
    });

    res.json({
      success: true,
      data: {
        order,
        message: 'Order found successfully',
        message_ar: 'تم العثور على الطلب بنجاح'
      }
    });

  } catch (error) {
    console.error('Error in guest order lookup:', error);
    next(error);
  }
});

module.exports = router;
