const express = require('express');
const { executeQuery, getPaginatedResults } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');
const { uploadCategoryImage, uploadCategoryImages, deleteImage } = require('../middleware/upload');

const router = express.Router();

/**
 * @route   GET /api/categories
 * @desc    Get all categories with optional filters
 * @access  Public
 */
router.get('/', validatePagination, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      parent_id, 
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
      whereConditions.push('c.is_active = 1');
    }

    // Parent category filter
    if (parent_id !== undefined) {
      if (parent_id === 'null' || parent_id === '') {
        whereConditions.push('c.parent_id IS NULL');
      } else {
        whereConditions.push('c.parent_id = ?');
        queryParams.push(parent_id);
      }
    }

    // Search filter
    if (search) {
      whereConditions.push('(c.title_ar LIKE ? OR c.title_en LIKE ? OR c.description_ar LIKE ? OR c.description_en LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        c.id, c.parent_id, c.flavour_id, c.title_ar, c.title_en, 
        c.description_ar, c.description_en, c.slug, c.image, 
        c.banner_image, c.banner_mobile, c.sort_order, c.is_active,
        c.created_at, c.updated_at,
        parent.title_ar as parent_title_ar, parent.title_en as parent_title_en,
        f.title_ar as flavour_title_ar, f.title_en as flavour_title_en,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as products_count
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      LEFT JOIN flavours f ON c.flavour_id = f.id
      ${whereClause}
      ORDER BY c.sort_order ASC, c.created_at DESC
    `;

    if (validatedPage && validatedLimit) {
      const result = await getPaginatedResults(query, queryParams, validatedPage, validatedLimit);
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } else {
      const categories = await executeQuery(query, queryParams);
      res.json({
        success: true,
        data: categories
      });
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/categories/tree
 * @desc    Get categories in hierarchical tree structure
 * @access  Public
 */
router.get('/tree', async (req, res, next) => {
  try {
    const { include_inactive = false } = req.query;

    let whereClause = '';
    if (!include_inactive || include_inactive !== 'true') {
      whereClause = 'WHERE c.is_active = 1';
    }

    const categories = await executeQuery(`
      SELECT 
        c.id, c.parent_id, c.flavour_id, c.title_ar, c.title_en, 
        c.description_ar, c.description_en, c.slug, c.image, 
        c.banner_image, c.banner_mobile, c.sort_order, c.is_active,
        c.created_at, c.updated_at,
        f.title_ar as flavour_title_ar, f.title_en as flavour_title_en,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as products_count
      FROM categories c
      LEFT JOIN flavours f ON c.flavour_id = f.id
      ${whereClause}
      ORDER BY c.sort_order ASC, c.created_at DESC
    `);

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories = [];

    // First pass: create all category objects
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: []
      });
    });

    // Second pass: build parent-child relationships
    categories.forEach(category => {
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(categoryMap.get(category.id));
        }
      } else {
        rootCategories.push(categoryMap.get(category.id));
      }
    });

    res.json({
      success: true,
      data: rootCategories
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID
 * @access  Public
 */
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const [category] = await executeQuery(`
      SELECT 
        c.*, 
        parent.title_ar as parent_title_ar, parent.title_en as parent_title_en,
        f.title_ar as flavour_title_ar, f.title_en as flavour_title_en,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as products_count
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      LEFT JOIN flavours f ON c.flavour_id = f.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        message_ar: 'التصنيف غير موجود'
      });
    }

    // Get subcategories
    const subcategories = await executeQuery(`
      SELECT 
        id, title_ar, title_en, slug, image, sort_order, is_active,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = categories.id AND p.is_active = 1) as products_count
      FROM categories 
      WHERE parent_id = ? AND is_active = 1
      ORDER BY sort_order ASC
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        category,
        subcategories
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (Admin/Staff)
 */
router.post('/', authenticate, authorize('admin', 'staff'), uploadCategoryImage, async (req, res, next) => {
  try {
    const {
      parent_id,
      title_ar = '',
      title_en = '',
      description_ar,
      description_en,
      slug,
      banner_image,
      banner_mobile,
      sort_order = 0
    } = req.body;

    // Handle uploaded image
    const image = req.uploadedImage ? req.uploadedImage.filename : null;

    // More flexible validation - at least one title is required
    if (!title_ar && !title_en) {
      return res.status(400).json({
        success: false,
        message: 'At least one title (Arabic or English) is required',
        message_ar: 'مطلوب عنوان واحد على الأقل (عربي أو إنجليزي)'
      });
    }

    // Generate unique slug if not provided or empty
    let categorySlug = slug;
    if (!categorySlug || categorySlug.trim() === '') {
      // Auto-generate from title
      const baseSlug = (title_en || title_ar || 'category')
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF\s]/g, '') // Allow Arabic characters
        .replace(/\s+/g, '-')
        .trim();
      
      // Find unique slug by adding counter if needed
      let finalSlug = baseSlug;
      let counter = 1;
      
      while (true) {
        const [existingSlug] = await executeQuery(
          'SELECT id FROM categories WHERE slug = ?',
          [finalSlug]
        );
        
        if (!existingSlug) {
          categorySlug = finalSlug;
          break;
        }
        
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 1000) {
          categorySlug = `${baseSlug}-${Date.now()}`;
          break;
        }
      }
    } else {
      // User provided a slug - check if it already exists
      const [existingSlug] = await executeQuery(
        'SELECT id FROM categories WHERE slug = ?',
        [categorySlug]
      );

      if (existingSlug) {
        // Suggest an alternative slug
        const suggestedSlug = `${categorySlug}-${Date.now()}`;
        return res.status(400).json({
          success: false,
          message: `Category slug '${categorySlug}' already exists. Try: '${suggestedSlug}'`,
          message_ar: `رابط التصنيف '${categorySlug}' موجود مسبقاً. جرب: '${suggestedSlug}'`,
          suggestedSlug: suggestedSlug,
          originalSlug: categorySlug
        });
      }
    }

    // Validate parent category if provided
    if (parent_id) {
      const [parentCategory] = await executeQuery(
        'SELECT id FROM categories WHERE id = ? AND is_active = 1',
        [parent_id]
      );

      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found',
          message_ar: 'التصنيف الأساسي غير موجود'
        });
      }
    }

    const result = await executeQuery(`
      INSERT INTO categories (
        parent_id, title_ar, title_en, description_ar, description_en,
        slug, image, banner_image, banner_mobile, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      parent_id || null, 
      title_ar || '', 
      title_en || '', 
      description_ar || null, 
      description_en || null, 
      categorySlug, 
      image || null, 
      banner_image || null, 
      banner_mobile || null, 
      sort_order || 0
    ]);

    const [newCategory] = await executeQuery(
      'SELECT * FROM categories WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      message_ar: 'تم إنشاء التصنيف بنجاح',
      data: { category: newCategory }
    });

  } catch (error) {
    // Clean up uploaded image if creation failed
    if (req.uploadedImage) {
      await deleteImage(req.uploadedImage.filename, 'categories');
    }
    next(error);
  }
});

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin/Staff)
 */
