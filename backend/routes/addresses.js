const express = require('express');
const { executeQuery, executeTransaction, getPaginatedResults } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

const router = express.Router();

/**
 * Validate city ID parameter
 */
const validateCityId = (req, res, next) => {
  const cityId = parseInt(req.params.city_id);
  if (!cityId || cityId < 1) {
    return res.status(400).json({
      success: false,
      message: 'Valid city ID is required',
      message_ar: 'معرف المدينة مطلوب وصحيح'
    });
  }
  next();
};

/**
 * Validate area ID parameter
 */
const validateAreaId = (req, res, next) => {
  const areaId = parseInt(req.params.area_id);
  if (!areaId || areaId < 1) {
    return res.status(400).json({
      success: false,
      message: 'Valid area ID is required',
      message_ar: 'معرف المنطقة مطلوب وصحيح'
    });
  }
  next();
};

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Validate address data
 */
const validateAddressData = (req, res, next) => {
  const { 
    name, 
    city_id, 
    area_id, 
    street_id, 
    building_no,
    floor_no,
    apartment_no,
    details,
    latitude,
    longitude,
    is_default
  } = req.body;

  const errors = [];

  // Required fields for creation
  if (req.method === 'POST') {
    if (!name || name.trim().length < 2) {
      errors.push('Address name must be at least 2 characters');
    }
    
    // More flexible validation - allow any combination of location data
    // We only require at least some form of location identification
    const hasAnyLocationData = city_id || area_id || street_id || latitude || longitude || details;
    
    if (!hasAnyLocationData) {
      errors.push('At least one form of location data is required (city/area/street, coordinates, or address details)');
    }
    
    // If location IDs are provided, validate them individually
    if (city_id !== undefined && city_id !== null && !Number.isInteger(Number(city_id))) {
      errors.push('Valid city ID is required when city is specified');
    }
    if (area_id !== undefined && area_id !== null && !Number.isInteger(Number(area_id))) {
      errors.push('Valid area ID is required when area is specified');
    }
    if (street_id !== undefined && street_id !== null && !Number.isInteger(Number(street_id))) {
      errors.push('Valid street ID is required when street is specified');
    }
  }

  // Optional validations for update
  if (name !== undefined && name.trim().length < 2) {
    errors.push('Address name must be at least 2 characters');
  }
  if (city_id !== undefined && !Number.isInteger(Number(city_id))) {
    errors.push('Valid city ID is required');
  }
  if (area_id !== undefined && !Number.isInteger(Number(area_id))) {
    errors.push('Valid area ID is required');
  }
  if (street_id !== undefined && !Number.isInteger(Number(street_id))) {
    errors.push('Valid street ID is required');
  }
  if (latitude !== undefined && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
    errors.push('Latitude must be a valid number between -90 and 90');
  }
  if (longitude !== undefined && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
    errors.push('Longitude must be a valid number between -180 and 180');
  }
  if (is_default !== undefined && typeof is_default !== 'boolean') {
    errors.push('is_default must be boolean');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      message_ar: 'فشل في التحقق من البيانات',
      errors
    });
  }

  next();
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate location hierarchy (city -> area -> street)
 * Only validates the hierarchy if all required levels are provided
 */
const validateLocationHierarchy = async (cityId, areaId, streetId) => {
  // If city is provided, validate it
  if (cityId) {
    const [city] = await executeQuery('SELECT id FROM cities WHERE id = ? AND is_active = 1', [cityId]);
    if (!city) {
      throw new Error('Invalid or inactive city');
    }
  }

  // If area is provided, validate it (and its relationship to city if city is also provided)
  if (areaId) {
    let areaQuery = 'SELECT id FROM areas WHERE id = ? AND is_active = 1';
    let areaParams = [areaId];
    
    if (cityId) {
      areaQuery = 'SELECT id FROM areas WHERE id = ? AND city_id = ? AND is_active = 1';
      areaParams = [areaId, cityId];
    }
    
    const [area] = await executeQuery(areaQuery, areaParams);
    if (!area) {
      const errorMsg = cityId ? 
        'Invalid area or area does not belong to the specified city' : 
        'Invalid or inactive area';
      throw new Error(errorMsg);
    }
  }

  // If street is provided, validate it (and its relationship to area if area is also provided)
  if (streetId) {
    let streetQuery = 'SELECT id FROM streets WHERE id = ? AND is_active = 1';
    let streetParams = [streetId];
    
    if (areaId) {
      streetQuery = 'SELECT id FROM streets WHERE id = ? AND area_id = ? AND is_active = 1';
      streetParams = [streetId, areaId];
    }
    
    const [street] = await executeQuery(streetQuery, streetParams);
    if (!street) {
      const errorMsg = areaId ? 
        'Invalid street or street does not belong to the specified area' : 
        'Invalid or inactive street';
      throw new Error(errorMsg);
    }
  }

  return true;
};

