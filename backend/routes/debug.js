const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { executeQuery } = require('../config/database');

/**
 * @route   GET /api/debug/user
 * @desc    Get current user info for debugging
 * @access  Private
 */
router.get('/user', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * @route   GET /api/debug/tables
 * @desc    Check database table structure
 * @access  Private
 */
router.get('/tables', authenticate, async (req, res) => {
  try {
    // Check if promo_codes table exists
    const tables = await executeQuery("SHOW TABLES LIKE 'promo_codes'");
    
    if (tables.length === 0) {
      return res.json({
        success: false,
        message: 'promo_codes table does not exist',
        tables: []
      });
    }

    // Get table structure
    const structure = await executeQuery("DESCRIBE promo_codes");
    
    res.json({
      success: true,
      tableExists: true,
      structure
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking database structure',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/debug/all-tables
 * @desc    Check all database tables
 * @access  Private
 */
router.get('/all-tables', authenticate, async (req, res) => {
  try {
    // Get all tables
    const tables = await executeQuery("SHOW TABLES");
    
    res.json({
      success: true,
      tables: tables.map(t => Object.values(t)[0])
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking database tables',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/debug/test-query
 * @desc    Test a simple promo query
 * @access  Private
 */
router.get('/test-query', authenticate, async (req, res) => {
  try {
    // Test simple query first
    const result = await executeQuery("SELECT 1 as test");
    
    // Test if promo_codes table exists and has data
    const promoTest = await executeQuery("SELECT COUNT(*) as count FROM promo_codes");
    
    res.json({
      success: true,
      basicQuery: result,
      promoCodesCount: promoTest[0].count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing queries',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/debug/promo-query
 * @desc    Test promo query with debug info
 * @access  Private
 */
router.get('/promo-query', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
      type = 'all',
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];

    // Search filter
    if (search) {
      whereConditions.push('(pc.code LIKE ? OR pc.title_ar LIKE ? OR pc.title_en LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Status filter
    if (status !== 'all') {
      if (status === 'active') {
        whereConditions.push('pc.is_active = 1 AND pc.valid_from <= NOW() AND pc.valid_until >= NOW()');
      } else if (status === 'inactive') {
        whereConditions.push('pc.is_active = 0');
      } else if (status === 'expired') {
        whereConditions.push('pc.valid_until < NOW()');
      } else if (status === 'upcoming') {
        whereConditions.push('pc.valid_from > NOW()');
      }
    }

    // Type filter
    if (type !== 'all') {
      whereConditions.push('pc.discount_type = ?');
      queryParams.push(type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Create new array for the main query parameters (includes limit and offset)
    const mainQueryParams = [...queryParams, parseInt(limit), parseInt(offset)];
    
    const promoQuery = `
      SELECT 
        pc.id, pc.code, pc.title_ar, pc.title_en, 
        pc.discount_type, pc.discount_value, pc.is_active,
        pc.created_at
      FROM promo_codes pc
      ${whereClause}
      ORDER BY pc.created_at DESC
      LIMIT ? OFFSET ?
    `;

    res.json({
      success: true,
      debug: {
        whereConditions,
        queryParams,
        mainQueryParams,
        whereClause,
        query: promoQuery,
        paramCount: mainQueryParams.length,
        placeholderCount: (promoQuery.match(/\?/g) || []).length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing promo query',
      error: error.message
    });
  }
});

module.exports = router;