router.put('/:id', authenticate, authorize('admin', 'staff'), validateId, uploadCategoryImage, async (req, res, next) => {
  try {
    const {
      parent_id,
      flavour_id,
      title_ar,
      title_en,
      description_ar,
      description_en,
      slug,
      banner_image,
      banner_mobile,
      sort_order,
      is_active
    } = req.body;

    // Handle uploaded image
    const image = req.uploadedImage ? req.uploadedImage.filename : req.body.image;

    // Check if category exists and get current image
    const [existingCategory] = await executeQuery(
      'SELECT id, image FROM categories WHERE id = ?',
      [req.params.id]
    );

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        message_ar: 'التصنيف غير موجود'
      });
    }

    // Handle slug validation and generation
    let categorySlug = slug;
    if (slug) {
      // Check if provided slug already exists (excluding current category)
      const [existingSlug] = await executeQuery(
        'SELECT id FROM categories WHERE slug = ? AND id != ?',
        [slug, req.params.id]
      );

      if (existingSlug) {
        // Suggest an alternative slug
        const suggestedSlug = `${slug}-${Date.now()}`;
        return res.status(400).json({
          success: false,
          message: `Category slug '${slug}' already exists. Try: '${suggestedSlug}'`,
          message_ar: `رابط التصنيف '${slug}' موجود مسبقاً. جرب: '${suggestedSlug}'`,
          suggestedSlug: suggestedSlug,
          originalSlug: slug
        });
      }
    } else if (title_en || title_ar) {
      // Generate slug from title if not provided
      const baseSlug = (title_en || title_ar)
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF\s]/g, '') // Allow Arabic characters
        .replace(/\s+/g, '-')
        .trim();
      
      // Check if base slug exists and add suffix if needed
      let finalSlug = baseSlug;
      let counter = 1;
      
      while (true) {
        const [existingSlug] = await executeQuery(
          'SELECT id FROM categories WHERE slug = ? AND id != ?',
          [finalSlug, req.params.id]
        );
        
        if (!existingSlug) {
          categorySlug = finalSlug;
          break;
        }
        
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 1000) {
          categorySlug = `${baseSlug}-${Date.now()}`;
          break;
        }
      }
    }

    // Validate parent category if provided (prevent circular reference)
    if (parent_id) {
      if (parent_id == req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent',
          message_ar: 'لا يمكن للتصنيف أن يكون أساسياً لنفسه'
        });
      }

      const [parentCategory] = await executeQuery(
        'SELECT id FROM categories WHERE id = ? AND is_active = 1',
        [parent_id]
      );

      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found',
          message_ar: 'التصنيف الأساسي غير موجود'
        });
      }
    }

    // Delete old image if a new one was uploaded
    if (req.uploadedImage && existingCategory.image && !existingCategory.image.startsWith('http')) {
      await deleteImage(existingCategory.image, 'categories');
    }

    // Update category
    await executeQuery(`
      UPDATE categories SET
        parent_id = ?,
        flavour_id = ?,
        title_ar = COALESCE(?, title_ar),
        title_en = COALESCE(?, title_en),
        description_ar = ?,
        description_en = ?,
        slug = COALESCE(?, slug),
        image = ?,
        banner_image = ?,
        banner_mobile = ?,
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
      WHERE id = ?
    `, [
      parent_id || null, 
      flavour_id || null, 
      title_ar || null, 
      title_en || null,
      description_ar || null, 
      description_en || null, 
      slug || null, 
      image || null, 
      banner_image || null, 
      banner_mobile || null, 
      sort_order || null, 
      is_active !== undefined ? is_active : null, 
      req.params.id
    ]);

    const [updatedCategory] = await executeQuery(
      'SELECT * FROM categories WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Category updated successfully',
      message_ar: 'تم تحديث التصنيف بنجاح',
      data: { category: updatedCategory }
    });

  } catch (error) {
    // Clean up uploaded image if update failed
    if (req.uploadedImage) {
      await deleteImage(req.uploadedImage.filename, 'categories');
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category (soft delete)
 * @access  Private (Admin/Staff)
 */
router.delete('/:id', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const [category] = await executeQuery(
      'SELECT id FROM categories WHERE id = ?',
      [req.params.id]
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        message_ar: 'التصنيف غير موجود'
      });
    }

    // Check if category has active products
    const [productsCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1',
      [req.params.id]
    );

    if (productsCount.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with active products. Please move or delete products first.',
        message_ar: 'لا يمكن حذف تصنيف يحتوي على منتجات نشطة. يرجى نقل أو حذف المنتجات أولاً.'
      });
    }

    // Check if category has subcategories
    const [subcategoriesCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND is_active = 1',
      [req.params.id]
    );

    if (subcategoriesCount.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with active subcategories. Please move or delete subcategories first.',
        message_ar: 'لا يمكن حذف تصنيف يحتوي على تصنيفات فرعية نشطة. يرجى نقل أو حذف التصنيفات الفرعية أولاً.'
      });
    }

    await executeQuery(
      'UPDATE categories SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Category deleted successfully',
      message_ar: 'تم حذف التصنيف بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/categories/:id/activate
 * @desc    Activate/deactivate category
 * @access  Private (Admin/Staff)
 */
router.post('/:id/activate', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active must be a boolean value',
        message_ar: 'يجب أن تكون قيمة is_active منطقية'
      });
    }

    const [category] = await executeQuery(
      'SELECT id FROM categories WHERE id = ?',
      [req.params.id]
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        message_ar: 'التصنيف غير موجود'
      });
    }

    await executeQuery(
      'UPDATE categories SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [is_active, req.params.id]
    );

    res.json({
      success: true,
      message: `Category ${is_active ? 'activated' : 'deactivated'} successfully`,
      message_ar: `تم ${is_active ? 'تفعيل' : 'إلغاء تفعيل'} التصنيف بنجاح`
    });

  } catch (error) {
    next(error);
  }
});