/**
 * Handle default address logic
 */
const handleDefaultAddress = async (userId, addressId, isDefault) => {
  if (isDefault) {
    // Remove default flag from all other addresses for this user
    await executeQuery(
      'UPDATE user_addresses SET is_default = 0 WHERE user_id = ? AND id != ?',
      [userId, addressId]
    );
  }
};

// =============================================================================
// ROUTES
// =============================================================================

/**
 * @route   GET /api/addresses
 * @desc    Get user addresses or all addresses (Admin/Staff)
 * @access  Private
 */
router.get('/', authenticate, validatePagination, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      user_id,
      city_id,
      area_id,
      is_active,
      search
    } = req.query;

    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100);

    let whereConditions = [];
    let queryParams = [];

    // Role-based filtering
    if (req.user.user_type === 'customer') {
      whereConditions.push('ua.user_id = ?');
      queryParams.push(req.user.id);
    } else if (user_id && ['admin', 'staff'].includes(req.user.user_type)) {
      whereConditions.push('ua.user_id = ?');
      queryParams.push(user_id);
    }

    // Location filters
    if (city_id) {
      whereConditions.push('ua.city_id = ?');
      queryParams.push(city_id);
    }
    if (area_id) {
      whereConditions.push('ua.area_id = ?');
      queryParams.push(area_id);
    }

    // Active status filter
    if (is_active !== undefined) {
      whereConditions.push('ua.is_active = ?');
      queryParams.push(is_active === 'true' ? 1 : 0);
    }

    // Search filter
    if (search) {
      whereConditions.push('(ua.name LIKE ? OR ua.building_no LIKE ? OR ua.details LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        ua.id, ua.user_id, ua.name, ua.building_no, ua.floor_no, ua.apartment_no, 
        ua.details, ua.latitude, ua.longitude, ua.is_default, ua.is_active, ua.created_at,
        u.first_name, u.last_name, u.email,
        c.id as city_id, c.title_ar as city_title_ar, c.title_en as city_title_en,
        a.id as area_id, a.title_ar as area_title_ar, a.title_en as area_title_en, a.delivery_fee,
        s.id as street_id, s.title_ar as street_title_ar, s.title_en as street_title_en
      FROM user_addresses ua
      LEFT JOIN users u ON ua.user_id = u.id
      LEFT JOIN cities c ON ua.city_id = c.id
      LEFT JOIN areas a ON ua.area_id = a.id
      LEFT JOIN streets s ON ua.street_id = s.id
      ${whereClause}
      ORDER BY ua.is_default DESC, ua.created_at DESC
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
 * @route   GET /api/addresses/:id
 * @desc    Get single address by ID
 * @access  Private
 */
router.get('/:id', authenticate, validateId, async (req, res, next) => {
  try {
    const [address] = await executeQuery(`
      SELECT 
        ua.*, 
        u.first_name, u.last_name, u.email,
        c.title_ar as city_title_ar, c.title_en as city_title_en,
        a.title_ar as area_title_ar, a.title_en as area_title_en, a.delivery_fee,
        s.title_ar as street_title_ar, s.title_en as street_title_en
      FROM user_addresses ua
      LEFT JOIN users u ON ua.user_id = u.id
      LEFT JOIN cities c ON ua.city_id = c.id
      LEFT JOIN areas a ON ua.area_id = a.id
      LEFT JOIN streets s ON ua.street_id = s.id
      WHERE ua.id = ?
    `, [req.params.id]);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        message_ar: 'العنوان غير موجود'
      });
    }

    // Check permissions
    if (req.user.user_type === 'customer' && address.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    res.json({
      success: true,
      data: address
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/addresses
 * @desc    Create new address
 * @access  Private
 */
router.post('/', authenticate, validateAddressData, async (req, res, next) => {
  try {
    const {
      user_id,
      name,
      city_id,
      area_id,
      street_id,
      building_no,
      floor_no,
      apartment_no,
      details,
      latitude,
      longitude,
      is_default = false
    } = req.body;

    // Determine target user ID
    const targetUserId = req.user.user_type === 'customer' ? req.user.id : (user_id || req.user.id);

    // Check permissions
    if (req.user.user_type === 'customer' && user_id && user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot create address for another user',
        message_ar: 'لا يمكن إنشاء عنوان لمستخدم آخر'
      });
    }

    // Validate location hierarchy if any location IDs are provided
    if (city_id || area_id || street_id) {
      await validateLocationHierarchy(city_id, area_id, street_id);
    }

    // Create address
    const result = await executeQuery(`
      INSERT INTO user_addresses (
        user_id, name, city_id, area_id, street_id, building_no, floor_no, 
        apartment_no, details, latitude, longitude, is_default, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `, [
      targetUserId,
      name.trim(),
      city_id || null,
      area_id || null,
      street_id || null,
      building_no || null,
      floor_no || null,
      apartment_no || null,
      details || null,
      latitude || null,
      longitude || null,
      is_default ? 1 : 0
    ]);

    // Handle default address logic
    if (is_default) {
      await handleDefaultAddress(targetUserId, result.insertId, true);
    }

    // Get the created address with full details
    const addressResults = await executeQuery(`
      SELECT 
        ua.*, 
        c.title_ar as city_title_ar, c.title_en as city_title_en,
        a.title_ar as area_title_ar, a.title_en as area_title_en, a.delivery_fee,
        s.title_ar as street_title_ar, s.title_en as street_title_en
      FROM user_addresses ua
      LEFT JOIN cities c ON ua.city_id = c.id
      LEFT JOIN areas a ON ua.area_id = a.id
      LEFT JOIN streets s ON ua.street_id = s.id
      WHERE ua.id = ?
    `, [result.insertId]);

    const newAddress = addressResults[0];

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      message_ar: 'تم إنشاء العنوان بنجاح',
      data: newAddress
    });

  } catch (error) {
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        message_ar: 'بيانات الموقع غير صحيحة'
      });
    }
    next(error);
  }
});

