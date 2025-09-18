const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateId } = require('../middleware/validation');
const shippingService = require('../services/shippingService');

// =============================================================================
// SHIPPING ANALYTICS (Admin Dashboard)
// =============================================================================

/**
 * @route   GET /api/shipping/analytics
 * @desc    Get shipping analytics for dashboard
 * @access  Private (Admin/Staff)
 */
router.get('/analytics', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    // Get delivery fee statistics (using delivery_fee instead of shipping_cost)
    const deliveryStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_calculations,
        AVG(delivery_fee) as avg_shipping_cost,
        MIN(delivery_fee) as min_shipping_cost,
        MAX(delivery_fee) as max_shipping_cost,
        SUM(CASE WHEN delivery_fee = 0 THEN 1 ELSE 0 END) as free_shipping_count
      FROM orders 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Get zone usage statistics (mock data since we don't have distance tracking yet)
    const zoneUsage = await executeQuery(`
      SELECT 
        sz.name_en as zone_name_en,
        sz.name_ar as zone_name_ar,
        COUNT(o.id) as usage_count,
        AVG(o.delivery_fee) as avg_cost
      FROM shipping_zones sz
      CROSS JOIN (
        SELECT id, delivery_fee,
        CASE 
          WHEN delivery_fee = 0 THEN 1
          WHEN delivery_fee <= 5 THEN 1
          WHEN delivery_fee <= 8 THEN 2
          ELSE 3
        END as zone_id
        FROM orders 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) o
      WHERE sz.id = o.zone_id
      GROUP BY sz.id, sz.name_en, sz.name_ar
      ORDER BY usage_count DESC
    `);

    // Calculate free shipping percentage
    const totalOrders = deliveryStats[0]?.total_calculations || 0;
    const freeShippingCount = deliveryStats[0]?.free_shipping_count || 0;
    const freeShippingPercentage = totalOrders > 0 ? (freeShippingCount / totalOrders * 100) : 0;

    // Mock distance data since we don't have distance tracking yet
    const avgDistance = 15.5; // Mock average distance in km

    res.json({
      success: true,
      data: {
        distance_statistics: {
          avg_distance: avgDistance,
          min_distance: 2.0,
          max_distance: 35.0,
          avg_shipping_cost: parseFloat(deliveryStats[0]?.avg_shipping_cost || 0).toFixed(2)
        },
        free_shipping_analysis: {
          free_shipping_count: freeShippingCount,
          total_orders: totalOrders,
          free_shipping_percentage: parseFloat(freeShippingPercentage).toFixed(1)
        },
        calculation_summary: {
          total_calculations: totalOrders
        },
        zone_usage: zoneUsage
      }
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// SHIPPING ZONE MANAGEMENT (Admin)
// =============================================================================

/**
 * @route   GET /api/shipping/zones
 * @desc    Get all shipping zones
 * @access  Private (Admin/Staff)
 */
router.get('/zones', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const zones = await shippingService.getAllZones();
    
    res.json({
      success: true,
      data: { zones }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/shipping/zones
 * @desc    Create new shipping zone
 * @access  Private (Admin)
 */
router.post('/zones', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const {
      name_ar,
      name_en,
      description_ar,
      description_en,
      min_distance_km,
      max_distance_km,
      base_price,
      price_per_km,
      free_shipping_threshold,
      sort_order = 0
    } = req.body;

    // Validation
    if (!name_ar || !name_en || min_distance_km == null || max_distance_km == null || base_price == null) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: name_ar, name_en, min_distance_km, max_distance_km, base_price',
        message_ar: 'الحقول المطلوبة: الاسم بالعربية والإنجليزية، الحد الأدنى والأقصى للمسافة، السعر الأساسي'
      });
    }

    if (min_distance_km < 0 || max_distance_km <= min_distance_km) {
      return res.status(400).json({
        success: false,
        message: 'Invalid distance range. Max distance must be greater than min distance.',
        message_ar: 'نطاق مسافة غير صالح. الحد الأقصى يجب أن يكون أكبر من الحد الأدنى.'
      });
    }

    // Check for overlapping zones - allow adjacent zones (touching boundaries)
    const overlapping = await executeQuery(`
      SELECT id, name_en, min_distance_km, max_distance_km FROM shipping_zones
      WHERE is_active = 1 
        AND NOT (max_distance_km <= ? OR min_distance_km >= ?)
    `, [min_distance_km, max_distance_km]);

    if (overlapping.length > 0) {
      const conflictZone = overlapping[0];
      return res.status(400).json({
        success: false,
        message: `Distance range overlaps with existing zone: ${conflictZone.name_en} (${conflictZone.min_distance_km}km - ${conflictZone.max_distance_km}km)`,
        message_ar: `نطاق المسافة يتداخل مع منطقة موجودة: ${conflictZone.name_en} (${conflictZone.min_distance_km}كم - ${conflictZone.max_distance_km}كم)`,
        conflicting_zone: {
          name: conflictZone.name_en,
          min_distance: conflictZone.min_distance_km,
          max_distance: conflictZone.max_distance_km
        }
      });
    }

    const result = await executeQuery(`
      INSERT INTO shipping_zones (
        name_ar, name_en, description_ar, description_en,
        min_distance_km, max_distance_km, base_price, price_per_km,
        free_shipping_threshold, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name_ar, name_en, description_ar || null, description_en || null,
      min_distance_km, max_distance_km, base_price, price_per_km || 0,
      free_shipping_threshold || null, sort_order
    ]);

    const [newZone] = await executeQuery(
      'SELECT * FROM shipping_zones WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Shipping zone created successfully',
      message_ar: 'تم إنشاء منطقة الشحن بنجاح',
      data: { zone: newZone }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/shipping/zones/:id
 * @desc    Update shipping zone
 * @access  Private (Admin)
 */
router.put('/zones/:id', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const {
      name_ar,
      name_en,
      description_ar,
      description_en,
      min_distance_km,
      max_distance_km,
      base_price,
      price_per_km,
      free_shipping_threshold,
      sort_order,
      is_active
    } = req.body;

    // Check if zone exists
    const [existingZone] = await executeQuery(
      'SELECT * FROM shipping_zones WHERE id = ?',
      [req.params.id]
    );

    if (!existingZone) {
      return res.status(404).json({
        success: false,
        message: 'Shipping zone not found',
        message_ar: 'منطقة الشحن غير موجودة'
      });
    }

    // Validate distance range if provided
    if (min_distance_km != null && max_distance_km != null) {
      if (min_distance_km < 0 || max_distance_km <= min_distance_km) {
        return res.status(400).json({
          success: false,
          message: 'Invalid distance range',
          message_ar: 'نطاق مسافة غير صالح'
        });
      }

      // Check for overlapping zones (excluding current zone) - allow adjacent zones
      const overlapping = await executeQuery(`
        SELECT id, name_en, min_distance_km, max_distance_km FROM shipping_zones
        WHERE is_active = 1 AND id != ?
          AND NOT (max_distance_km <= ? OR min_distance_km >= ?)
      `, [req.params.id, min_distance_km, max_distance_km]);

      if (overlapping.length > 0) {
        const conflictZone = overlapping[0];
        return res.status(400).json({
          success: false,
          message: `Distance range overlaps with existing zone: ${conflictZone.name_en} (${conflictZone.min_distance_km}km - ${conflictZone.max_distance_km}km)`,
          message_ar: `نطاق المسافة يتداخل مع منطقة موجودة: ${conflictZone.name_en} (${conflictZone.min_distance_km}كم - ${conflictZone.max_distance_km}كم)`,
          conflicting_zone: {
            name: conflictZone.name_en,
            min_distance: conflictZone.min_distance_km,
            max_distance: conflictZone.max_distance_km
          }
        });
      }
    }

    // Update zone
    await executeQuery(`
      UPDATE shipping_zones SET
        name_ar = COALESCE(?, name_ar),
        name_en = COALESCE(?, name_en),
        description_ar = ?,
        description_en = ?,
        min_distance_km = COALESCE(?, min_distance_km),
        max_distance_km = COALESCE(?, max_distance_km),
        base_price = COALESCE(?, base_price),
        price_per_km = COALESCE(?, price_per_km),
        free_shipping_threshold = ?,
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
      WHERE id = ?
    `, [
      name_ar, name_en, description_ar, description_en,
      min_distance_km, max_distance_km, base_price, price_per_km,
      free_shipping_threshold, sort_order, is_active, req.params.id
    ]);

    const [updatedZone] = await executeQuery(
      'SELECT * FROM shipping_zones WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Shipping zone updated successfully',
      message_ar: 'تم تحديث منطقة الشحن بنجاح',
      data: { zone: updatedZone }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/shipping/zones/:id
 * @desc    Delete shipping zone (soft delete)
 * @access  Private (Admin)
 */
router.delete('/zones/:id', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const [zone] = await executeQuery(
      'SELECT id FROM shipping_zones WHERE id = ?',
      [req.params.id]
    );

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Shipping zone not found',
        message_ar: 'منطقة الشحن غير موجودة'
      });
    }

    // Check if zone is being used
    const [usageCount] = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM areas WHERE zone_id = ?) +
        (SELECT COUNT(*) FROM user_addresses WHERE shipping_zone_id = ?) +
        (SELECT COUNT(*) FROM shipping_calculations WHERE zone_id = ?) as total_usage
    `, [req.params.id, req.params.id, req.params.id]);

    if (usageCount.total_usage > 0) {
      // Soft delete if in use
      await executeQuery(
        'UPDATE shipping_zones SET is_active = 0, updated_at = NOW() WHERE id = ?',
        [req.params.id]
      );
    } else {
      // Hard delete if not in use
      await executeQuery('DELETE FROM shipping_zones WHERE id = ?', [req.params.id]);
    }

    res.json({
      success: true,
      message: 'Shipping zone deleted successfully',
      message_ar: 'تم حذف منطقة الشحن بنجاح'
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// BRANCH SHIPPING OVERRIDES
// =============================================================================

/**
 * @route   GET /api/shipping/branches/:branchId/zones
 * @desc    Get shipping zones for specific branch (with overrides)
 * @access  Private (Admin/Staff)
 */
router.get('/branches/:branchId/zones', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const zones = await shippingService.getBranchZonePricing(req.params.branchId);
    
    res.json({
      success: true,
      data: { zones }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/shipping/branches/:branchId/zones/:zoneId/override
 * @desc    Create or update branch-specific zone pricing override
 * @access  Private (Admin)
 */
router.post('/branches/:branchId/zones/:zoneId/override', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const { branchId, zoneId } = req.params;
    const {
      custom_base_price,
      custom_price_per_km,
      custom_free_threshold
    } = req.body;

    // Validate branch and zone exist
    const [branch] = await executeQuery('SELECT id FROM branches WHERE id = ?', [branchId]);
    const [zone] = await executeQuery('SELECT id FROM shipping_zones WHERE id = ?', [zoneId]);

    if (!branch || !zone) {
      return res.status(404).json({
        success: false,
        message: 'Branch or shipping zone not found',
        message_ar: 'الفرع أو منطقة الشحن غير موجودة'
      });
    }

    // Insert or update override
    await executeQuery(`
      INSERT INTO branch_shipping_zones (
        branch_id, zone_id, custom_base_price, custom_price_per_km, custom_free_threshold
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        custom_base_price = VALUES(custom_base_price),
        custom_price_per_km = VALUES(custom_price_per_km),
        custom_free_threshold = VALUES(custom_free_threshold),
        is_active = 1,
        updated_at = NOW()
    `, [branchId, zoneId, custom_base_price, custom_price_per_km, custom_free_threshold]);

    res.json({
      success: true,
      message: 'Branch shipping override created successfully',
      message_ar: 'تم إنشاء تخصيص شحن الفرع بنجاح'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/shipping/branches/:branchId/zones/:zoneId/override
 * @desc    Remove branch-specific zone pricing override
 * @access  Private (Admin)
 */
router.delete('/branches/:branchId/zones/:zoneId/override', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    await executeQuery(
      'UPDATE branch_shipping_zones SET is_active = 0 WHERE branch_id = ? AND zone_id = ?',
      [req.params.branchId, req.params.zoneId]
    );

    res.json({
      success: true,
      message: 'Branch shipping override removed successfully',
      message_ar: 'تم إزالة تخصيص شحن الفرع بنجاح'
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// SHIPPING CALCULATION ENDPOINTS
// =============================================================================

/**
 * @route   POST /api/shipping/calculate
 * @desc    Calculate shipping cost based on coordinates and branch
 * @access  Public
 */
router.post('/calculate', async (req, res, next) => {
  try {
    let {
      customer_latitude,
      customer_longitude,
      branch_id,
      order_amount = 0,
      delivery_address_id
    } = req.body;

    // Backward compatibility: accept legacy field names customer_lat/customer_lng
    if ((!customer_latitude || !customer_longitude) && (req.body.customer_lat || req.body.customer_lng)) {
      customer_latitude = customer_latitude ?? req.body.customer_lat;
      customer_longitude = customer_longitude ?? req.body.customer_lng;
    }

    // If still missing, try to resolve from delivery_address_id
    if ((!customer_latitude || !customer_longitude) && delivery_address_id) {
      try {
        const [addr] = await executeQuery(
          'SELECT latitude, longitude FROM user_addresses WHERE id = ? AND (latitude IS NOT NULL AND longitude IS NOT NULL)',
          [delivery_address_id]
        );
        if (addr) {
          customer_latitude = addr.latitude;
          customer_longitude = addr.longitude;
        }
      } catch (e) {
        // Ignore; validation below will handle missing coords
      }
    }

    if (!customer_latitude || !customer_longitude || !branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Customer coordinates and branch ID are required',
        message_ar: 'إحداثيات العميل ومعرف الفرع مطلوبان'
      });
    }

    const calculation = await shippingService.calculateShipping(
      customer_latitude,
      customer_longitude,
      branch_id,
      order_amount
    );

    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    // Provide structured 400 for known validation/business errors
    const msg = String(error?.message || error);
    if (msg.includes('exceeds maximum allowed')) {
      try {
        // Compute actual distance for the response
        const [branch] = await executeQuery(
          'SELECT id, latitude, longitude, title_en, title_ar FROM branches WHERE id = ? AND is_active = 1',
          [req.body.branch_id]
        );

        let distance = null;
        if (branch && branch.latitude && branch.longitude && req.body.customer_latitude && req.body.customer_longitude) {
          distance = shippingService.calculateDistance(
            Number(req.body.customer_latitude),
            Number(req.body.customer_longitude),
            Number(branch.latitude),
            Number(branch.longitude)
          );
        }

        // Suggest nearest in-range branch if possible
        let nearest = null;
        if (req.body.customer_latitude && req.body.customer_longitude) {
          const suggestion = await shippingService.getNearestBranch(
            Number(req.body.customer_latitude),
            Number(req.body.customer_longitude)
          );
          if (suggestion && suggestion.distance_km <= shippingService.maxDeliveryDistance) {
            nearest = suggestion;
          }
        }

        return res.status(400).json({
          success: false,
          code: 'OUT_OF_RANGE',
          message: `Delivery distance${distance !== null ? ` (${distance}km)` : ''} exceeds maximum allowed (${shippingService.maxDeliveryDistance}km)`,
          message_ar: 'تجاوزت المسافة الحد المسموح للتوصيل',
          data: {
            distance_km: distance,
            max_distance_km: shippingService.maxDeliveryDistance,
            nearest_branch: nearest
          }
        });
      } catch (e) {
        // Fall back to default error handler if something goes wrong here
        return next(error);
      }
    }

    next(error);
  }
});

/**
 * @route   POST /api/shipping/nearest-branch
 * @desc    Find nearest branch to customer coordinates
 * @access  Public
 */
router.post('/nearest-branch', async (req, res, next) => {
  try {
    const { customer_latitude, customer_longitude } = req.body;

    if (!customer_latitude || !customer_longitude) {
      return res.status(400).json({
        success: false,
        message: 'Customer coordinates are required',
        message_ar: 'إحداثيات العميل مطلوبة'
      });
    }

    const nearestBranch = await shippingService.getNearestBranch(
      customer_latitude,
      customer_longitude
    );

    res.json({
      success: true,
      data: { nearest_branch: nearestBranch }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/shipping/zones/distance/:distance
 * @desc    Get appropriate shipping zone for a specific distance
 * @access  Public
 */
router.get('/zones/distance/:distance', async (req, res, next) => {
  try {
    const distance = parseFloat(req.params.distance);
    const { branch_id } = req.query;

    if (isNaN(distance) || distance < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid distance is required',
        message_ar: 'مسافة صالحة مطلوبة'
      });
    }

    const zone = await shippingService.findShippingZone(distance, branch_id);

    res.json({
      success: true,
      data: { zone, distance_km: distance }
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// SHIPPING ANALYTICS & REPORTS
// =============================================================================

/**
 * @route   GET /api/shipping/analytics
 * @desc    Get shipping analytics and statistics
 * @access  Private (Admin/Staff)
 */
router.get('/analytics', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const { start_date, end_date, branch_id } = req.query;

    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    if (start_date) {
      whereClause += ' AND created_at >= ?';
      queryParams.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND created_at <= ?';
      queryParams.push(end_date);
    }

    if (branch_id) {
      whereClause += ' AND branch_id = ?';
      queryParams.push(branch_id);
    }

    // Zone distribution
    const zoneStats = await executeQuery(`
      SELECT 
        sz.name_en, sz.name_ar,
        COUNT(*) as calculation_count,
        AVG(sc.calculated_distance_km) as avg_distance,
        AVG(sc.total_shipping_cost) as avg_cost,
        SUM(CASE WHEN sc.free_shipping_applied = 1 THEN 1 ELSE 0 END) as free_shipping_count
      FROM shipping_calculations sc
      LEFT JOIN shipping_zones sz ON sc.zone_id = sz.id
      ${whereClause}
      GROUP BY sc.zone_id, sz.name_en, sz.name_ar
      ORDER BY calculation_count DESC
    `, queryParams);

    // Distance distribution
    const distanceStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_calculations,
        AVG(calculated_distance_km) as avg_distance,
        MIN(calculated_distance_km) as min_distance,
        MAX(calculated_distance_km) as max_distance,
        AVG(total_shipping_cost) as avg_shipping_cost
      FROM shipping_calculations sc
      ${whereClause}
    `, queryParams);

    // Free shipping analysis
    const freeShippingStats = await executeQuery(`
      SELECT 
        SUM(CASE WHEN free_shipping_applied = 1 THEN 1 ELSE 0 END) as free_shipping_count,
        COUNT(*) as total_calculations,
        ROUND((SUM(CASE WHEN free_shipping_applied = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as free_shipping_percentage,
        AVG(CASE WHEN free_shipping_applied = 0 THEN total_shipping_cost END) as avg_paid_shipping
      FROM shipping_calculations sc
      ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      data: {
        zone_distribution: zoneStats,
        distance_statistics: distanceStats[0],
        free_shipping_analysis: freeShippingStats[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// CUSTOMER SHIPPING ANALYTICS
// =============================================================================

/**
 * @route   GET /api/shipping/customer-analytics/:customerId
 * @desc    Get shipping analytics for a specific customer
 * @access  Private (Admin/Staff)
 */
router.get('/customer-analytics/:customerId', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const customerId = req.params.customerId;

    // Enhanced error handling
    if (!customerId || isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID provided',
        message_ar: 'معرف العميل المقدم غير صحيح',
        errors: ['Customer ID must be a valid number']
      });
    }

    // Check if customer exists
    const customerCheck = await executeQuery(
      'SELECT id, first_name, last_name FROM users WHERE id = ? AND user_type = ?',
      [customerId, 'customer']
    );

    if (customerCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        message_ar: 'العميل غير موجود',
        errors: ['No customer found with the provided ID']
      });
    }

    // Get customer's total orders and shipping statistics
    const orderStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(delivery_fee) as total_shipping_cost,
        AVG(delivery_fee) as avg_shipping_cost,
        SUM(CASE WHEN delivery_fee = 0 THEN 1 ELSE 0 END) as free_shipping_count,
        ROUND((SUM(CASE WHEN delivery_fee = 0 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as free_shipping_percentage
      FROM orders 
      WHERE user_id = ?
    `, [customerId]);

    // Get customer's address usage and shipping zones
    const addressStats = await executeQuery(`
      SELECT 
        a.id as address_id,
        a.city_title_en,
        a.area_title_en,
        COUNT(o.id) as usage_count,
        AVG(o.delivery_fee) as avg_delivery_fee,
        SUM(CASE WHEN o.delivery_fee = 0 THEN 1 ELSE 0 END) as free_shipping_count
      FROM addresses a
      LEFT JOIN orders o ON a.id = o.address_id
      WHERE a.user_id = ?
      GROUP BY a.id, a.city_title_en, a.area_title_en
      ORDER BY usage_count DESC
    `, [customerId]);

    // Get recent shipping calculations/orders
    const recentShipments = await executeQuery(`
      SELECT 
        o.id,
        o.order_number,
        o.delivery_fee as shipping_cost,
        o.delivery_fee = 0 as free_shipping_applied,
        o.created_at,
        a.city_title_en,
        a.area_title_en,
        sc.calculated_distance_km as distance_km
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      LEFT JOIN shipping_calculations sc ON o.id = sc.order_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
      LIMIT 10
    `, [customerId]);

    // Calculate average distance (from shipping calculations if available)
    const distanceStats = await executeQuery(`
      SELECT 
        AVG(sc.calculated_distance_km) as avg_distance,
        MIN(sc.calculated_distance_km) as min_distance,
        MAX(sc.calculated_distance_km) as max_distance
      FROM shipping_calculations sc
      INNER JOIN orders o ON sc.order_id = o.id
      WHERE o.user_id = ?
    `, [customerId]);

    // Find most used shipping zone (approximated from delivery fees)
    const mostUsedZone = await executeQuery(`
      SELECT 
        CASE 
          WHEN o.delivery_fee = 0 THEN 'Free Shipping Zone'
          WHEN o.delivery_fee <= 3 THEN 'Zone 1 (0-10km)'
          WHEN o.delivery_fee <= 5 THEN 'Zone 2 (10-20km)'
          WHEN o.delivery_fee <= 8 THEN 'Zone 3 (20-30km)'
          ELSE 'Zone 4 (30km+)'
        END as zone_name_en,
        COUNT(*) as usage_count,
        AVG(o.delivery_fee) as base_fee,
        CASE 
          WHEN o.delivery_fee = 0 THEN '0-999'
          WHEN o.delivery_fee <= 3 THEN '0-10'
          WHEN o.delivery_fee <= 5 THEN '10-20'
          WHEN o.delivery_fee <= 8 THEN '20-30'
          ELSE '30-50'
        END as distance_range_start,
        CASE 
          WHEN o.delivery_fee = 0 THEN '999'
          WHEN o.delivery_fee <= 3 THEN '10'
          WHEN o.delivery_fee <= 5 THEN '20'
          WHEN o.delivery_fee <= 8 THEN '30'
          ELSE '50'
        END as distance_range_end
      FROM orders o
      WHERE o.user_id = ?
      GROUP BY zone_name_en, base_fee, distance_range_start, distance_range_end
      ORDER BY usage_count DESC
      LIMIT 1
    `, [customerId]);

    const response = {
      success: true,
      data: {
        customer: customerCheck[0],
        total_orders: orderStats[0]?.total_orders || 0,
        total_shipping_cost: orderStats[0]?.total_shipping_cost || 0,
        avg_shipping_cost: orderStats[0]?.avg_shipping_cost || 0,
        free_shipping_percentage: orderStats[0]?.free_shipping_percentage || 0,
        avg_distance: distanceStats[0]?.avg_distance || null,
        min_distance: distanceStats[0]?.min_distance || null,
        max_distance: distanceStats[0]?.max_distance || null,
        most_used_zone: mostUsedZone[0] || null,
        address_usage: addressStats,
        recent_shipments: recentShipments
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Customer analytics error:', error);
    
    // Enhanced error handling
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        success: false,
        message: 'Database table not found. Please contact administrator.',
        message_ar: 'جدول قاعدة البيانات غير موجود. يرجى الاتصال بالمدير.',
        errors: ['Required database tables are missing']
      });
    }

    if (error.code && error.code.startsWith('ER_')) {
      return res.status(500).json({
        success: false,
        message: 'Database error occurred while fetching customer analytics',
        message_ar: 'حدث خطأ في قاعدة البيانات أثناء جلب تحليلات العميل',
        errors: ['Database operation failed']
      });
    }

    next(error);
  }
});

module.exports = router;
