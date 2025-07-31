const express = require('express');
const { executeQuery, getPaginatedResults } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/branches
 * @desc    Get all branches with optional filters
 * @access  Public
 */
router.get('/', validatePagination, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      include_inactive = false 
    } = req.query;

    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100); // Max 100 items per page

    let whereConditions = [];
    let queryParams = [];

    // Active filter
    if (!include_inactive || include_inactive !== 'true') {
      whereConditions.push('is_active = 1');
    }

    // Search filter
    if (search) {
      whereConditions.push('(title_ar LIKE ? OR title_en LIKE ? OR address_ar LIKE ? OR address_en LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        id, title_ar, title_en, phone, email, address_ar, address_en,
        latitude, longitude, working_hours, is_active, created_at, updated_at
      FROM branches
      ${whereClause}
      ORDER BY created_at DESC
    `;

    if (validatedPage && validatedLimit) {
      const result = await getPaginatedResults(query, queryParams, validatedPage, validatedLimit);
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } else {
      const branches = await executeQuery(query, queryParams);
      res.json({
        success: true,
        data: branches
      });
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/branches/:id
 * @desc    Get single branch by ID
 * @access  Public
 */
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const [branch] = await executeQuery(
      'SELECT * FROM branches WHERE id = ?',
      [req.params.id]
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
        message_ar: 'الفرع غير موجود'
      });
    }

    res.json({
      success: true,
      data: { branch }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/branches
 * @desc    Create new branch
 * @access  Private (Admin only)
 */
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const {
      title_ar,
      title_en,
      phone,
      email,
      address_ar,
      address_en,
      latitude,
      longitude,
      working_hours
    } = req.body;

    // Validate required fields
    if (!title_ar || !title_en) {
      return res.status(400).json({
        success: false,
        message: 'Title in both Arabic and English is required',
        message_ar: 'العنوان باللغتين العربية والإنجليزية مطلوب'
      });
    }

    // Convert undefined values to null for database compatibility
    const sanitizedValues = [
      title_ar || null,
      title_en || null,
      phone || null,
      email || null,
      address_ar || null,
      address_en || null,
      latitude !== undefined ? latitude : null,
      longitude !== undefined ? longitude : null,
      working_hours ? JSON.stringify(working_hours) : null
    ];

    const result = await executeQuery(`
      INSERT INTO branches (
        title_ar, title_en, phone, email, address_ar, address_en,
        latitude, longitude, working_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, sanitizedValues);

    const [newBranch] = await executeQuery(
      'SELECT * FROM branches WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      message_ar: 'تم إنشاء الفرع بنجاح',
      data: { branch: newBranch }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/branches/:id
 * @desc    Update branch
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const {
      title_ar,
      title_en,
      phone,
      email,
      address_ar,
      address_en,
      latitude,
      longitude,
      working_hours,
      is_active
    } = req.body;

    // Validate required fields for update
    if (!title_ar || !title_en) {
      return res.status(400).json({
        success: false,
        message: 'Title in both Arabic and English is required',
        message_ar: 'العنوان باللغتين العربية والإنجليزية مطلوب'
      });
    }

    // Check if branch exists
    const [existingBranch] = await executeQuery(
      'SELECT id FROM branches WHERE id = ?',
      [req.params.id]
    );

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
        message_ar: 'الفرع غير موجود'
      });
    }

    // Convert undefined values to null for database compatibility
    const sanitizedValues = [
      title_ar || null,
      title_en || null,
      phone || null,
      email || null,
      address_ar || null,
      address_en || null,
      latitude !== undefined ? latitude : null,
      longitude !== undefined ? longitude : null,
      working_hours ? JSON.stringify(working_hours) : null,
      is_active !== undefined ? is_active : null,
      req.params.id
    ];

    // Update branch
    await executeQuery(`
      UPDATE branches SET
        title_ar = ?,
        title_en = ?,
        phone = ?,
        email = ?,
        address_ar = ?,
        address_en = ?,
        latitude = ?,
        longitude = ?,
        working_hours = ?,
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
      WHERE id = ?
    `, sanitizedValues);

    const [updatedBranch] = await executeQuery(
      'SELECT * FROM branches WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Branch updated successfully',
      message_ar: 'تم تحديث الفرع بنجاح',
      data: { branch: updatedBranch }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/branches/:id/status
 * @desc    Update branch status only
 * @access  Private (Admin only)
 */
router.patch('/:id/status', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const { is_active } = req.body;

    if (is_active === undefined || is_active === null) {
      return res.status(400).json({
        success: false,
        message: 'is_active field is required',
        message_ar: 'حقل الحالة مطلوب'
      });
    }

    // Check if branch exists
    const [existingBranch] = await executeQuery(
      'SELECT id, title_en FROM branches WHERE id = ?',
      [req.params.id]
    );

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
        message_ar: 'الفرع غير موجود'
      });
    }

    // Update branch status
    await executeQuery(
      'UPDATE branches SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [is_active, req.params.id]
    );

    const [updatedBranch] = await executeQuery(
      'SELECT * FROM branches WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: `Branch ${is_active ? 'activated' : 'deactivated'} successfully`,
      message_ar: `تم ${is_active ? 'تفعيل' : 'إلغاء تفعيل'} الفرع بنجاح`,
      data: { branch: updatedBranch }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/branches/:id
 * @desc    Delete branch (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const [branch] = await executeQuery(
      'SELECT id FROM branches WHERE id = ?',
      [req.params.id]
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
        message_ar: 'الفرع غير موجود'
      });
    }

    await executeQuery(
      'UPDATE branches SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Branch deleted successfully',
      message_ar: 'تم حذف الفرع بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/branches/:id/inventory
 * @desc    Get branch inventory
 * @access  Private (Admin/Staff)
 */
router.get('/:id/inventory', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category_id } = req.query;

    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100); // Max 100 items per page

    // Check if branch exists
    const [branch] = await executeQuery(
      'SELECT id FROM branches WHERE id = ?',
      [req.params.id]
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
        message_ar: 'الفرع غير موجود'
      });
    }

    let whereConditions = ['bi.branch_id = ?'];
    let queryParams = [req.params.id];

    // Search filter
    if (search) {
      whereConditions.push('(p.title_ar LIKE ? OR p.title_en LIKE ? OR p.sku LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Category filter
    if (category_id) {
      whereConditions.push('p.category_id = ?');
      queryParams.push(category_id);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT 
        bi.id, bi.product_id, bi.variant_id, bi.stock_quantity, 
        bi.reserved_quantity, bi.min_stock_level, bi.updated_at,
        p.title_ar as product_title_ar, p.title_en as product_title_en,
        p.sku, p.main_image, p.base_price, p.sale_price,
        pv.title_ar as variant_title_ar, pv.title_en as variant_title_en,
        pv.price as variant_price,
        c.title_ar as category_title_ar, c.title_en as category_title_en,
        (bi.stock_quantity - bi.reserved_quantity) as available_quantity
      FROM branch_inventory bi
      INNER JOIN products p ON bi.product_id = p.id
      LEFT JOIN product_variants pv ON bi.variant_id = pv.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.title_en ASC
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
 * @route   POST /api/branches/:id/inventory
 * @desc    Add or update product inventory for branch
 * @access  Private (Admin/Staff)
 */
router.post('/:id/inventory', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const {
      product_id,
      variant_id,
      stock_quantity,
      min_stock_level = 0
    } = req.body;

    if (!product_id || stock_quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and stock quantity are required',
        message_ar: 'معرف المنتج وكمية المخزون مطلوبان'
      });
    }

    // Check if branch exists
    const [branch] = await executeQuery(
      'SELECT id FROM branches WHERE id = ?',
      [req.params.id]
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
        message_ar: 'الفرع غير موجود'
      });
    }

    // Check if product exists
    const [product] = await executeQuery(
      'SELECT id FROM products WHERE id = ?',
      [product_id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }

    // Check if variant exists (if provided)
    if (variant_id) {
      const [variant] = await executeQuery(
        'SELECT id FROM product_variants WHERE id = ? AND product_id = ?',
        [variant_id, product_id]
      );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Product variant not found',
          message_ar: 'متغير المنتج غير موجود'
        });
      }
    }

    // Check if inventory record already exists
    const [existingInventory] = await executeQuery(
      'SELECT id FROM branch_inventory WHERE branch_id = ? AND product_id = ? AND variant_id = ?',
      [req.params.id, product_id, variant_id || null]
    );

    if (existingInventory) {
      // Update existing inventory
      await executeQuery(`
        UPDATE branch_inventory SET
          stock_quantity = ?,
          min_stock_level = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [stock_quantity, min_stock_level, existingInventory.id]);
    } else {
      // Create new inventory record
      await executeQuery(`
        INSERT INTO branch_inventory (
          branch_id, product_id, variant_id, stock_quantity, min_stock_level
        ) VALUES (?, ?, ?, ?, ?)
      `, [req.params.id, product_id, variant_id || null, stock_quantity, min_stock_level]);
    }

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      message_ar: 'تم تحديث المخزون بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/branches/:id/inventory/:inventoryId
 * @desc    Update specific inventory record
 * @access  Private (Admin/Staff)
 */
router.put('/:id/inventory/:inventoryId', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const {
      stock_quantity,
      min_stock_level,
      reserved_quantity
    } = req.body;

    // Check if inventory record exists and belongs to the branch
    const [inventory] = await executeQuery(
      'SELECT id FROM branch_inventory WHERE id = ? AND branch_id = ?',
      [req.params.inventoryId, req.params.id]
    );

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found',
        message_ar: 'سجل المخزون غير موجود'
      });
    }

    await executeQuery(`
      UPDATE branch_inventory SET
        stock_quantity = COALESCE(?, stock_quantity),
        min_stock_level = COALESCE(?, min_stock_level),
        reserved_quantity = COALESCE(?, reserved_quantity),
        updated_at = NOW()
      WHERE id = ?
    `, [stock_quantity, min_stock_level, reserved_quantity, req.params.inventoryId]);

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      message_ar: 'تم تحديث المخزون بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/branches/:id/inventory/:inventoryId
 * @desc    Remove product from branch inventory
 * @access  Private (Admin/Staff)
 */
router.delete('/:id/inventory/:inventoryId', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    // Check if inventory record exists and belongs to the branch
    const [inventory] = await executeQuery(
      'SELECT id FROM branch_inventory WHERE id = ? AND branch_id = ?',
      [req.params.inventoryId, req.params.id]
    );

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found',
        message_ar: 'سجل المخزون غير موجود'
      });
    }

    await executeQuery(
      'DELETE FROM branch_inventory WHERE id = ?',
      [req.params.inventoryId]
    );

    res.json({
      success: true,
      message: 'Product removed from branch inventory',
      message_ar: 'تم إزالة المنتج من مخزون الفرع'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
