const express = require('express');
const { executeQuery, getPaginatedResults } = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');
const { uploadSingle, uploadMultiple, deleteImage } = require('../middleware/upload');

const router = express.Router();

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
      min_price,
      max_price,
      stock_status,
      include_inactive = false,
      branch_id
    } = req.query;

    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100); // Max 100 items per page

    let whereConditions = [];
    let queryParams = [];

    // Only filter by active status if include_inactive is false or not provided
    const shouldIncludeInactive = include_inactive === 'true' || include_inactive === true || include_inactive === '1';
    console.log('Products API - include_inactive parameter:', include_inactive, 'shouldIncludeInactive:', shouldIncludeInactive);
    
    if (!shouldIncludeInactive) {
      whereConditions.push('p.is_active = 1');
    }

    // Category filter
    if (category_id) {
      whereConditions.push('p.category_id = ?');
      queryParams.push(category_id);
    }

    // Featured filter
    if (is_featured !== undefined) {
      whereConditions.push('p.is_featured = ?');
      queryParams.push(is_featured === 'true' ? 1 : 0);
    }

    // Stock status filter
    if (stock_status) {
      whereConditions.push('p.stock_status = ?');
      queryParams.push(stock_status);
    }

    // Search filter
    if (search) {
      whereConditions.push('(p.title_ar LIKE ? OR p.title_en LIKE ? OR p.description_ar LIKE ? OR p.description_en LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Price range filter
    if (min_price) {
      whereConditions.push('COALESCE(p.sale_price, p.base_price) >= ?');
      queryParams.push(min_price);
    }
    if (max_price) {
      whereConditions.push('COALESCE(p.sale_price, p.base_price) <= ?');
      queryParams.push(max_price);
    }

    // Branch filter - only show products available in specific branch
    let branchJoin = '';
    if (branch_id) {
      branchJoin = 'INNER JOIN branch_inventory bi ON p.id = bi.product_id';
      whereConditions.push('bi.branch_id = ?');
      queryParams.push(branch_id);
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
        p.is_active, p.is_featured, p.stock_status, p.sku, p.sort_order,
        c.title_ar as category_title_ar, c.title_en as category_title_en,
        COALESCE(p.sale_price, p.base_price) as final_price,
        ${req.user ? `(SELECT COUNT(*) FROM user_favorites uf WHERE uf.user_id = ${req.user.id} AND uf.product_id = p.id) as is_favorited` : '0 as is_favorited'}${branch_id ? ',\n        bi.stock_quantity, bi.price_override' : ''}
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${branchJoin}
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
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
        product: {
          ...product,
          variants,
          images
        }
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
      stock_status = 'in_stock'
    } = req.body;

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
        main_image, is_featured, stock_status, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      is_featured ? 1 : 0,
      stock_status,
      1  // is_active
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
      stock_status
    } = req.body;

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
    if (is_featured !== undefined) {
      updateFields.push('is_featured = COALESCE(?, is_featured)');
      updateValues.push(is_featured !== undefined ? (is_featured ? 1 : 0) : null);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = COALESCE(?, is_active)');
      updateValues.push(is_active !== undefined ? (is_active ? 1 : 0) : null);
    }
    if (stock_status !== undefined) {
      updateFields.push('stock_status = COALESCE(?, stock_status)');
      updateValues.push(stock_status || null);
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
        price_override = null
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
              updated_at = NOW()
            WHERE id = ?
          `, [stock_quantity, min_stock_level, price_override, existingAssignment.id]);
        } else {
          // Create new assignment
          await executeQuery(`
            INSERT INTO branch_inventory (
              branch_id, product_id, variant_id, stock_quantity, min_stock_level, price_override
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [branch_id, req.params.id, variant_id, stock_quantity, min_stock_level, price_override]);
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
        bi.reserved_quantity, bi.min_stock_level, bi.price_override, bi.updated_at,
        b.title_ar as branch_title_ar, b.title_en as branch_title_en,
        UPPER(LEFT(REPLACE(b.title_en, ' ', ''), 4)) as branch_code,
        b.is_active as branch_is_active,
        pv.variant_name as variant_title_ar, pv.variant_value as variant_title_en,
        pv.price_modifier as variant_price,
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
      ORDER BY b.title_en ASC, pv.variant_name ASC, pv.variant_value ASC
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
        pv.variant_name as variant_title_ar, pv.variant_value as variant_title_en,
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
 * @access  Private (Admin/Staff)
 */
router.get('/:id/variants', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const productId = req.params.id;
    
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
    
    // Get all variants for this product
    const variants = await executeQuery(`
      SELECT 
        id,
        product_id,
        variant_name,
        variant_value,
        price_modifier,
        stock_quantity,
        sku,
        is_active,
        created_at,
        updated_at
      FROM product_variants 
      WHERE product_id = ? AND is_active = 1
      ORDER BY variant_name, variant_value
    `, [productId]);
    
    res.json({
      success: true,
      data: variants,
      count: variants.length
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
      variant_name,
      variant_value,
      price_modifier,
      stock_quantity,
      sku
    } = req.body;
    
    // Sanitize and validate parameters - convert undefined to null for database compatibility
    const sanitizedPriceModifier = price_modifier !== undefined ? parseFloat(price_modifier) || 0 : 0;
    const sanitizedStockQuantity = stock_quantity !== undefined ? parseInt(stock_quantity) || 0 : 0;
    const sanitizedSku = sku !== undefined && sku !== '' ? sku : null;
    
    // Validate required fields
    if (!variant_name || !variant_value) {
      return res.status(400).json({
        success: false,
        message: 'Variant name and value are required',
        message_ar: 'اسم وقيمة المتغير مطلوبان'
      });
    }
    
    // Check if product exists
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
    
    // Check if this variant combination already exists
    const existingVariant = await executeQuery(
      'SELECT id FROM product_variants WHERE product_id = ? AND variant_name = ? AND variant_value = ?',
      [productId, variant_name, variant_value]
    );
    
    if (existingVariant.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This variant combination already exists',
        message_ar: 'تركيبة المتغير هذه موجودة بالفعل'
      });
    }
    
    // Insert new variant
    const result = await executeQuery(`
      INSERT INTO product_variants 
      (product_id, variant_name, variant_value, price_modifier, stock_quantity, sku)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [productId, variant_name, variant_value, sanitizedPriceModifier, sanitizedStockQuantity, sanitizedSku]);
    
    // Get the created variant
    const newVariant = await executeQuery(
      'SELECT * FROM product_variants WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Product variant created successfully',
      message_ar: 'تم إنشاء متغير المنتج بنجاح',
      data: newVariant[0]
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
      variant_name,
      variant_value,
      price_modifier,
      stock_quantity,
      sku,
      is_active
    } = req.body;
    
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
    
    // Build dynamic update query
    let updateFields = [];
    let updateValues = [];
    
    if (variant_name !== undefined) {
      updateFields.push('variant_name = ?');
      updateValues.push(variant_name);
    }
    if (variant_value !== undefined) {
      updateFields.push('variant_value = ?');
      updateValues.push(variant_value);
    }
    if (price_modifier !== undefined) {
      updateFields.push('price_modifier = ?');
      updateValues.push(price_modifier !== null ? parseFloat(price_modifier) || 0 : 0);
    }
    if (stock_quantity !== undefined) {
      updateFields.push('stock_quantity = ?');
      updateValues.push(stock_quantity !== null ? parseInt(stock_quantity) || 0 : 0);
    }
    if (sku !== undefined) {
      updateFields.push('sku = ?');
      updateValues.push(sku !== null && sku !== '' ? sku : null);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
        message_ar: 'لا توجد حقول للتحديث'
      });
    }
    
    // Add updated_at
    updateFields.push('updated_at = NOW()');
    updateValues.push(variantId);
    
    // Update variant
    await executeQuery(
      `UPDATE product_variants SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    // Get updated variant
    const updatedVariant = await executeQuery(
      'SELECT * FROM product_variants WHERE id = ?',
      [variantId]
    );
    
    res.json({
      success: true,
      message: 'Product variant updated successfully',
      message_ar: 'تم تحديث متغير المنتج بنجاح',
      data: updatedVariant[0]
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
      data: variantResult[0]
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

module.exports = router;
