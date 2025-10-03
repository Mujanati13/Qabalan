const express = require('express');
const { executeQuery, getPaginatedResults } = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');
const { uploadSingle, uploadMultiple, deleteImage } = require('../middleware/upload');

const router = express.Router();

const mapVariantResponse = (variant) => {
  if (!variant) {
    return variant;
  }

  const hasTitleAr = Object.prototype.hasOwnProperty.call(variant, 'title_ar');
  const hasTitleEn = Object.prototype.hasOwnProperty.call(variant, 'title_en');
  const hasPrice = Object.prototype.hasOwnProperty.call(variant, 'price');

  return {
    ...variant,
    ...(hasTitleAr ? {} : { title_ar: variant.variant_name || variant.variant_value || null }),
    ...(hasTitleEn ? {} : { title_en: variant.variant_value || variant.variant_name || null }),
    ...(hasPrice ? {} : { price: null })
  };
};

const normalizeBooleanInput = (value, defaultValue = undefined) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (value === null) {
    return defaultValue;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized.length === 0 || normalized === 'null' || normalized === 'undefined') {
      return defaultValue;
    }

    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
      return 1;
    }

    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
      return 0;
    }
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return defaultValue;
    }
    return value === 0 ? 0 : 1;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return value ? 1 : 0;
};

const VALID_STOCK_STATUSES = new Set(['in_stock', 'out_of_stock', 'limited']);

const normalizeIntegerInput = (value, { allowNull = true, min = null, max = null } = {}) => {
  if (value === undefined) {
    return { value: undefined };
  }

  if (value === null) {
    return allowNull ? { value: null } : { error: 'Value is required' };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed === 'null' || trimmed === 'undefined') {
      return allowNull ? { value: null } : { error: 'Value is required' };
    }
    value = trimmed;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue) || !Number.isFinite(numericValue)) {
    return { error: 'Value must be a number' };
  }

  const integerValue = Math.trunc(numericValue);

  if (min !== null && integerValue < min) {
    return { error: `Value must be greater than or equal to ${min}` };
  }

  if (max !== null && integerValue > max) {
    return { error: `Value must be less than or equal to ${max}` };
  }

  return { value: integerValue };
};

const normalizeStockStatus = (status, quantityHint = undefined) => {
  if (status === undefined || status === null) {
    if (typeof quantityHint === 'number') {
      return quantityHint <= 0 ? 'out_of_stock' : 'in_stock';
    }
    return 'in_stock';
  }

  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (normalized.length === 0) {
      if (typeof quantityHint === 'number') {
        return quantityHint <= 0 ? 'out_of_stock' : 'in_stock';
      }
      return 'in_stock';
    }

    if (VALID_STOCK_STATUSES.has(normalized)) {
      return normalized;
    }
  } else if (VALID_STOCK_STATUSES.has(status)) {
    return status;
  }

  return null;
};

/**
 * @route   GET /api/products
 * @desc    Get all products with pagination and filters
 * @access  Public
 */
