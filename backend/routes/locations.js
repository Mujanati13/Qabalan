const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const { validateId, validateLocationData } = require('../middleware/validation');

const router = express.Router();

// Validation middleware for location data
const validateCityData = (req, res, next) => {
  const { title_ar, title_en } = req.body;
  const errors = [];

  if (!title_ar || title_ar.trim().length < 2) {
    errors.push('Arabic title is required and must be at least 2 characters');
  }
  
  if (!title_en || title_en.trim().length < 2) {
    errors.push('English title is required and must be at least 2 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

const validateAreaData = (req, res, next) => {
  const { title_ar, title_en, city_id, delivery_fee } = req.body;
  const errors = [];

  if (!title_ar || title_ar.trim().length < 2) {
    errors.push('Arabic title is required and must be at least 2 characters');
  }
  
  if (!title_en || title_en.trim().length < 2) {
    errors.push('English title is required and must be at least 2 characters');
  }

  if (!city_id || !Number.isInteger(Number(city_id))) {
    errors.push('Valid city ID is required');
  }

  if (delivery_fee !== undefined && (isNaN(delivery_fee) || Number(delivery_fee) < 0)) {
    errors.push('Delivery fee must be a valid non-negative number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

const validateStreetData = (req, res, next) => {
  const { title_ar, title_en, area_id } = req.body;
  const errors = [];

  if (!title_ar || title_ar.trim().length < 2) {
    errors.push('Arabic title is required and must be at least 2 characters');
  }
  
  if (!title_en || title_en.trim().length < 2) {
    errors.push('English title is required and must be at least 2 characters');
  }

  if (!area_id || !Number.isInteger(Number(area_id))) {
    errors.push('Valid area ID is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// ===== CITIES ROUTES =====

/**
 * @route   GET /api/locations/cities
 * @desc    Get all cities with pagination and search
 * @access  Private (Admin)
 */
router.get('/cities', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, is_active } = req.query;
    
    // Build WHERE conditions
    const conditions = [];
    const params = [];

    // Search filter
    if (search && search.trim && search.trim()) {
      conditions.push('(c.title_ar LIKE ? OR c.title_en LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    // Active status filter
    if (is_active && is_active !== 'all') {
      conditions.push('c.is_active = ?');
      params.push(is_active === 'true' ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count for pagination
    const totalQuery = `SELECT COUNT(*) as total FROM cities c ${whereClause}`;
    const [{ total }] = await executeQuery(totalQuery, params);

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Get cities with pagination
    const cities = await executeQuery(`
      SELECT 
        c.id,
        c.title_ar,
        c.title_en,
        c.is_active,
        c.created_at,
        c.updated_at,
        (SELECT COUNT(*) FROM areas WHERE city_id = c.id AND is_active = 1) as areas_count
      FROM cities c
      ${whereClause}
      ORDER BY c.title_en ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      data: cities,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total: total,
        pages: totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/locations/cities/:id
 * @desc    Get city by ID
 * @access  Private (Admin)
 */
router.get('/cities/:id', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const [city] = await executeQuery(`
      SELECT 
        c.id,
        c.title_ar,
        c.title_en,
        c.is_active,
        c.created_at,
        c.updated_at,
        COUNT(a.id) as areas_count
      FROM cities c
      LEFT JOIN areas a ON c.id = a.city_id AND a.is_active = 1
      WHERE c.id = ?
      GROUP BY c.id
    `, [req.params.id]);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    res.json({
      success: true,
      data: city
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/locations/cities
 * @desc    Create new city
 * @access  Private (Admin)
 */
router.post('/cities', authenticate, authorize('admin'), validateCityData, async (req, res, next) => {
  try {
    const { title_ar, title_en, is_active = true } = req.body;

    // Check for duplicate titles
    const existing = await executeQuery(
      'SELECT id FROM cities WHERE title_ar = ? OR title_en = ?',
      [title_ar.trim(), title_en.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'City with this title already exists'
      });
    }

    const result = await executeQuery(
      'INSERT INTO cities (title_ar, title_en, is_active) VALUES (?, ?, ?)',
      [title_ar.trim(), title_en.trim(), is_active]
    );

    const [newCity] = await executeQuery(
      'SELECT * FROM cities WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'City created successfully',
      data: newCity
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/locations/cities/:id
 * @desc    Update city
 * @access  Private (Admin)
 */
router.put('/cities/:id', authenticate, authorize('admin'), validateId, validateCityData, async (req, res, next) => {
  try {
    const { title_ar, title_en, is_active } = req.body;
    const cityId = req.params.id;

    // Check if city exists
    const [existingCity] = await executeQuery('SELECT * FROM cities WHERE id = ?', [cityId]);
    if (!existingCity) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    // Check for duplicate titles (excluding current city)
    const duplicates = await executeQuery(
      'SELECT id FROM cities WHERE (title_ar = ? OR title_en = ?) AND id != ?',
      [title_ar.trim(), title_en.trim(), cityId]
    );

    if (duplicates.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'City with this title already exists'
      });
    }

    await executeQuery(
      'UPDATE cities SET title_ar = ?, title_en = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [title_ar.trim(), title_en.trim(), is_active, cityId]
    );

    const [updatedCity] = await executeQuery('SELECT * FROM cities WHERE id = ?', [cityId]);

    res.json({
      success: true,
      message: 'City updated successfully',
      data: updatedCity
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/locations/cities/:id
 * @desc    Delete city (soft delete)
 * @access  Private (Admin)
 */
router.delete('/cities/:id', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const cityId = req.params.id;

    // Check if city exists
    const [city] = await executeQuery('SELECT * FROM cities WHERE id = ?', [cityId]);
    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    // Check if city has areas
    const [areaCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM areas WHERE city_id = ?',
      [cityId]
    );

    if (areaCount.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete city that has areas. Please delete or reassign areas first.'
      });
    }

    // Soft delete
    await executeQuery(
      'UPDATE cities SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [cityId]
    );

    res.json({
      success: true,
      message: 'City deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ===== AREAS ROUTES =====

/**
 * @route   GET /api/locations/areas
 * @desc    Get all areas with pagination and search
 * @access  Private (Admin)
 */
router.get('/areas', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, is_active, city_id } = req.query;
    
    // Build WHERE conditions
    const conditions = [];
    const params = [];

    // Search filter
    if (search && search.trim && search.trim()) {
      conditions.push('(a.title_ar LIKE ? OR a.title_en LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    // Active status filter
    if (is_active && is_active !== 'all') {
      conditions.push('a.is_active = ?');
      params.push(is_active === 'true' ? 1 : 0);
    }

    // City filter
    if (city_id && city_id !== 'all') {
      conditions.push('a.city_id = ?');
      params.push(parseInt(city_id));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count for pagination
    const totalQuery = `
      SELECT COUNT(*) as total 
      FROM areas a
      LEFT JOIN cities c ON a.city_id = c.id
      ${whereClause}
    `;
    const [{ total }] = await executeQuery(totalQuery, params);

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Get areas with pagination
    const areas = await executeQuery(`
      SELECT 
        a.id,
        a.title_ar,
        a.title_en,
        a.delivery_fee,
        a.is_active,
        a.created_at,
        a.updated_at,
        a.city_id,
        c.title_ar as city_title_ar,
        c.title_en as city_title_en,
        (SELECT COUNT(*) FROM streets WHERE area_id = a.id AND is_active = 1) as streets_count
      FROM areas a
      LEFT JOIN cities c ON a.city_id = c.id
      ${whereClause}
      ORDER BY c.title_en ASC, a.title_en ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: areas,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total: total,
        pages: totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/locations/areas/:id
 * @desc    Get area by ID
 * @access  Private (Admin)
 */
router.get('/areas/:id', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const [area] = await executeQuery(`
      SELECT 
        a.id,
        a.title_ar,
        a.title_en,
        a.delivery_fee,
        a.is_active,
        a.created_at,
        a.updated_at,
        a.city_id,
        c.title_ar as city_title_ar,
        c.title_en as city_title_en,
        COUNT(s.id) as streets_count
      FROM areas a
      LEFT JOIN cities c ON a.city_id = c.id
      LEFT JOIN streets s ON a.id = s.area_id AND s.is_active = 1
      WHERE a.id = ?
      GROUP BY a.id
    `, [req.params.id]);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    res.json({
      success: true,
      data: area
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/locations/areas
 * @desc    Create new area
 * @access  Private (Admin)
 */
router.post('/areas', authenticate, authorize('admin'), validateAreaData, async (req, res, next) => {
  try {
    const { title_ar, title_en, city_id, delivery_fee = 0, is_active = true } = req.body;

    // Check if city exists
    const [city] = await executeQuery('SELECT id FROM cities WHERE id = ? AND is_active = 1', [city_id]);
    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive city'
      });
    }

    // Check for duplicate titles within the same city
    const existing = await executeQuery(
      'SELECT id FROM areas WHERE (title_ar = ? OR title_en = ?) AND city_id = ?',
      [title_ar.trim(), title_en.trim(), city_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Area with this title already exists in this city'
      });
    }

    const result = await executeQuery(
      'INSERT INTO areas (title_ar, title_en, city_id, delivery_fee, is_active) VALUES (?, ?, ?, ?, ?)',
      [title_ar.trim(), title_en.trim(), city_id, delivery_fee, is_active]
    );

    const [newArea] = await executeQuery(`
      SELECT 
        a.*,
        c.title_ar as city_title_ar,
        c.title_en as city_title_en
      FROM areas a
      LEFT JOIN cities c ON a.city_id = c.id
      WHERE a.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Area created successfully',
      data: newArea
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/locations/areas/:id
 * @desc    Update area
 * @access  Private (Admin)
 */
router.put('/areas/:id', authenticate, authorize('admin'), validateId, validateAreaData, async (req, res, next) => {
  try {
    const { title_ar, title_en, city_id, delivery_fee, is_active } = req.body;
    const areaId = req.params.id;

    // Check if area exists
    const [existingArea] = await executeQuery('SELECT * FROM areas WHERE id = ?', [areaId]);
    if (!existingArea) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    // Check if city exists
    const [city] = await executeQuery('SELECT id FROM cities WHERE id = ? AND is_active = 1', [city_id]);
    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive city'
      });
    }

    // Check for duplicate titles within the same city (excluding current area)
    const duplicates = await executeQuery(
      'SELECT id FROM areas WHERE (title_ar = ? OR title_en = ?) AND city_id = ? AND id != ?',
      [title_ar.trim(), title_en.trim(), city_id, areaId]
    );

    if (duplicates.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Area with this title already exists in this city'
      });
    }

    await executeQuery(
      'UPDATE areas SET title_ar = ?, title_en = ?, city_id = ?, delivery_fee = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [title_ar.trim(), title_en.trim(), city_id, delivery_fee, is_active, areaId]
    );

    const [updatedArea] = await executeQuery(`
      SELECT 
        a.*,
        c.title_ar as city_title_ar,
        c.title_en as city_title_en
      FROM areas a
      LEFT JOIN cities c ON a.city_id = c.id
      WHERE a.id = ?
    `, [areaId]);

    res.json({
      success: true,
      message: 'Area updated successfully',
      data: updatedArea
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/locations/areas/:id
 * @desc    Delete area (soft delete)
 * @access  Private (Admin)
 */
router.delete('/areas/:id', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const areaId = req.params.id;

    // Check if area exists
    const [area] = await executeQuery('SELECT * FROM areas WHERE id = ?', [areaId]);
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found'
      });
    }

    // Check if area has streets
    const [streetCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM streets WHERE area_id = ?',
      [areaId]
    );

    if (streetCount.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete area that has streets. Please delete or reassign streets first.'
      });
    }

    // Check if area has addresses
    const [addressCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM user_addresses WHERE area_id = ?',
      [areaId]
    );

    if (addressCount.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete area that has associated addresses.'
      });
    }

    // Soft delete
    await executeQuery(
      'UPDATE areas SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [areaId]
    );

    res.json({
      success: true,
      message: 'Area deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ===== STREETS ROUTES =====

/**
 * @route   GET /api/locations/streets
 * @desc    Get all streets with pagination and search
 * @access  Private (Admin)
 */
router.get('/streets', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, is_active, city_id, area_id } = req.query;
    
    // Build WHERE conditions
    const conditions = [];
    const params = [];

    // Search filter
    if (search && search.trim && search.trim()) {
      conditions.push('(s.title_ar LIKE ? OR s.title_en LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    // Active status filter
    if (is_active && is_active !== 'all') {
      conditions.push('s.is_active = ?');
      params.push(is_active === 'true' ? 1 : 0);
    }

    // City filter
    if (city_id && city_id !== 'all') {
      conditions.push('a.city_id = ?');
      params.push(parseInt(city_id));
    }

    // Area filter
    if (area_id && area_id !== 'all') {
      conditions.push('s.area_id = ?');
      params.push(parseInt(area_id));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count for pagination
    const totalQuery = `
      SELECT COUNT(*) as total 
      FROM streets s
      LEFT JOIN areas a ON s.area_id = a.id
      LEFT JOIN cities c ON a.city_id = c.id
      ${whereClause}
    `;
    const [{ total }] = await executeQuery(totalQuery, params);

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Get streets with pagination
    const streets = await executeQuery(`
      SELECT 
        s.id,
        s.title_ar,
        s.title_en,
        s.is_active,
        s.created_at,
        s.updated_at,
        s.area_id,
        a.title_ar as area_title_ar,
        a.title_en as area_title_en,
        a.city_id,
        c.title_ar as city_title_ar,
        c.title_en as city_title_en
      FROM streets s
      LEFT JOIN areas a ON s.area_id = a.id
      LEFT JOIN cities c ON a.city_id = c.id
      ${whereClause}
      ORDER BY c.title_en ASC, a.title_en ASC, s.title_en ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: streets,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total: total,
        pages: totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/locations/streets
 * @desc    Create new street
 * @access  Private (Admin)
 */
router.post('/streets', authenticate, authorize('admin'), validateStreetData, async (req, res, next) => {
  try {
    const { title_ar, title_en, area_id, is_active = true } = req.body;

    // Check if area exists
    const [area] = await executeQuery('SELECT id FROM areas WHERE id = ? AND is_active = 1', [area_id]);
    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive area'
      });
    }

    // Check for duplicate titles within the same area
    const existing = await executeQuery(
      'SELECT id FROM streets WHERE (title_ar = ? OR title_en = ?) AND area_id = ?',
      [title_ar.trim(), title_en.trim(), area_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Street with this title already exists in this area'
      });
    }

    const result = await executeQuery(
      'INSERT INTO streets (title_ar, title_en, area_id, is_active) VALUES (?, ?, ?, ?)',
      [title_ar.trim(), title_en.trim(), area_id, is_active]
    );

    const [newStreet] = await executeQuery(`
      SELECT 
        s.*,
        a.title_ar as area_title_ar,
        a.title_en as area_title_en,
        a.city_id,
        c.title_ar as city_title_ar,
        c.title_en as city_title_en
      FROM streets s
      LEFT JOIN areas a ON s.area_id = a.id
      LEFT JOIN cities c ON a.city_id = c.id
      WHERE s.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Street created successfully',
      data: newStreet
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/locations/streets/:id
 * @desc    Update street
 * @access  Private (Admin)
 */
router.put('/streets/:id', authenticate, authorize('admin'), validateId, validateStreetData, async (req, res, next) => {
  try {
    const { title_ar, title_en, area_id, is_active } = req.body;
    const streetId = req.params.id;

    // Check if street exists
    const [existingStreet] = await executeQuery('SELECT * FROM streets WHERE id = ?', [streetId]);
    if (!existingStreet) {
      return res.status(404).json({
        success: false,
        message: 'Street not found'
      });
    }

    // Check if area exists
    const [area] = await executeQuery('SELECT id FROM areas WHERE id = ? AND is_active = 1', [area_id]);
    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive area'
      });
    }

    // Check for duplicate titles within the same area (excluding current street)
    const duplicates = await executeQuery(
      'SELECT id FROM streets WHERE (title_ar = ? OR title_en = ?) AND area_id = ? AND id != ?',
      [title_ar.trim(), title_en.trim(), area_id, streetId]
    );

    if (duplicates.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Street with this title already exists in this area'
      });
    }

    await executeQuery(
      'UPDATE streets SET title_ar = ?, title_en = ?, area_id = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [title_ar.trim(), title_en.trim(), area_id, is_active, streetId]
    );

    const [updatedStreet] = await executeQuery(`
      SELECT 
        s.*,
        a.title_ar as area_title_ar,
        a.title_en as area_title_en,
        a.city_id,
        c.title_ar as city_title_ar,
        c.title_en as city_title_en
      FROM streets s
      LEFT JOIN areas a ON s.area_id = a.id
      LEFT JOIN cities c ON a.city_id = c.id
      WHERE s.id = ?
    `, [streetId]);

    res.json({
      success: true,
      message: 'Street updated successfully',
      data: updatedStreet
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/locations/streets/:id
 * @desc    Delete street (soft delete)
 * @access  Private (Admin)
 */
router.delete('/streets/:id', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const streetId = req.params.id;

    // Check if street exists
    const [street] = await executeQuery('SELECT * FROM streets WHERE id = ?', [streetId]);
    if (!street) {
      return res.status(404).json({
        success: false,
        message: 'Street not found'
      });
    }

    // Check if street has addresses
    const [addressCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM user_addresses WHERE street_id = ?',
      [streetId]
    );

    if (addressCount.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete street that has associated addresses.'
      });
    }

    // Soft delete
    await executeQuery(
      'UPDATE streets SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [streetId]
    );

    res.json({
      success: true,
      message: 'Street deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