// ============================================
// CATEGORY SORT ORDER ROUTES
// ============================================

/**
 * @route   PUT /api/categories/:id/sort-order
 * @desc    Update category sort order
 * @access  Private (Admin/Staff)
 */
router.put('/:id/sort-order', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sort_order, direction } = req.body;

    // If direction is provided (increment/decrement), calculate new sort order
    if (direction && ['increment', 'decrement'].includes(direction)) {
      // Get current sort order
      const [currentCategory] = await executeQuery(
        'SELECT sort_order FROM categories WHERE id = ?',
        [id]
      );

      if (!currentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
          message_ar: 'الفئة غير موجودة'
        });
      }

      const currentSortOrder = currentCategory.sort_order;
      const newSortOrder = direction === 'increment' 
        ? currentSortOrder + 1 
        : Math.max(0, currentSortOrder - 1);

      // Update sort order
      await executeQuery(
        'UPDATE categories SET sort_order = ?, updated_at = NOW() WHERE id = ?',
        [newSortOrder, id]
      );

      res.json({
        success: true,
        message: 'Category sort order updated successfully',
        message_ar: 'تم تحديث ترتيب الفئة بنجاح',
        data: {
          category_id: id,
          old_sort_order: currentSortOrder,
          new_sort_order: newSortOrder
        }
      });
    } else if (sort_order !== undefined) {
      // Direct sort order update
      if (isNaN(sort_order) || sort_order < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid sort order (non-negative number) is required',
          message_ar: 'ترتيب صالح مطلوب (رقم غير سالب)'
        });
      }

      await executeQuery(
        'UPDATE categories SET sort_order = ?, updated_at = NOW() WHERE id = ?',
        [sort_order, id]
      );

      res.json({
        success: true,
        message: 'Category sort order updated successfully',
        message_ar: 'تم تحديث ترتيب الفئة بنجاح',
        data: {
          category_id: id,
          new_sort_order: sort_order
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either sort_order or direction (increment/decrement) is required',
        message_ar: 'إما ترتيب أو اتجاه (زيادة/نقصان) مطلوب'
      });
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;