router.get('/', optionalAuth, validatePagination, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category_id, 
      search, 
      sort = 'created_at', 
      order = 'desc',
  is_featured,
  is_home_top,
  is_home_new,
      min_price,
      max_price,
      stock_status,
      include_inactive = false,
      branch_id,
      include_branch_inactive = false,
      branch_availability,
      department_id,
      status
    } = req.query;

    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page, 10) || 1);
    const validatedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 12), 100); // Max 100 items per page

    const whereConditions = [];
    const whereParams = [];
    const joinParams = [];

    // Only filter by active status if include_inactive is false or not provided
    let shouldIncludeInactive = include_inactive === 'true' || include_inactive === true || include_inactive === '1';
    console.log('Products API - include_inactive parameter:', include_inactive, 'status parameter:', status);

    let statusFilterValue = null;
    if (status !== undefined && status !== null) {
      const statusNormalized = String(status).toLowerCase();
      if (['1', 'true', 'active'].includes(statusNormalized)) {
        statusFilterValue = 1;
      } else if (['0', 'false', 'inactive'].includes(statusNormalized)) {
        statusFilterValue = 0;
      }
    }

    if (statusFilterValue !== null) {
      shouldIncludeInactive = true; // Explicit status filter overrides default active-only behaviour
      whereConditions.push('p.is_active = ?');
      whereParams.push(statusFilterValue);
    } else if (!shouldIncludeInactive) {
      whereConditions.push('p.is_active = 1');
    }

    const shouldIncludeBranchInactive = include_branch_inactive === 'true' || include_branch_inactive === true || include_branch_inactive === '1';
    const normalizedBranchAvailability = (branch_availability || '').toLowerCase();
    const allowedBranchAvailability = ['available', 'unavailable', 'all'];
    const branchAvailabilityFilter = allowedBranchAvailability.includes(normalizedBranchAvailability)
      ? normalizedBranchAvailability
      : (shouldIncludeBranchInactive ? 'all' : 'available');

    // Category filter
    if (category_id) {
      whereConditions.push('p.category_id = ?');
      whereParams.push(category_id);
    }

    // Department filter
    if (department_id) {
      whereConditions.push('(c.id = ? OR c.parent_id = ?)');
      whereParams.push(department_id, department_id);
    }

    // Featured filter
    const normalizedFeaturedFilter = normalizeBooleanInput(is_featured);
    if (normalizedFeaturedFilter !== undefined && normalizedFeaturedFilter !== null) {
      whereConditions.push('p.is_featured = ?');
      whereParams.push(normalizedFeaturedFilter);
    }

    const normalizedHomeTopFilter = normalizeBooleanInput(is_home_top);
    if (normalizedHomeTopFilter !== undefined && normalizedHomeTopFilter !== null) {
      whereConditions.push('p.is_home_top = ?');
      whereParams.push(normalizedHomeTopFilter);
    }

    const normalizedHomeNewFilter = normalizeBooleanInput(is_home_new);
    if (normalizedHomeNewFilter !== undefined && normalizedHomeNewFilter !== null) {
      whereConditions.push('p.is_home_new = ?');
      whereParams.push(normalizedHomeNewFilter);
    }

    // Stock status filter
    if (stock_status) {
      whereConditions.push('p.stock_status = ?');
      whereParams.push(stock_status);
    }

    // Search filter
    if (search) {
      whereConditions.push('(p.title_ar LIKE ? OR p.title_en LIKE ? OR p.description_ar LIKE ? OR p.description_en LIKE ?)');
      const searchTerm = `%${search}%`;
      whereParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Price range filter
    if (min_price) {
      whereConditions.push('COALESCE(p.sale_price, p.base_price) >= ?');
      whereParams.push(min_price);
    }
    if (max_price) {
      whereConditions.push('COALESCE(p.sale_price, p.base_price) <= ?');
      whereParams.push(max_price);
    }

    // Branch filter - only show products available in specific branch
    let branchJoin = '';
    if (branch_id) {
      branchJoin = `
        INNER JOIN (
          SELECT 
            bi.product_id,
            bi.branch_id,
            SUM(bi.stock_quantity) AS branch_stock_quantity,
            SUM(bi.min_stock_level) AS branch_min_stock_level,
            SUM(bi.reserved_quantity) AS branch_reserved_quantity,
            MAX(bi.price_override) AS branch_price_override,
            MAX(bi.is_available) AS branch_is_available,
            MAX(b.is_active) AS branch_is_active,
            CASE
              WHEN MAX(bi.is_available) = 0 THEN 'unavailable'
              WHEN SUM(bi.stock_quantity) <= 0 THEN 'out_of_stock'
              WHEN SUM(bi.stock_quantity) <= SUM(bi.min_stock_level) THEN 'low_stock'
              ELSE 'in_stock'
            END AS branch_stock_status
          FROM branch_inventory bi
          INNER JOIN branches b ON bi.branch_id = b.id
          WHERE bi.branch_id = ?
          GROUP BY bi.product_id, bi.branch_id
        ) bi ON p.id = bi.product_id
      `;
      joinParams.push(branch_id);
      whereConditions.push('bi.branch_is_active = 1');

      if (branchAvailabilityFilter === 'available') {
        whereConditions.push('bi.branch_is_available = 1');
      } else if (branchAvailabilityFilter === 'unavailable') {
        whereConditions.push('bi.branch_is_available = 0');
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate sort fields
    const allowedSortFields = ['created_at', 'title_ar', 'title_en', 'base_price', 'sale_price', 'sort_order'];
    const sortField = allowedSortFields.includes(sort) ? `p.${sort}` : 'p.sort_order';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT 
        p.id, p.title_ar, p.title_en, p.description_ar, p.description_en,
  p.base_price, p.sale_price, p.loyalty_points, p.main_image, 
  p.is_active, p.is_featured, p.is_home_top, p.is_home_new,
  p.stock_status, p.sku, p.sort_order,
        p.stock_quantity, p.created_at, p.updated_at,
        c.title_ar as category_title_ar, c.title_en as category_title_en,
  ${branch_id ? `bi.branch_price_override, bi.branch_stock_quantity, bi.branch_reserved_quantity, bi.branch_stock_status, bi.branch_is_available, bi.branch_is_active, bi.branch_id,
        ` : ''}
        ${branch_id ? 'COALESCE(bi.branch_price_override, p.sale_price, p.base_price)' : 'COALESCE(p.sale_price, p.base_price)'} as final_price,
        ${req.user ? `(SELECT COUNT(*) FROM user_favorites uf WHERE uf.user_id = ${req.user.id} AND uf.product_id = p.id) as is_favorited` : '0 as is_favorited'}
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${branchJoin}
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
    `;

  const queryParams = [...joinParams, ...whereParams];

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
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', optionalAuth, validateId, async (req, res, next) => {
  try {
    // Get product details
    const [product] = await executeQuery(`
      SELECT 
        p.*, 
        c.title_ar as category_title_ar, c.title_en as category_title_en,
        COALESCE(p.sale_price, p.base_price) as final_price,
        ${req.user ? `(SELECT COUNT(*) FROM user_favorites uf WHERE uf.user_id = ${req.user.id} AND uf.product_id = p.id) as is_favorited` : '0 as is_favorited'}
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? 
    `, [req.params.id]);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }

    // Get product variants
    const variants = await executeQuery(`
      SELECT * FROM product_variants 
      WHERE product_id = ?
      ORDER BY id ASC
    `, [req.params.id]);

    // Get product images
    const images = await executeQuery(`
      SELECT * FROM product_images 
      WHERE product_id = ? 
      ORDER BY sort_order ASC
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...product,
        variants,
        images
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private (Admin/Staff)
 */
router.post('/', authenticate, authorize('admin', 'staff'), uploadSingle('main_image', 'products'), async (req, res, next) => {
  try {
    const {
      category_id,
      title_ar = '',
      title_en = '',
      description_ar = '',
      description_en = '',
      slug = '',
      sku = '',
      base_price,
      sale_price = null,
      loyalty_points = 0,
      weight = null,
      weight_unit = 'g',
      is_featured = false,
      is_active = 1,
      stock_status = 'in_stock',
      stock_quantity = null,
      is_home_top = 0,
      is_home_new = 0
    } = req.body;

    const normalizedIsFeatured = normalizeBooleanInput(is_featured, 0);
    const normalizedIsActive = normalizeBooleanInput(is_active, 1);
    const normalizedHomeTop = normalizeBooleanInput(is_home_top, 0);
    const normalizedHomeNew = normalizeBooleanInput(is_home_new, 0);
    const stockQuantityResult = normalizeIntegerInput(stock_quantity, { allowNull: true, min: 0 });
    if (stockQuantityResult.error) {
      if (req.uploadedImage) {
        await deleteImage(req.uploadedImage.filename, 'products');
      }
      return res.status(400).json({
        success: false,
        message: 'Stock quantity must be a non-negative integer',
        message_ar: 'يجب أن تكون كمية المخزون رقمًا صحيحًا غير سالب'
      });
    }
    const normalizedStockQuantity = stockQuantityResult.value;
    const normalizedStockStatus = normalizeStockStatus(stock_status, normalizedStockQuantity);
    if (normalizedStockStatus === null) {
      if (req.uploadedImage) {
        await deleteImage(req.uploadedImage.filename, 'products');
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid stock status provided',
        message_ar: 'حالة المخزون المدخلة غير صالحة'
      });
    }

    // Get uploaded image filename if available, otherwise use URL from form
    let main_image = '';
    if (req.uploadedImage) {
      // File was uploaded
      main_image = req.uploadedImage.filename;
    } else if (req.body.main_image) {
      // URL was provided
      main_image = req.body.main_image;
    }

    // Validate weight unit and adjust weight value accordingly
    const validWeightUnits = ['g', 'kg', 'lb', 'oz', 'pieces'];
    if (weight_unit && !validWeightUnits.includes(weight_unit)) {
      if (req.uploadedImage) {
        await deleteImage(req.uploadedImage.filename, 'products');
      }
      return res.status(400).json({
        success: false,
        message: `Invalid weight unit. Allowed units: ${validWeightUnits.join(', ')}`,
        message_ar: `وحدة الوزن غير صالحة. الوحدات المسموحة: ${validWeightUnits.join(', ')}`
      });
    }

    // Process and validate weight value
    let processedWeight = weight;
    if (weight_unit === 'pieces' && weight !== null) {
      const weightNum = parseFloat(weight);
      if (isNaN(weightNum) || weightNum < 0 || !Number.isInteger(weightNum)) {
        if (req.uploadedImage) {
          await deleteImage(req.uploadedImage.filename, 'products');
        }
        return res.status(400).json({
          success: false,
          message: 'When weight unit is "pieces", weight must be a positive whole number',
          message_ar: 'عندما تكون وحدة الوزن "قطع"، يجب أن يكون الوزن رقمًا صحيحًا موجبًا'
        });
      }
      // Convert to integer for pieces
      processedWeight = Math.floor(weightNum);
    } else if (weight !== null) {
      // For other weight units, allow decimal values
      const weightNum = parseFloat(weight);
      if (isNaN(weightNum) || weightNum < 0) {
        if (req.uploadedImage) {
          await deleteImage(req.uploadedImage.filename, 'products');
        }
        return res.status(400).json({
          success: false,
          message: 'Weight must be a positive number',
          message_ar: 'يجب أن يكون الوزن رقمًا موجبًا'
        });
      }
      processedWeight = weightNum;
    }

    // Basic validation
    if (!title_ar && !title_en) {
      // Clean up uploaded image if validation fails
      if (req.uploadedImage) {
        await deleteImage(req.uploadedImage.filename, 'products');
      }
      return res.status(400).json({
        success: false,
        message: 'At least one title (Arabic or English) is required',
        message_ar: 'مطلوب عنوان واحد على الأقل (عربي أو إنجليزي)'
      });
    }

    if (!base_price || isNaN(base_price) || base_price < 0) {
      // Clean up uploaded image if validation fails
      if (req.uploadedImage) {
        await deleteImage(req.uploadedImage.filename, 'products');
      }
      return res.status(400).json({
        success: false,
        message: 'Valid base price is required',
        message_ar: 'مطلوب سعر أساسي صالح'
      });
    }

    if (!category_id) {
      // Clean up uploaded image if validation fails
      if (req.uploadedImage) {
        await deleteImage(req.uploadedImage.filename, 'products');
      }
      return res.status(400).json({
        success: false,
        message: 'Category is required',
        message_ar: 'الفئة مطلوبة'
      });
    }

    // Generate slug if not provided
    const finalSlug = slug || (title_en || title_ar).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const result = await executeQuery(`
      INSERT INTO products (
        category_id, title_ar, title_en, description_ar, description_en, 
        slug, sku, base_price, sale_price, loyalty_points, weight, weight_unit,
        main_image, is_featured, stock_status, is_active, stock_quantity,
        is_home_top, is_home_new
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      category_id, 
      title_ar, 
      title_en, 
      description_ar, 
      description_en,
      finalSlug,
      sku || null,
      base_price, 
      sale_price, 
      loyalty_points,
      processedWeight,
      weight_unit,
      main_image, 
      normalizedIsFeatured ?? 0,
      normalizedStockStatus,
      normalizedIsActive ?? 1,
      normalizedStockQuantity,
      normalizedHomeTop ?? 0,
      normalizedHomeNew ?? 0
    ]);

    const [newProduct] = await executeQuery(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      message_ar: 'تم إنشاء المنتج بنجاح',
      data: { 
        product: newProduct,
        uploadedImage: req.uploadedImage || null
      }
    });

  } catch (error) {
    // Clean up uploaded image if database operation fails
    if (req.uploadedImage) {
      await deleteImage(req.uploadedImage.filename, 'products');
    }
    next(error);
  }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Admin/Staff)
 */
router.put('/:id', authenticate, authorize('admin', 'staff'), validateId, uploadSingle('main_image', 'products'), async (req, res, next) => {
  try {
    const {
      category_id,
      title_ar,
      title_en,
      description_ar,
      description_en,
      slug,
      sku,
      base_price,
      sale_price,
      loyalty_points,
      weight,
      weight_unit,
      is_featured,
      is_active,
      stock_status,
      stock_quantity,
      is_home_top,
      is_home_new
    } = req.body;

    const normalizedIsFeatured = normalizeBooleanInput(is_featured);
    const normalizedIsActive = normalizeBooleanInput(is_active);
    const normalizedHomeTop = normalizeBooleanInput(is_home_top);
    const normalizedHomeNew = normalizeBooleanInput(is_home_new);

    // Check if product exists and get current image
    const [existingProduct] = await executeQuery(
      'SELECT id, main_image FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!existingProduct) {
      // Clean up uploaded image if product not found
      if (req.uploadedImage) {
        await deleteImage(req.uploadedImage.filename, 'products');
      }
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }

    // Weight unit validation - only validate if weight_unit is being updated
    if (weight_unit !== undefined) {
      const validWeightUnits = ['g', 'kg', 'lb', 'oz', 'pieces'];
      
      if (!validWeightUnits.includes(weight_unit)) {
        if (req.uploadedImage) {
          await deleteImage(req.uploadedImage.filename, 'products');
        }
        return res.status(400).json({
          success: false,
          message: 'Invalid weight unit. Valid units are: g, kg, lb, oz, pieces',
          message_ar: 'وحدة الوزن غير صحيحة. الوحدات الصحيحة هي: g, kg, lb, oz, pieces'
        });
      }

      // Special validation for pieces - must be whole numbers
      if (weight_unit === 'pieces' && weight !== undefined) {
        const weightNum = parseFloat(weight);
        
        // Check if weight is a valid number
        if (isNaN(weightNum)) {
          if (req.uploadedImage) {
            await deleteImage(req.uploadedImage.filename, 'products');
          }
          return res.status(400).json({
            success: false,
            message: 'Weight must be a valid number when unit is pieces',
            message_ar: 'يجب أن يكون الوزن رقماً صحيحاً عندما تكون الوحدة قطع'
          });
        }

        // Check if weight is a whole number (integer)
        if (!Number.isInteger(weightNum)) {
          if (req.uploadedImage) {
            await deleteImage(req.uploadedImage.filename, 'products');
          }
          return res.status(400).json({
            success: false,
            message: 'Weight must be a whole number when unit is pieces',
            message_ar: 'يجب أن يكون الوزن رقماً صحيحاً عندما تكون الوحدة قطع'
          });
        }

        // Check if weight is positive
        if (weightNum <= 0) {
          if (req.uploadedImage) {
            await deleteImage(req.uploadedImage.filename, 'products');
          }
          return res.status(400).json({
            success: false,
            message: 'Weight must be a positive number',
            message_ar: 'يجب أن يكون الوزن رقماً موجباً'
          });
        }
      }
      // Validation for other weight units (g, kg, lb, oz)
      else if (['g', 'kg', 'lb', 'oz'].includes(weight_unit) && weight !== undefined) {
        const weightNum = parseFloat(weight);
        
        // Check if weight is a valid number
        if (isNaN(weightNum)) {
          if (req.uploadedImage) {
            await deleteImage(req.uploadedImage.filename, 'products');
          }
          return res.status(400).json({
            success: false,
            message: 'Weight must be a valid number',
            message_ar: 'يجب أن يكون الوزن رقماً صحيحاً'
          });
        }

        // Check if weight is positive
        if (weightNum <= 0) {
          if (req.uploadedImage) {
            await deleteImage(req.uploadedImage.filename, 'products');
          }
          return res.status(400).json({
            success: false,
            message: 'Weight must be a positive number',
            message_ar: 'يجب أن يكون الوزن رقماً موجباً'
          });
        }
      }
    }

    const stockQuantityProvided = Object.prototype.hasOwnProperty.call(req.body, 'stock_quantity');
    let normalizedStockQuantityValue;
    if (stockQuantityProvided) {
      const stockQuantityResult = normalizeIntegerInput(stock_quantity, { allowNull: true, min: 0 });
      if (stockQuantityResult.error) {
        if (req.uploadedImage) {
          await deleteImage(req.uploadedImage.filename, 'products');
        }
        return res.status(400).json({
          success: false,
          message: 'Stock quantity must be a non-negative integer',
          message_ar: 'يجب أن تكون كمية المخزون رقمًا صحيحًا غير سالب'
        });
      }
      normalizedStockQuantityValue = stockQuantityResult.value;
    }

    const stockStatusProvided = Object.prototype.hasOwnProperty.call(req.body, 'stock_status');
    let normalizedStockStatusValue;
    if (stockStatusProvided) {
      normalizedStockStatusValue = normalizeStockStatus(stock_status, normalizedStockQuantityValue);
      if (normalizedStockStatusValue === null) {
        if (req.uploadedImage) {
          await deleteImage(req.uploadedImage.filename, 'products');
        }
        return res.status(400).json({
          success: false,
          message: 'Invalid stock status provided',
          message_ar: 'حالة المخزون المدخلة غير صالحة'
        });
      }
    } else if (typeof normalizedStockQuantityValue === 'number') {
      normalizedStockStatusValue = normalizeStockStatus(undefined, normalizedStockQuantityValue);
    }

    // Get new image - prioritize uploaded file, then URL, then keep existing
    let main_image;
    if (req.uploadedImage) {
      // File was uploaded
      main_image = req.uploadedImage.filename;
    } else if (req.body.main_image !== undefined) {
      // URL was provided (could be empty string to clear image)
      main_image = req.body.main_image;
    } else {
      // Keep existing image
      main_image = undefined;
    }

    // Build update query dynamically to handle null values properly
    let updateFields = [];
    let updateValues = [];

    // Handle category_id specially - allow it to be set to null
    if (category_id !== undefined) {
      updateFields.push('category_id = ?');
      updateValues.push(category_id);
    }

    // Handle other fields with COALESCE
    if (title_ar !== undefined) {
      updateFields.push('title_ar = COALESCE(?, title_ar)');
      updateValues.push(title_ar || null);
    }
    if (title_en !== undefined) {
      updateFields.push('title_en = COALESCE(?, title_en)');
      updateValues.push(title_en || null);
    }
    if (description_ar !== undefined) {
      updateFields.push('description_ar = COALESCE(?, description_ar)');
      updateValues.push(description_ar || null);
    }
    if (description_en !== undefined) {
      updateFields.push('description_en = COALESCE(?, description_en)');
      updateValues.push(description_en || null);
    }
    if (slug !== undefined) {
      updateFields.push('slug = COALESCE(?, slug)');
      updateValues.push(slug || null);
    }
    if (sku !== undefined) {
      updateFields.push('sku = COALESCE(?, sku)');
      updateValues.push(sku || null);
    }
    if (base_price !== undefined) {
      updateFields.push('base_price = COALESCE(?, base_price)');
      updateValues.push(base_price || null);
    }
    if (sale_price !== undefined) {
      updateFields.push('sale_price = COALESCE(?, sale_price)');
      updateValues.push(sale_price || null);
    }
    if (loyalty_points !== undefined) {
      updateFields.push('loyalty_points = COALESCE(?, loyalty_points)');
      updateValues.push(loyalty_points !== undefined ? loyalty_points : null);
    }
    if (weight !== undefined) {
      updateFields.push('weight = COALESCE(?, weight)');
      updateValues.push(weight || null);
    }
    if (weight_unit !== undefined) {
      updateFields.push('weight_unit = COALESCE(?, weight_unit)');
      updateValues.push(weight_unit || null);
    }
    if (main_image !== undefined) {
      updateFields.push('main_image = COALESCE(?, main_image)');
      updateValues.push(main_image || null);
    }
    if (normalizedIsFeatured !== undefined) {
      updateFields.push('is_featured = ?');
      updateValues.push(normalizedIsFeatured);
    }
    if (normalizedIsActive !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(normalizedIsActive);
    }
    if (normalizedHomeTop !== undefined) {
      updateFields.push('is_home_top = ?');
      updateValues.push(normalizedHomeTop);
    }
    if (normalizedHomeNew !== undefined) {
      updateFields.push('is_home_new = ?');
      updateValues.push(normalizedHomeNew);
    }
    if (stockQuantityProvided) {
      updateFields.push('stock_quantity = COALESCE(?, stock_quantity)');
      updateValues.push(normalizedStockQuantityValue);
    }

    if (stockStatusProvided || typeof normalizedStockQuantityValue === 'number') {
      if (normalizedStockStatusValue !== undefined) {
        updateFields.push('stock_status = ?');
        updateValues.push(normalizedStockStatusValue);
      }
    }

    // Always update the timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // Build final query
    const updateQuery = `
      UPDATE products SET
        ${updateFields.join(', ')}
      WHERE id = ?
    `;

    updateValues.push(req.params.id);

    // Update product
    await executeQuery(updateQuery, updateValues);

    // Delete old image if a new one was uploaded
    if (req.uploadedImage && existingProduct.main_image && existingProduct.main_image !== req.uploadedImage.filename) {
      await deleteImage(existingProduct.main_image, 'products');
    }

    const [updatedProduct] = await executeQuery(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Product updated successfully',
      message_ar: 'تم تحديث المنتج بنجاح',
      data: { 
        product: updatedProduct,
        uploadedImage: req.uploadedImage || null
      }
    });

  } catch (error) {
    // Clean up uploaded image if database operation fails
    if (req.uploadedImage) {
      await deleteImage(req.uploadedImage.filename, 'products');
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private (Admin/Staff)
 */
router.delete('/:id', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const [product] = await executeQuery(
      'SELECT id, main_image FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }

    // Get all product images before deletion
    const productImages = await executeQuery(
      'SELECT image_url FROM product_images WHERE product_id = ?',
      [req.params.id]
    );

    // Soft delete the product
    await executeQuery(
      'UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
    );

    // Optionally, for hard delete (uncomment if needed):
    // await executeQuery('DELETE FROM product_images WHERE product_id = ?', [req.params.id]);
    // await executeQuery('DELETE FROM products WHERE id = ?', [req.params.id]);
    
    // Clean up images for hard delete (uncomment if doing hard delete):
    // if (product.main_image) {
    //   await deleteImage(product.main_image, 'products');
    // }
    // for (const img of productImages) {
    //   await deleteImage(img.image_url, 'products');
    // }

    res.json({
      success: true,
      message: 'Product deleted successfully',
      message_ar: 'تم حذف المنتج بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/products/:id/favorite
 * @desc    Add/remove product from favorites
 * @access  Private (Customer)
 */
router.post('/:id/favorite', authenticate, authorize('customer'), validateId, async (req, res, next) => {
  try {
    const [product] = await executeQuery(
      'SELECT id FROM products WHERE id = ? AND is_active = 1',
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }

    // Check if already favorited
    const [existingFavorite] = await executeQuery(
      'SELECT id FROM user_favorites WHERE user_id = ? AND product_id = ?',
      [req.user.id, req.params.id]
    );

    if (existingFavorite) {
      // Remove from favorites
      await executeQuery(
        'DELETE FROM user_favorites WHERE id = ?',
        [existingFavorite.id]
      );

      res.json({
        success: true,
        message: 'Product removed from favorites',
        message_ar: 'تم إزالة المنتج من المفضلة',
        data: { is_favorited: false }
      });
    } else {
      // Add to favorites
      await executeQuery(
        'INSERT INTO user_favorites (user_id, product_id) VALUES (?, ?)',
        [req.user.id, req.params.id]
      );

      res.json({
        success: true,
        message: 'Product added to favorites',
        message_ar: 'تم إضافة المنتج إلى المفضلة',
        data: { is_favorited: true }
      });
    }

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/products/:id/branches
 * @desc    Assign product to branches with initial inventory
 * @access  Private (Admin/Staff)
 */
router.post('/:id/branches', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { branches } = req.body;

    if (!Array.isArray(branches) || branches.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Branches array is required',
        message_ar: 'مجموعة الفروع مطلوبة'
      });
    }

    // Check if product exists
    const [product] = await executeQuery(
      'SELECT id FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }

    const assignments = [];
    const errors = [];

    for (const branchAssignment of branches) {
      const { 
        branch_id, 
        variant_id = null, 
        stock_quantity = 0, 
        min_stock_level = 0,
        price_override = null,
        is_available = true
      } = branchAssignment;

      try {
        // Check if branch exists
        const [branch] = await executeQuery(
          'SELECT id FROM branches WHERE id = ? AND is_active = 1',
          [branch_id]
        );

        if (!branch) {
          errors.push(`Branch ID ${branch_id} not found or inactive`);
          continue;
        }

        // Check if variant exists (if provided)
        if (variant_id) {
          const [variant] = await executeQuery(
            'SELECT id FROM product_variants WHERE id = ? AND product_id = ?',
            [variant_id, req.params.id]
          );

          if (!variant) {
            errors.push(`Variant ID ${variant_id} not found for this product`);
            continue;
          }
        }

        // Check if assignment already exists
        const [existingAssignment] = await executeQuery(
          'SELECT id FROM branch_inventory WHERE branch_id = ? AND product_id = ? AND variant_id = ?',
          [branch_id, req.params.id, variant_id]
        );

        if (existingAssignment) {
          // Update existing assignment
          await executeQuery(`
            UPDATE branch_inventory SET
              stock_quantity = ?,
              min_stock_level = ?,
              price_override = ?,
              is_available = ?,
              updated_at = NOW()
            WHERE id = ?
          `, [stock_quantity, min_stock_level, price_override, is_available ? 1 : 0, existingAssignment.id]);
        } else {
          // Create new assignment
          await executeQuery(`
            INSERT INTO branch_inventory (
              branch_id, product_id, variant_id, stock_quantity, min_stock_level, price_override, is_available
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [branch_id, req.params.id, variant_id, stock_quantity, min_stock_level, price_override, is_available ? 1 : 0]);
        }

        assignments.push({
          branch_id,
          variant_id,
          stock_quantity,
          min_stock_level,
          price_override,
          status: 'success'
        });

      } catch (error) {
        errors.push(`Error assigning to branch ${branch_id}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Product branch assignment completed',
      message_ar: 'تم تعيين المنتج للفروع',
      data: {
        successful_assignments: assignments,
        errors: errors
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/products/:id/branches
 * @desc    Get product availability across branches
 * @access  Private (Admin/Staff)
 */
router.get('/:id/branches', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    // Check if product exists
    const [product] = await executeQuery(
      'SELECT id, title_ar, title_en FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }

    const availability = await executeQuery(`
      SELECT 
        bi.id, bi.branch_id, bi.variant_id, bi.stock_quantity, 
        bi.reserved_quantity, bi.min_stock_level, bi.price_override, bi.is_available, bi.updated_at,
        b.title_ar as branch_title_ar, b.title_en as branch_title_en,
        UPPER(LEFT(REPLACE(b.title_en, ' ', ''), 4)) as branch_code,
        b.is_active as branch_is_active,
        pv.variant_name,
        pv.variant_value,
        pv.price_modifier,
        pv.stock_quantity as variant_stock_quantity,
        pv.sku as variant_sku,
        COALESCE(pv.variant_name, pv.variant_value) as variant_title_ar,
        COALESCE(pv.variant_value, pv.variant_name) as variant_title_en,
        NULL as variant_price,
        (bi.stock_quantity - bi.reserved_quantity) as available_quantity,
        CASE 
          WHEN bi.stock_quantity <= bi.min_stock_level THEN 'low'
          WHEN bi.stock_quantity = 0 THEN 'out_of_stock'
          ELSE 'in_stock'
        END as stock_status
      FROM branch_inventory bi
      INNER JOIN branches b ON bi.branch_id = b.id
      LEFT JOIN product_variants pv ON bi.variant_id = pv.id
      WHERE bi.product_id = ?
  ORDER BY b.title_en ASC, COALESCE(pv.variant_value, pv.variant_name) ASC
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        product,
        availability
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/products/:id/branches/:branchId
 * @desc    Update product availability in specific branch
 * @access  Private (Admin/Staff)
 */
router.put('/:id/branches/:branchId', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const {
      variant_id,
      stock_quantity,
      min_stock_level,
      reserved_quantity,
      price_override,
      is_available
    } = req.body;

    // Check if assignment exists
    const whereClause = variant_id 
      ? 'branch_id = ? AND product_id = ? AND variant_id = ?'
      : 'branch_id = ? AND product_id = ? AND variant_id IS NULL';
    
    const params = variant_id 
      ? [req.params.branchId, req.params.id, variant_id]
      : [req.params.branchId, req.params.id];

    const [assignment] = await executeQuery(
      `SELECT id FROM branch_inventory WHERE ${whereClause}`,
      params
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Product assignment not found for this branch',
        message_ar: 'تعيين المنتج غير موجود في هذا الفرع'
      });
    }

    // Convert undefined to null for SQL compatibility
    const safeStockQuantity = stock_quantity !== undefined ? stock_quantity : null;
    const safeMinStockLevel = min_stock_level !== undefined ? min_stock_level : null;
    const safeReservedQuantity = reserved_quantity !== undefined ? reserved_quantity : null;
    const safePriceOverride = price_override !== undefined ? price_override : null;
    const safeIsAvailable = is_available !== undefined ? (is_available ? 1 : 0) : null;

    // Build dynamic UPDATE query based on provided fields
    const updateFields = [];
    const updateParams = [];

    if (safeStockQuantity !== null) {
      updateFields.push('stock_quantity = ?');
      updateParams.push(safeStockQuantity);
    }

    if (safeMinStockLevel !== null) {
      updateFields.push('min_stock_level = ?');
      updateParams.push(safeMinStockLevel);
    }

    if (safeReservedQuantity !== null) {
      updateFields.push('reserved_quantity = ?');
      updateParams.push(safeReservedQuantity);
    }

    if (safePriceOverride !== null) {
      updateFields.push('price_override = ?');
      updateParams.push(safePriceOverride);
    }

    if (safeIsAvailable !== null) {
      updateFields.push('is_available = ?');
      updateParams.push(safeIsAvailable);
    }

    // Always update the timestamp
    updateFields.push('updated_at = NOW()');

    if (updateFields.length === 1) { // Only timestamp update
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
        message_ar: 'لم يتم تقديم حقول صالحة للتحديث'
      });
    }

    // Add assignment ID for WHERE clause
    updateParams.push(assignment.id);

    await executeQuery(`
      UPDATE branch_inventory SET
        ${updateFields.join(', ')}
      WHERE id = ?
    `, updateParams);

    res.json({
      success: true,
      message: 'Product availability updated successfully',
      message_ar: 'تم تحديث توفر المنتج بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/products/:id/branches/:branchId
 * @desc    Remove product from specific branch
 * @access  Private (Admin/Staff)
 */
router.delete('/:id/branches/:branchId', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { variant_id } = req.query;

    // Check if assignment exists
    const whereClause = variant_id 
      ? 'branch_id = ? AND product_id = ? AND variant_id = ?'
      : 'branch_id = ? AND product_id = ? AND variant_id IS NULL';
    
    const params = variant_id 
      ? [req.params.branchId, req.params.id, variant_id]
      : [req.params.branchId, req.params.id];

    const [assignment] = await executeQuery(
      `SELECT id FROM branch_inventory WHERE ${whereClause}`,
      params
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Product assignment not found for this branch',
        message_ar: 'تعيين المنتج غير موجود في هذا الفرع'
      });
    }

    await executeQuery(
      'DELETE FROM branch_inventory WHERE id = ?',
      [assignment.id]
    );

    res.json({
      success: true,
      message: 'Product removed from branch successfully',
      message_ar: 'تم إزالة المنتج من الفرع بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/products/:id/toggle-status
 * @desc    Toggle product active/inactive status
 * @access  Private (Admin/Staff)
 */
router.post('/:id/toggle-status', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const [product] = await executeQuery(
      'SELECT id, is_active FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }

    const newStatus = product.is_active ? 0 : 1;

    await executeQuery(
      'UPDATE products SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, req.params.id]
    );

    res.json({
      success: true,
      message: `Product ${newStatus ? 'activated' : 'deactivated'} successfully`,
      message_ar: `تم ${newStatus ? 'تفعيل' : 'إلغاء تفعيل'} المنتج بنجاح`,
      data: { is_active: newStatus }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/products/inventory/low-stock
 * @desc    Get products with low stock across all branches
 * @access  Private (Admin/Staff)
 */
router.get('/inventory/low-stock', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, branch_id } = req.query;

    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100); // Max 100 items per page

    let whereConditions = ['bi.stock_quantity <= bi.min_stock_level'];
    let queryParams = [];

    if (branch_id) {
      whereConditions.push('bi.branch_id = ?');
      queryParams.push(branch_id);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT 
        bi.id, bi.branch_id, bi.product_id, bi.variant_id,
        bi.stock_quantity, bi.min_stock_level, bi.reserved_quantity, bi.price_override,
        p.title_ar as product_title_ar, p.title_en as product_title_en,
        p.sku, p.main_image,
    b.title_ar as branch_title_ar, b.title_en as branch_title_en,
    pv.variant_name,
    pv.variant_value,
    COALESCE(pv.variant_name, pv.variant_value) as variant_title_ar,
    COALESCE(pv.variant_value, pv.variant_name) as variant_title_en,
    pv.price_modifier as variant_price_modifier,
    NULL as variant_price,
    (bi.stock_quantity - bi.reserved_quantity) as available_quantity
      FROM branch_inventory bi
      INNER JOIN products p ON bi.product_id = p.id
      INNER JOIN branches b ON bi.branch_id = b.id
      LEFT JOIN product_variants pv ON bi.variant_id = pv.id
      ${whereClause}
      ORDER BY bi.stock_quantity ASC, p.title_en ASC
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
 * @route   POST /api/products/:id/images
 * @desc    Upload additional images for a product
 * @access  Private (Admin/Staff)
 */
router.post('/:id/images', authenticate, authorize('admin', 'staff'), validateId, uploadMultiple('images', 5, 'products'), async (req, res, next) => {
  try {
    // Check if product exists
    const [product] = await executeQuery(
      'SELECT id FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!product) {
      // Clean up uploaded images if product not found
      if (req.uploadedImages) {
        for (const image of req.uploadedImages) {
          await deleteImage(image.filename, 'products');
        }
      }
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }

    if (!req.uploadedImages || req.uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided',
        message_ar: 'لم يتم توفير صور'
      });
    }

    // Insert image records into database
    const imageInserts = [];
    for (let i = 0; i < req.uploadedImages.length; i++) {
      const image = req.uploadedImages[i];
      const result = await executeQuery(`
        INSERT INTO product_images (product_id, image_url, sort_order, is_active)
        VALUES (?, ?, ?, 1)
      `, [req.params.id, image.filename, i]);
      
      imageInserts.push({
        id: result.insertId,
        product_id: req.params.id,
        image_url: image.filename,
        url: image.url,
        thumbnail_url: image.thumbnailUrl,
        sort_order: i
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product images uploaded successfully',
      message_ar: 'تم رفع صور المنتج بنجاح',
      data: {
        images: imageInserts,
        count: imageInserts.length
      }
    });

  } catch (error) {
    // Clean up uploaded images if database operation fails
    if (req.uploadedImages) {
      for (const image of req.uploadedImages) {
        await deleteImage(image.filename, 'products');
      }
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/products/:id/images/:imageId
 * @desc    Delete a specific product image
 * @access  Private (Admin/Staff)
 */
router.delete('/:id/images/:imageId', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { imageId } = req.params;

    // Get image details
    const [image] = await executeQuery(
      'SELECT id, image_url FROM product_images WHERE id = ? AND product_id = ?',
      [imageId, req.params.id]
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
        message_ar: 'الصورة غير موجودة'
      });
    }

    // Delete from database
    await executeQuery(
      'DELETE FROM product_images WHERE id = ?',
      [imageId]
    );

    // Delete physical files
    await deleteImage(image.image_url, 'products');

    res.json({
      success: true,
      message: 'Product image deleted successfully',
      message_ar: 'تم حذف صورة المنتج بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/products/:id/images/:imageId/sort
 * @desc    Update image sort order
 * @access  Private (Admin/Staff)
 */
router.put('/:id/images/:imageId/sort', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const { sort_order } = req.body;

    if (sort_order === undefined || isNaN(sort_order)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sort order is required',
        message_ar: 'ترتيب صالح مطلوب'
      });
    }

    // Check if image exists
    const [image] = await executeQuery(
      'SELECT id FROM product_images WHERE id = ? AND product_id = ?',
      [imageId, req.params.id]
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
        message_ar: 'الصورة غير موجودة'
      });
    }

    // Update sort order
    await executeQuery(
      'UPDATE product_images SET sort_order = ? WHERE id = ?',
      [sort_order, imageId]
    );

    res.json({
      success: true,
      message: 'Image sort order updated successfully',
      message_ar: 'تم تحديث ترتيب الصورة بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

// ============================================
// PRODUCT VARIANTS ROUTES
// ============================================

/**
 * @route   GET /api/products/:id/variants
 * @desc    Get all variants for a specific product
 * @access  Private (Admin/Staff) or Public (with active_only filter)
 */
router.get('/:id/variants', optionalAuth, validateId, async (req, res, next) => {
  try {
    const productId = req.params.id;
    const activeOnly = req.query.active_only === 'true';
    const isAdmin = req.user && (req.user.user_type === 'admin' || req.user.user_type === 'staff');
  const branchIdParam = req.query.branch_id ? parseInt(req.query.branch_id, 10) : null;
  const includeBranchStock = Number.isInteger(branchIdParam) && branchIdParam > 0;
    
    // First check if product exists
    const productResult = await executeQuery(
      'SELECT id FROM products WHERE id = ?',
      [productId]
    );
    
    if (productResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }
    
    // Build query based on user type and filter
    let whereClause = 'WHERE pv.product_id = ?';
    const queryParams = includeBranchStock ? [branchIdParam, productId] : [productId];
    
    // Non-admin users or when active_only is requested, filter for active variants only
    if (!isAdmin || activeOnly) {
      whereClause += ' AND pv.is_active = 1';
    }
    const availableQuantityExpr = includeBranchStock
      ? 'COALESCE(bi.stock_quantity - COALESCE(bi.reserved_quantity, 0), pv.stock_quantity)'
      : 'pv.stock_quantity';

    const stockStatusExpr = includeBranchStock
      ? `CASE
          WHEN COALESCE(bi.is_available, 1) = 0 THEN 'unavailable'
          WHEN ${availableQuantityExpr} <= 0 THEN 'out_of_stock'
          ELSE 'in_stock'
        END`
      : `CASE
          WHEN ${availableQuantityExpr} <= 0 THEN 'out_of_stock'
          ELSE 'in_stock'
        END`;

    const branchJoin = includeBranchStock
      ? 'LEFT JOIN branch_inventory bi ON bi.variant_id = pv.id AND bi.branch_id = ?'
      : '';

    const variants = await executeQuery(`
      SELECT 
        pv.id,
        pv.product_id,
        pv.variant_name,
        pv.variant_value,
        pv.price_modifier,
        pv.stock_quantity,
  ${includeBranchStock ? 'bi.stock_quantity AS branch_stock_quantity,' : 'NULL AS branch_stock_quantity,'}
  ${includeBranchStock ? '(bi.stock_quantity - COALESCE(bi.reserved_quantity, 0)) AS branch_available_quantity,' : 'NULL AS branch_available_quantity,'}
  ${includeBranchStock ? 'COALESCE(bi.is_available, 1) AS branch_is_available,' : 'NULL AS branch_is_available,'}
        ${availableQuantityExpr} AS available_quantity,
        ${stockStatusExpr} AS stock_status,
        pv.sku,
        pv.is_active,
        pv.created_at,
        pv.updated_at,
        COALESCE(pv.variant_name, pv.variant_value) AS title_ar,
        COALESCE(pv.variant_value, pv.variant_name) AS title_en,
        NULL AS price
      FROM product_variants pv
      ${branchJoin}
      ${whereClause}
      ORDER BY COALESCE(pv.variant_value, pv.variant_name) ASC
    `, queryParams);
    const mappedVariants = variants.map(mapVariantResponse);

    res.json({
      success: true,
      data: mappedVariants,
      count: mappedVariants.length
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/products/:id/variants
 * @desc    Create a new variant for a specific product
 * @access  Private (Admin/Staff)
 */
router.post('/:id/variants', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const productId = req.params.id;
    const {
      title_ar,
      title_en,
      variant_name,
      variant_value,
      price,
      price_modifier,
      stock_quantity,
      sku,
      is_active
    } = req.body;

    const sanitizeNumber = (value, fallback = null) => {
      if (value === undefined || value === null || value === '') {
        return fallback;
      }
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? fallback : parsed;
    };

    const sanitizedStockQuantity = stock_quantity !== undefined && stock_quantity !== null
      ? (parseInt(stock_quantity) || 0)
      : 0;
    const sanitizedSku = sku !== undefined && sku !== '' ? sku : null;
    const sanitizedIsActive = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    const productResult = await executeQuery(
      'SELECT id, base_price, sale_price FROM products WHERE id = ?',
      [productId]
    );

    if (productResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }

    const product = productResult[0];
    const parsePriceValue = (value) => sanitizeNumber(value, 0) || 0;
    const basePrice = parsePriceValue(product.sale_price) > 0
      ? parsePriceValue(product.sale_price)
      : parsePriceValue(product.base_price);

  const finalVariantName = (variant_name || title_ar || title_en || variant_value || '').toString().trim();
  const finalVariantValue = (variant_value || title_en || title_ar || variant_name || '').toString().trim();
  const normalizedVariantName = finalVariantName || null;
  const normalizedVariantValue = finalVariantValue || null;

    if (!finalVariantName && !finalVariantValue) {
      return res.status(400).json({
        success: false,
        message: 'A variant label is required',
        message_ar: 'اسم المتغير مطلوب'
      });
    }

    let finalPriceModifier = 0;
    const providedModifier = sanitizeNumber(price_modifier, null);
    const providedPrice = sanitizeNumber(price, null);

    if (providedModifier !== null) {
      finalPriceModifier = providedModifier;
    } else if (providedPrice !== null) {
      finalPriceModifier = providedPrice - basePrice;
    }

    const existingVariant = await executeQuery(
      'SELECT id FROM product_variants WHERE product_id = ? AND ((variant_name IS NULL AND ? IS NULL) OR variant_name = ?) AND ((variant_value IS NULL AND ? IS NULL) OR variant_value = ?)',
      [productId, normalizedVariantName, normalizedVariantName, normalizedVariantValue, normalizedVariantValue]
    );

    if (existingVariant.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This variant combination already exists',
        message_ar: 'تركيبة المتغير هذه موجودة بالفعل'
      });
    }

    const result = await executeQuery(`
      INSERT INTO product_variants 
      (product_id, variant_name, variant_value, price_modifier, stock_quantity, sku, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [productId, normalizedVariantName, normalizedVariantValue, finalPriceModifier, sanitizedStockQuantity, sanitizedSku, sanitizedIsActive]);

    const newVariant = await executeQuery(
      'SELECT * FROM product_variants WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Product variant created successfully',
      message_ar: 'تم إنشاء متغير المنتج بنجاح',
      data: mapVariantResponse(newVariant[0])
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/products/:id/variants/:variantId
 * @desc    Update a specific product variant
 * @access  Private (Admin/Staff)
 */
router.put('/:id/variants/:variantId', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const productId = req.params.id;
    const variantId = req.params.variantId;
    const {
      title_ar,
      title_en,
      variant_name,
      variant_value,
      price,
      price_modifier,
      stock_quantity,
      sku,
      is_active
    } = req.body;

    const sanitizeNumber = (value, fallback = null) => {
      if (value === undefined || value === null || value === '') {
        return fallback;
      }
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? fallback : parsed;
    };
    
    const variantResult = await executeQuery(
      'SELECT id FROM product_variants WHERE id = ? AND product_id = ?',
      [variantId, productId]
    );
    
    if (variantResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product variant not found',
        message_ar: 'متغير المنتج غير موجود'
      });
    }
    
    let updateFields = [];
    let updateValues = [];

    if (variant_name !== undefined || title_ar !== undefined) {
      const updatedName = (variant_name || title_ar || '').toString().trim();
      updateFields.push('variant_name = ?');
      updateValues.push(updatedName || null);
    }

    if (variant_value !== undefined || title_en !== undefined) {
      const updatedValue = (variant_value || title_en || '').toString().trim();
      updateFields.push('variant_value = ?');
      updateValues.push(updatedValue || null);
    }

    if (price_modifier !== undefined) {
      const modifier = sanitizeNumber(price_modifier, 0);
      updateFields.push('price_modifier = ?');
      updateValues.push(modifier);
    } else if (price !== undefined) {
      const providedPrice = sanitizeNumber(price, null);
      if (providedPrice === null) {
        return res.status(400).json({
          success: false,
          message: 'A valid price is required for the variant',
          message_ar: 'مطلوب تحديد سعر صالح للمتغير'
        });
      }

      const productData = await executeQuery(
        'SELECT base_price, sale_price FROM products WHERE id = ?',
        [productId]
      );

      const basePriceValue = (() => {
        if (productData.length === 0) {
          return 0;
        }
        const sale = sanitizeNumber(productData[0].sale_price, 0);
        const base = sanitizeNumber(productData[0].base_price, 0);
        return sale && sale > 0 ? sale : base;
      })();

      updateFields.push('price_modifier = ?');
      updateValues.push(providedPrice - basePriceValue);
    }

    if (stock_quantity !== undefined) {
      updateFields.push('stock_quantity = ?');
      updateValues.push(stock_quantity !== null ? (parseInt(stock_quantity) || 0) : 0);
    }

    if (sku !== undefined) {
      updateFields.push('sku = ?');
      updateValues.push(sku !== null && sku !== '' ? sku : null);
    }

    if (is_active !== undefined) {
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
    updateValues.push(variantId);

    await executeQuery(
      `UPDATE product_variants SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    const updatedVariant = await executeQuery(
      'SELECT * FROM product_variants WHERE id = ?',
      [variantId]
    );
    
    res.json({
      success: true,
      message: 'Product variant updated successfully',
      message_ar: 'تم تحديث متغير المنتج بنجاح',
      data: mapVariantResponse(updatedVariant[0])
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/products/:id/variants/:variantId
 * @desc    Delete a specific product variant
 * @access  Private (Admin/Staff)
 */
router.delete('/:id/variants/:variantId', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const productId = req.params.id;
    const variantId = req.params.variantId;
    
    // Check if variant exists for this product
    const variantResult = await executeQuery(
      'SELECT id FROM product_variants WHERE id = ? AND product_id = ?',
      [variantId, productId]
    );
    
    if (variantResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product variant not found',
        message_ar: 'متغير المنتج غير موجود'
      });
    }
    
    // Delete the variant
    await executeQuery(
      'DELETE FROM product_variants WHERE id = ? AND product_id = ?',
      [variantId, productId]
    );
    
    res.json({
      success: true,
      message: 'Product variant deleted successfully',
      message_ar: 'تم حذف متغير المنتج بنجاح'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/products/:id/variants/:variantId/toggle-status
 * @desc    Toggle the active status of a product variant
 * @access  Private (Admin/Staff)
 */
router.put('/:id/variants/:variantId/toggle-status', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const productId = req.params.id;
    const variantId = req.params.variantId;
    
    // Check if variant exists for this product
    const variantResult = await executeQuery(
      'SELECT id, is_active FROM product_variants WHERE id = ? AND product_id = ?',
      [variantId, productId]
    );
    
    if (variantResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product variant not found',
        message_ar: 'متغير المنتج غير موجود'
      });
    }
    
    const currentStatus = variantResult[0].is_active;
    const newStatus = currentStatus ? 0 : 1;
    
    // Toggle the status
    await executeQuery(
      'UPDATE product_variants SET is_active = ?, updated_at = NOW() WHERE id = ? AND product_id = ?',
      [newStatus, variantId, productId]
    );
    
    // Get updated variant
    const updatedVariant = await executeQuery(
      'SELECT * FROM product_variants WHERE id = ?',
      [variantId]
    );
    
    res.json({
      success: true,
      message: `Product variant ${newStatus ? 'activated' : 'deactivated'} successfully`,
      message_ar: `تم ${newStatus ? 'تفعيل' : 'إلغاء تفعيل'} متغير المنتج بنجاح`,
      data: mapVariantResponse(updatedVariant[0])
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/products/:id/variants/:variantId
 * @desc    Get a specific product variant
 * @access  Private (Admin/Staff)
 */
router.get('/:id/variants/:variantId', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const productId = req.params.id;
    const variantId = req.params.variantId;
    
    // Get the variant
    const variantResult = await executeQuery(
      'SELECT * FROM product_variants WHERE id = ? AND product_id = ?',
      [variantId, productId]
    );
    
    if (variantResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product variant not found',
        message_ar: 'متغير المنتج غير موجود'
      });
    }
    
    res.json({
      success: true,
      data: mapVariantResponse(variantResult[0])
    });
    
  } catch (error) {
    next(error);
  }
});

// ============================================
// PRODUCT SORT ORDER ROUTES
// ============================================

/**
 * @route   PUT /api/products/:id/sort-order
 * @desc    Update product sort order
 * @access  Private (Admin/Staff)
 */
router.put('/:id/sort-order', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sort_order, direction } = req.body;

    // If direction is provided (increment/decrement), calculate new sort order
    if (direction && ['increment', 'decrement'].includes(direction)) {
      // Get current sort order
      const [currentProduct] = await executeQuery(
        'SELECT sort_order FROM products WHERE id = ?',
        [id]
      );

      if (!currentProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
          message_ar: 'المنتج غير موجود'
        });
      }

      const currentSortOrder = currentProduct.sort_order;
      const newSortOrder = direction === 'increment' 
        ? currentSortOrder + 1 
        : Math.max(0, currentSortOrder - 1);

      // Update sort order
      await executeQuery(
        'UPDATE products SET sort_order = ?, updated_at = NOW() WHERE id = ?',
        [newSortOrder, id]
      );

      res.json({
        success: true,
        message: 'Product sort order updated successfully',
        message_ar: 'تم تحديث ترتيب المنتج بنجاح',
        data: {
          product_id: id,
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
        'UPDATE products SET sort_order = ?, updated_at = NOW() WHERE id = ?',
        [sort_order, id]
      );

      res.json({
        success: true,
        message: 'Product sort order updated successfully',
        message_ar: 'تم تحديث ترتيب المنتج بنجاح',
        data: {
          product_id: id,
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

/**
 * @route   PUT /api/products/:id/stock
 * @desc    Update product stock quantity directly (simple stock management)
 * @access  Private (Admin/Staff)
 */
router.put('/:id/stock', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const productId = req.params.id;
    const { stock_quantity } = req.body;

    const stockQuantityResult = normalizeIntegerInput(stock_quantity, { allowNull: false, min: 0 });
    if (stockQuantityResult.error) {
      return res.status(400).json({
        success: false,
        message: 'Stock quantity must be a non-negative number',
        message_ar: 'كمية المخزون يجب أن تكون رقماً غير سالب'
      });
    }
    const stockQuantityNum = stockQuantityResult.value;

    // Check if product exists
    const productRows = await executeQuery(
      'SELECT id, stock_status FROM products WHERE id = ?',
      [productId]
    );

    if (!productRows || productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        message_ar: 'المنتج غير موجود'
      });
    }

    const product = productRows[0];

    let nextStockStatus = product.stock_status;
    if (stockQuantityNum === 0 && product.stock_status !== 'out_of_stock') {
      nextStockStatus = 'out_of_stock';
    } else if (stockQuantityNum > 0 && product.stock_status === 'out_of_stock') {
      nextStockStatus = 'in_stock';
    }

    const updateFields = ['stock_quantity = ?'];
    const updateParams = [stockQuantityNum];

    if (nextStockStatus !== product.stock_status) {
      updateFields.push('stock_status = ?');
      updateParams.push(nextStockStatus);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateParams.push(productId);

    // Update product stock quantity
    const updateResult = await executeQuery(
      `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or no changes made',
        message_ar: 'المنتج غير موجود أو لم يتم إجراء تغييرات'
      });
    }

    // Get updated product info
    const updatedProduct = await executeQuery(`
      SELECT 
        id, title_ar, title_en, stock_quantity, stock_status,
        updated_at
      FROM products 
      WHERE id = ?
    `, [productId]);

    res.json({
      success: true,
      message: 'Product stock quantity updated successfully',
      message_ar: 'تم تحديث كمية مخزون المنتج بنجاح',
      data: updatedProduct[0]
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/products/bulk-toggle-all
 * @desc    Enable or disable all products at once
 * @access  Private (Admin only)
 */
router.post('/bulk-toggle-all', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { action, notes } = req.body; // action: 'enable' or 'disable'
    
    if (!action || !['enable', 'disable'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "enable" or "disable"',
        message_ar: 'يجب أن يكون الإجراء إما "تفعيل" أو "إلغاء تفعيل"'
      });
    }

    const newStatus = action === 'enable' ? 1 : 0;
    const adminUserId = req.user.id;

    // Get current product counts for logging
    const [activeCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM products WHERE is_active = 1'
    );
    const [inactiveCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM products WHERE is_active = 0'
    );

    // Update all products
    const updateResult = await executeQuery(
      'UPDATE products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE is_active != ?',
      [newStatus, newStatus]
    );

    // Get final counts
    const [finalActiveCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM products WHERE is_active = 1'
    );
    const [finalInactiveCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM products WHERE is_active = 0'
    );
    const [totalCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM products'
    );

    // Log the action (you may want to create a dedicated log table for this)
    console.log(`[ADMIN ACTION] User ${adminUserId} performed bulk ${action} on products`);
    console.log(`[BULK TOGGLE] Affected ${updateResult.affectedRows} products`);
    console.log(`[BULK TOGGLE] Before: ${activeCount.count} active, ${inactiveCount.count} inactive`);
    console.log(`[BULK TOGGLE] After: ${finalActiveCount.count} active, ${finalInactiveCount.count} inactive`);

    res.json({
      success: true,
      message: `Successfully ${action}d ${updateResult.affectedRows} products`,
      message_ar: `تم ${action === 'enable' ? 'تفعيل' : 'إلغاء تفعيل'} ${updateResult.affectedRows} منتج بنجاح`,
      data: {
        action,
        affected_products: updateResult.affectedRows,
        total_products: totalCount.count,
        active_products: finalActiveCount.count,
        inactive_products: finalInactiveCount.count,
        admin_user_id: adminUserId,
        notes: notes || null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Bulk toggle products error:', error);
    next(error);
  }
});

module.exports = router;