/**
 * @route   PUT /api/addresses/:id
 * @desc    Update address
 * @access  Private
 */
router.put('/:id', authenticate, validateId, validateAddressData, async (req, res, next) => {
  try {
    const addressId = req.params.id;
    const {
      name,
      city_id,
      area_id,
      street_id,
      building_no,
      floor_no,
      apartment_no,
      details,
      latitude,
      longitude,
      is_default,
      is_active
    } = req.body;

    // Get current address
    const [currentAddress] = await executeQuery('SELECT * FROM user_addresses WHERE id = ?', [addressId]);
    if (!currentAddress) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        message_ar: 'العنوان غير موجود'
      });
    }

    // Check permissions
    const canEdit = (
      req.user.user_type === 'customer' && currentAddress.user_id === req.user.id
    ) || ['admin', 'staff'].includes(req.user.user_type);

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    // Validate location hierarchy if location fields are provided
    const finalCityId = city_id || currentAddress.city_id;
    const finalAreaId = area_id || currentAddress.area_id;
    const finalStreetId = street_id || currentAddress.street_id;

    if (city_id || area_id || street_id) {
      await validateLocationHierarchy(finalCityId, finalAreaId, finalStreetId);
    }

    // Prepare update data
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name.trim());
    }
    if (city_id !== undefined) {
      updateFields.push('city_id = ?');
      updateValues.push(city_id);
    }
    if (area_id !== undefined) {
      updateFields.push('area_id = ?');
      updateValues.push(area_id);
    }
    if (street_id !== undefined) {
      updateFields.push('street_id = ?');
      updateValues.push(street_id);
    }
    if (building_no !== undefined) {
      updateFields.push('building_no = ?');
      updateValues.push(building_no || null);
    }
    if (floor_no !== undefined) {
      updateFields.push('floor_no = ?');
      updateValues.push(floor_no || null);
    }
    if (apartment_no !== undefined) {
      updateFields.push('apartment_no = ?');
      updateValues.push(apartment_no || null);
    }
    if (details !== undefined) {
      updateFields.push('details = ?');
      updateValues.push(details || null);
    }
    if (latitude !== undefined) {
      updateFields.push('latitude = ?');
      updateValues.push(latitude || null);
    }
    if (longitude !== undefined) {
      updateFields.push('longitude = ?');
      updateValues.push(longitude || null);
    }
    if (is_default !== undefined) {
      updateFields.push('is_default = ?');
      updateValues.push(is_default ? 1 : 0);
    }
    if (is_active !== undefined && ['admin', 'staff'].includes(req.user.user_type)) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
        message_ar: 'لا توجد حقول للتحديث'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(addressId);

    // Update address
    await executeQuery(`
      UPDATE user_addresses SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);

    // Handle default address logic
    if (is_default !== undefined) {
      await handleDefaultAddress(currentAddress.user_id, addressId, is_default);
    }

    // Get updated address
    const [updatedAddress] = await executeQuery(`
      SELECT 
        ua.*, 
        c.title_ar as city_title_ar, c.title_en as city_title_en,
        a.title_ar as area_title_ar, a.title_en as area_title_en, a.delivery_fee,
        s.title_ar as street_title_ar, s.title_en as street_title_en
      FROM user_addresses ua
      LEFT JOIN cities c ON ua.city_id = c.id
      LEFT JOIN areas a ON ua.area_id = a.id
      LEFT JOIN streets s ON ua.street_id = s.id
      WHERE ua.id = ?
    `, [addressId]);

    res.json({
      success: true,
      message: 'Address updated successfully',
      message_ar: 'تم تحديث العنوان بنجاح',
      data: updatedAddress
    });

  } catch (error) {
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        message_ar: 'بيانات الموقع غير صحيحة'
      });
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/addresses/:id
 * @desc    Delete address
 * @access  Private
 */
router.delete('/:id', authenticate, validateId, async (req, res, next) => {
  try {
    const addressId = req.params.id;
    const { hard_delete = false } = req.query;

    // Get current address
    const [currentAddress] = await executeQuery('SELECT * FROM user_addresses WHERE id = ?', [addressId]);
    if (!currentAddress) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        message_ar: 'العنوان غير موجود'
      });
    }

    // Check permissions
    const canDelete = (
      req.user.user_type === 'customer' && currentAddress.user_id === req.user.id
    ) || ['admin', 'staff'].includes(req.user.user_type);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    // Check if address is used in orders
    const [orderCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM orders WHERE delivery_address_id = ?',
      [addressId]
    );

    if (orderCount.count > 0 && hard_delete === 'true') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete address that is used in orders',
        message_ar: 'لا يمكن حذف عنوان مستخدم في طلبات'
      });
    }

    if (hard_delete === 'true' && req.user.user_type === 'admin') {
      // Hard delete
      await executeQuery('DELETE FROM user_addresses WHERE id = ?', [addressId]);
      
      res.json({
        success: true,
        message: 'Address deleted successfully',
        message_ar: 'تم حذف العنوان بنجاح'
      });
    } else {
      // Soft delete - deactivate
      await executeQuery('UPDATE user_addresses SET is_active = 0, updated_at = NOW() WHERE id = ?', [addressId]);
      
      res.json({
        success: true,
        message: 'Address deactivated successfully',
        message_ar: 'تم إلغاء تفعيل العنوان بنجاح'
      });
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/addresses/:id/set-default
 * @desc    Set address as default
 * @access  Private
 */
router.post('/:id/set-default', authenticate, validateId, async (req, res, next) => {
  try {
    const addressId = req.params.id;

    // Get address
    const [address] = await executeQuery('SELECT * FROM user_addresses WHERE id = ? AND is_active = 1', [addressId]);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        message_ar: 'العنوان غير موجود'
      });
    }

    // Check permissions
    if (req.user.user_type === 'customer' && address.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        message_ar: 'ممنوع الوصول'
      });
    }

    // Set as default
    await handleDefaultAddress(address.user_id, addressId, true);
    await executeQuery('UPDATE user_addresses SET is_default = 1, updated_at = NOW() WHERE id = ?', [addressId]);

    res.json({
      success: true,
      message: 'Address set as default successfully',
      message_ar: 'تم تعيين العنوان كافتراضي بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/addresses/locations/cities
 * @desc    Get all active cities
 * @access  Public
 */
router.get('/locations/cities', async (req, res, next) => {
  try {
    const cities = await executeQuery(`
      SELECT id, title_ar, title_en, country_code
      FROM cities 
      WHERE is_active = 1
      ORDER BY title_en ASC
    `);

    res.json({
      success: true,
      data: cities
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/addresses/locations/areas/:city_id
 * @desc    Get areas for specific city
 * @access  Public
 */
router.get('/locations/areas/:city_id', validateCityId, async (req, res, next) => {
  try {
    const areas = await executeQuery(`
      SELECT id, title_ar, title_en, delivery_fee
      FROM areas 
      WHERE city_id = ? AND is_active = 1
      ORDER BY title_en ASC
    `, [req.params.city_id]);

    res.json({
      success: true,
      data: areas
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/addresses/locations/streets/:area_id
 * @desc    Get streets for specific area
 * @access  Public
 */
router.get('/locations/streets/:area_id', validateAreaId, async (req, res, next) => {
  try {
    const streets = await executeQuery(`
      SELECT id, title_ar, title_en
      FROM streets 
      WHERE area_id = ? AND is_active = 1
      ORDER BY title_en ASC
    `, [req.params.area_id]);

    res.json({
      success: true,
      data: streets
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
