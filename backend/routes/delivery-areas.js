const express = require('express');
const { executeQuery, getPaginatedResults } = require('../config/database');
const { validatePagination } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/delivery-areas
 * @desc    Get all delivery areas with optional filters
 * @access  Public
 */
router.get('/', validatePagination, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      active_only = false 
    } = req.query;

    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100);

    let whereConditions = [];
    let queryParams = [];

    // Active filter
    if (active_only === 'true') {
      whereConditions.push('is_active = 1');
    }

    // Search filter
    if (search) {
      whereConditions.push('(name_ar LIKE ? OR name_en LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        id, name_ar, name_en, delivery_fee, is_active, created_at, updated_at
      FROM delivery_areas
      ${whereClause}
      ORDER BY name_en ASC
    `;

    // Get paginated results
    const result = await getPaginatedResults(
      query,
      queryParams,
      validatedPage,
      validatedLimit
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error fetching delivery areas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery areas',
      message_ar: 'فشل في جلب مناطق التوصيل'
    });
  }
});

/**
 * @route   GET /api/delivery-areas/:id
 * @desc    Get single delivery area by ID
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [area] = await executeQuery(
      'SELECT id, name_ar, name_en, delivery_fee, is_active, created_at, updated_at FROM delivery_areas WHERE id = ?',
      [id]
    );

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Delivery area not found',
        message_ar: 'منطقة التوصيل غير موجودة'
      });
    }

    res.json({
      success: true,
      data: area
    });

  } catch (error) {
    console.error('Error fetching delivery area:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery area',
      message_ar: 'فشل في جلب منطقة التوصيل'
    });
  }
});

module.exports = router;
