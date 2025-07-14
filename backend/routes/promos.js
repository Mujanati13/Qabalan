const express = require('express');
const router = express.Router();
const { executeQuery, executeTransaction } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');
const { 
  validatePromoCode, 
  validatePromoApplication, 
  validatePromoFilters, 
  validateDateRange 
} = require('../middleware/promoValidation');

/**
 * @route   GET /api/promos
 * @desc    Get all promo codes with filtering and pagination
 * @access  Private (Admin)
 */
router.get('/', authenticate, authorize('admin', 'staff'), validatePagination, validatePromoFilters, async (req, res, next) => {
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

    const offset = (parseInt(page) - 1) * parseInt(limit);
    console.log('Query params:', { page, limit, offset, search, status, type, sort, order });
    
    let whereConditions = [];
    let queryParams = [];

    // Search filter
    if (search && search.trim() !== '') {
      whereConditions.push('(pc.code LIKE ? OR pc.title_ar LIKE ? OR pc.title_en LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
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
    
    // Validate sort fields
    const allowedSortFields = ['created_at', 'code', 'discount_value', 'usage_count', 'valid_from', 'valid_until'];
    const sortField = allowedSortFields.includes(sort) ? `pc.${sort}` : 'pc.created_at';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM promo_codes pc
      ${whereClause}
    `;
    
    console.log('Count query:', countQuery);
    console.log('Count query params:', queryParams);
    const [{ total }] = await executeQuery(countQuery, queryParams);
    console.log('Total count:', total);

    // Get promo codes - Build final query with string interpolation for LIMIT/OFFSET
    // to avoid parameter count mismatch
    const finalLimit = Math.max(1, Math.min(100, parseInt(limit)));
    const finalOffset = Math.max(0, parseInt(offset));
    
    const promoQuery = `
      SELECT 
        pc.id, pc.code, pc.title_ar, pc.title_en, pc.description_ar, pc.description_en,
        pc.discount_type, pc.discount_value, pc.min_order_amount, pc.max_discount_amount,
        pc.usage_limit, pc.usage_count, pc.user_usage_limit,
        pc.valid_from, pc.valid_until, pc.is_active,
        pc.created_at, pc.updated_at,
        CASE 
          WHEN pc.is_active = 0 THEN 'inactive'
          WHEN pc.valid_from > NOW() THEN 'upcoming'
          WHEN pc.valid_until < NOW() THEN 'expired'
          WHEN pc.usage_limit IS NOT NULL AND pc.usage_count >= pc.usage_limit THEN 'exhausted'
          ELSE 'active'
        END as status
      FROM promo_codes pc
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ${finalLimit} OFFSET ${finalOffset}
    `;
    
    console.log('Main query:', promoQuery);
    console.log('Main query params:', queryParams);
    const promoCodes = await executeQuery(promoQuery, queryParams);
    console.log('Query successful, rows:', promoCodes.length);

    res.json({
      success: true,
      data: promoCodes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Promos GET error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/promos/stats
 * @desc    Get promo code statistics
 * @access  Private (Admin)
 */
router.get('/stats', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total_codes,
        COUNT(CASE WHEN is_active = 1 AND valid_from <= NOW() AND valid_until >= NOW() THEN 1 END) as active_codes,
        COUNT(CASE WHEN valid_until < NOW() THEN 1 END) as expired_codes,
        COUNT(CASE WHEN valid_from > NOW() THEN 1 END) as upcoming_codes,
        COUNT(CASE WHEN usage_limit IS NOT NULL AND usage_count >= usage_limit THEN 1 END) as exhausted_codes,
        SUM(usage_count) as total_usages,
        AVG(discount_value) as avg_discount_value,
        SUM(CASE WHEN discount_type = 'fixed_amount' THEN usage_count * discount_value ELSE 0 END) as total_fixed_discounts
      FROM promo_codes
    `);

    const recentUsages = await executeQuery(`
      SELECT 
        pcu.used_at, pcu.discount_amount,
        pc.code, pc.title_en,
        u.first_name, u.last_name, u.email,
        o.order_number, o.total_amount
      FROM promo_code_usages pcu
      JOIN promo_codes pc ON pcu.promo_code_id = pc.id
      JOIN users u ON pcu.user_id = u.id
      JOIN orders o ON pcu.order_id = o.id
      ORDER BY pcu.used_at DESC
      LIMIT 10
    `);

    const topPerformingCodes = await executeQuery(`
      SELECT 
        pc.code, pc.title_en, pc.discount_type, pc.discount_value,
        pc.usage_count, pc.usage_limit,
        COALESCE(SUM(pcu.discount_amount), 0) as total_discount_given
      FROM promo_codes pc
      LEFT JOIN promo_code_usages pcu ON pc.id = pcu.promo_code_id
      WHERE pc.usage_count > 0
      GROUP BY pc.id
      ORDER BY pc.usage_count DESC, total_discount_given DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        overview: stats[0],
        recent_usages: recentUsages,
        top_performing: topPerformingCodes
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/promos/:id
 * @desc    Get single promo code by ID
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const [promoCode] = await executeQuery(`
      SELECT 
        pc.*,
        CASE 
          WHEN pc.is_active = 0 THEN 'inactive'
          WHEN pc.valid_from > NOW() THEN 'upcoming'
          WHEN pc.valid_until < NOW() THEN 'expired'
          WHEN pc.usage_limit IS NOT NULL AND pc.usage_count >= pc.usage_limit THEN 'exhausted'
          ELSE 'active'
        END as status
      FROM promo_codes pc
      WHERE pc.id = ?
    `, [req.params.id]);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found',
        message_ar: 'كود الخصم غير موجود'
      });
    }

    // Get usage details
    const usages = await executeQuery(`
      SELECT 
        pcu.used_at, pcu.discount_amount,
        u.first_name, u.last_name, u.email,
        o.order_number, o.total_amount
      FROM promo_code_usages pcu
      JOIN users u ON pcu.user_id = u.id
      JOIN orders o ON pcu.order_id = o.id
      WHERE pcu.promo_code_id = ?
      ORDER BY pcu.used_at DESC
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...promoCode,
        usages
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/promos
 * @desc    Create new promo code
 * @access  Private (Admin)
 */
router.post('/', authenticate, authorize('admin', 'staff'), validatePromoCode, async (req, res, next) => {
  try {
    const {
      code,
      title_ar,
      title_en,
      description_ar,
      description_en,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      usage_limit,
      user_usage_limit,
      valid_from,
      valid_until,
      is_active = true
    } = req.body;

    // Validation
    if (!code || !discount_type || !discount_value || !valid_from || !valid_until) {
      return res.status(400).json({
        success: false,
        message: 'Code, discount type, discount value, valid from and valid until are required',
        message_ar: 'الكود ونوع الخصم وقيمة الخصم وتاريخ البداية والنهاية مطلوبة'
      });
    }

    // Validate discount type
    if (!['percentage', 'fixed_amount'].includes(discount_type)) {
      return res.status(400).json({
        success: false,
        message: 'Discount type must be either percentage or fixed_amount',
        message_ar: 'نوع الخصم يجب أن يكون نسبة مئوية أو مبلغ ثابت'
      });
    }

    // Validate discount value
    if (discount_type === 'percentage' && (discount_value <= 0 || discount_value > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount must be between 1 and 100',
        message_ar: 'الخصم المئوي يجب أن يكون بين 1 و 100'
      });
    }

    if (discount_type === 'fixed_amount' && discount_value <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Fixed amount discount must be greater than 0',
        message_ar: 'المبلغ الثابت للخصم يجب أن يكون أكبر من صفر'
      });
    }

    // Validate dates
    const validFromDate = new Date(valid_from);
    const validUntilDate = new Date(valid_until);
    
    if (validFromDate >= validUntilDate) {
      return res.status(400).json({
        success: false,
        message: 'Valid until date must be after valid from date',
        message_ar: 'تاريخ انتهاء الصلاحية يجب أن يكون بعد تاريخ بداية الصلاحية'
      });
    }

    // Check if code already exists
    const [existingCode] = await executeQuery(
      'SELECT id FROM promo_codes WHERE code = ?',
      [code.toUpperCase()]
    );

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists',
        message_ar: 'كود الخصم موجود مسبقاً'
      });
    }

    // Create promo code - convert undefined to null for database
    const result = await executeQuery(`
      INSERT INTO promo_codes (
        code, title_ar, title_en, description_ar, description_en,
        discount_type, discount_value, min_order_amount, max_discount_amount,
        usage_limit, user_usage_limit, valid_from, valid_until, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code.toUpperCase(), 
      title_ar || null, 
      title_en || null, 
      description_ar || null, 
      description_en || null,
      discount_type, 
      discount_value, 
      min_order_amount || null, 
      max_discount_amount || null,
      usage_limit || null, 
      user_usage_limit || null, 
      valid_from, 
      valid_until, 
      is_active
    ]);

    // Get the created promo code
    const [newPromoCode] = await executeQuery(
      'SELECT * FROM promo_codes WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Promo code created successfully',
      message_ar: 'تم إنشاء كود الخصم بنجاح',
      data: newPromoCode
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists',
        message_ar: 'كود الخصم موجود مسبقاً'
      });
    }
    next(error);
  }
});

/**
 * @route   PUT /api/promos/:id
 * @desc    Update promo code
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, authorize('admin', 'staff'), validateId, validatePromoCode, async (req, res, next) => {
  try {
    const {
      code,
      title_ar,
      title_en,
      description_ar,
      description_en,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      usage_limit,
      user_usage_limit,
      valid_from,
      valid_until,
      is_active
    } = req.body;

    // Check if promo code exists
    const [existingPromo] = await executeQuery(
      'SELECT * FROM promo_codes WHERE id = ?',
      [req.params.id]
    );

    if (!existingPromo) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found',
        message_ar: 'كود الخصم غير موجود'
      });
    }

    // Validate discount type
    if (discount_type && !['percentage', 'fixed_amount'].includes(discount_type)) {
      return res.status(400).json({
        success: false,
        message: 'Discount type must be either percentage or fixed_amount',
        message_ar: 'نوع الخصم يجب أن يكون نسبة مئوية أو مبلغ ثابت'
      });
    }

    // Validate discount value
    const discountType = discount_type || existingPromo.discount_type;
    const discountValue = discount_value !== undefined ? discount_value : existingPromo.discount_value;

    if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount must be between 1 and 100',
        message_ar: 'الخصم المئوي يجب أن يكون بين 1 و 100'
      });
    }

    if (discountType === 'fixed_amount' && discountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Fixed amount discount must be greater than 0',
        message_ar: 'المبلغ الثابت للخصم يجب أن يكون أكبر من صفر'
      });
    }

    // Validate dates if provided
    if (valid_from && valid_until) {
      const validFromDate = new Date(valid_from);
      const validUntilDate = new Date(valid_until);
      
      if (validFromDate >= validUntilDate) {
        return res.status(400).json({
          success: false,
          message: 'Valid until date must be after valid from date',
          message_ar: 'تاريخ انتهاء الصلاحية يجب أن يكون بعد تاريخ بداية الصلاحية'
        });
      }
    }

    // Check if code already exists (excluding current promo)
    if (code && code !== existingPromo.code) {
      const [duplicateCode] = await executeQuery(
        'SELECT id FROM promo_codes WHERE code = ? AND id != ?',
        [code.toUpperCase(), req.params.id]
      );

      if (duplicateCode) {
        return res.status(400).json({
          success: false,
          message: 'Promo code already exists',
          message_ar: 'كود الخصم موجود مسبقاً'
        });
      }
    }

    // Update promo code
    const updateFields = [];
    const updateValues = [];

    if (code !== undefined) {
      updateFields.push('code = ?');
      updateValues.push(code.toUpperCase());
    }
    if (title_ar !== undefined) {
      updateFields.push('title_ar = ?');
      updateValues.push(title_ar || null);
    }
    if (title_en !== undefined) {
      updateFields.push('title_en = ?');
      updateValues.push(title_en || null);
    }
    if (description_ar !== undefined) {
      updateFields.push('description_ar = ?');
      updateValues.push(description_ar || null);
    }
    if (description_en !== undefined) {
      updateFields.push('description_en = ?');
      updateValues.push(description_en || null);
    }
    if (discount_type !== undefined) {
      updateFields.push('discount_type = ?');
      updateValues.push(discount_type);
    }
    if (discount_value !== undefined) {
      updateFields.push('discount_value = ?');
      updateValues.push(discount_value);
    }
    if (min_order_amount !== undefined) {
      updateFields.push('min_order_amount = ?');
      updateValues.push(min_order_amount || null);
    }
    if (max_discount_amount !== undefined) {
      updateFields.push('max_discount_amount = ?');
      updateValues.push(max_discount_amount || null);
    }
    if (usage_limit !== undefined) {
      updateFields.push('usage_limit = ?');
      updateValues.push(usage_limit || null);
    }
    if (user_usage_limit !== undefined) {
      updateFields.push('user_usage_limit = ?');
      updateValues.push(user_usage_limit || null);
    }
    if (valid_from !== undefined) {
      updateFields.push('valid_from = ?');
      updateValues.push(valid_from);
    }
    if (valid_until !== undefined) {
      updateFields.push('valid_until = ?');
      updateValues.push(valid_until);
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

    updateFields.push('updated_at = NOW()');
    updateValues.push(req.params.id);

    await executeQuery(
      `UPDATE promo_codes SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated promo code
    const [updatedPromo] = await executeQuery(
      'SELECT * FROM promo_codes WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Promo code updated successfully',
      message_ar: 'تم تحديث كود الخصم بنجاح',
      data: updatedPromo
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists',
        message_ar: 'كود الخصم موجود مسبقاً'
      });
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/promos/:id
 * @desc    Delete promo code (soft delete by default)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { hard_delete = false } = req.query;

    // Check if promo code exists
    const [existingPromo] = await executeQuery(
      'SELECT * FROM promo_codes WHERE id = ?',
      [req.params.id]
    );

    if (!existingPromo) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found',
        message_ar: 'كود الخصم غير موجود'
      });
    }

    // Check if promo code has been used
    const [usageCheck] = await executeQuery(
      'SELECT COUNT(*) as usage_count FROM promo_code_usages WHERE promo_code_id = ?',
      [req.params.id]
    );

    if (usageCheck.usage_count > 0 && hard_delete === 'true') {
      return res.status(400).json({
        success: false,
        message: 'Cannot hard delete promo code that has been used. Use soft delete instead.',
        message_ar: 'لا يمكن حذف كود خصم تم استخدامه نهائياً. استخدم الحذف المؤقت بدلاً من ذلك.'
      });
    }

    if (hard_delete === 'true') {
      // Hard delete - completely remove the record
      await executeQuery('DELETE FROM promo_codes WHERE id = ?', [req.params.id]);
    } else {
      // Soft delete - deactivate the promo code
      await executeQuery(
        'UPDATE promo_codes SET is_active = 0, updated_at = NOW() WHERE id = ?',
        [req.params.id]
      );
    }

    res.json({
      success: true,
      message: hard_delete === 'true' ? 'Promo code deleted permanently' : 'Promo code deactivated successfully',
      message_ar: hard_delete === 'true' ? 'تم حذف كود الخصم نهائياً' : 'تم إلغاء تفعيل كود الخصم بنجاح'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/promos/:id/toggle-status
 * @desc    Toggle promo code active status
 * @access  Private (Admin)
 */
router.post('/:id/toggle-status', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    // Check if promo code exists
    const [existingPromo] = await executeQuery(
      'SELECT * FROM promo_codes WHERE id = ?',
      [req.params.id]
    );

    if (!existingPromo) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found',
        message_ar: 'كود الخصم غير موجود'
      });
    }

    const newStatus = !existingPromo.is_active;

    await executeQuery(
      'UPDATE promo_codes SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, req.params.id]
    );

    res.json({
      success: true,
      message: `Promo code ${newStatus ? 'activated' : 'deactivated'} successfully`,
      message_ar: `تم ${newStatus ? 'تفعيل' : 'إلغاء تفعيل'} كود الخصم بنجاح`,
      data: { is_active: newStatus }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/promos/validate
 * @desc    Validate promo code for customer use
 * @access  Private (Customer/Admin)
 */
router.post('/validate', authenticate, validatePromoApplication, async (req, res, next) => {
  try {
    const { code, order_total = 0 } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required',
        message_ar: 'كود الخصم مطلوب'
      });
    }

    // Get promo code
    const [promo] = await executeQuery(`
      SELECT * FROM promo_codes 
      WHERE code = ? AND is_active = 1 
      AND valid_from <= NOW() AND valid_until >= NOW()
    `, [code.toUpperCase()]);

    if (!promo) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired promo code',
        message_ar: 'كود خصم غير صالح أو منتهي الصلاحية'
      });
    }

    // Check minimum order amount
    if (promo.min_order_amount && order_total < promo.min_order_amount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ${promo.min_order_amount} required for this promo code`,
        message_ar: `الحد الأدنى لقيمة الطلب ${promo.min_order_amount} مطلوب لهذا كود الخصم`
      });
    }

    // Check usage limits
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return res.status(400).json({
        success: false,
        message: 'Promo code usage limit exceeded',
        message_ar: 'تم تجاوز الحد الأقصى لاستخدام كود الخصم'
      });
    }

    // Check user usage limit
    if (promo.user_usage_limit) {
      const [userUsage] = await executeQuery(
        'SELECT COUNT(*) as count FROM promo_code_usages WHERE promo_code_id = ? AND user_id = ?',
        [promo.id, req.user.id]
      );

      if (userUsage.count >= promo.user_usage_limit) {
        return res.status(400).json({
          success: false,
          message: 'You have already used this promo code the maximum number of times',
          message_ar: 'لقد استخدمت هذا كود الخصم الحد الأقصى من المرات'
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.discount_type === 'percentage') {
      discountAmount = order_total * (promo.discount_value / 100);
    } else {
      discountAmount = promo.discount_value;
    }

    // Apply maximum discount limit
    if (promo.max_discount_amount && discountAmount > promo.max_discount_amount) {
      discountAmount = promo.max_discount_amount;
    }

    discountAmount = Math.min(discountAmount, order_total);

    res.json({
      success: true,
      message: 'Promo code is valid',
      message_ar: 'كود الخصم صالح',
      data: {
        promo_code: promo,
        discount_amount: discountAmount,
        final_total: Math.max(0, order_total - discountAmount)
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/promos/usage-report
 * @desc    Generate promo code usage report
 * @access  Private (Admin)
 */
router.get('/usage-report', authenticate, authorize('admin', 'staff'), validateDateRange, async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      promo_code_id,
      format = 'json'
    } = req.query;

    let whereConditions = [];
    let queryParams = [];

    if (start_date) {
      whereConditions.push('pcu.used_at >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('pcu.used_at <= ?');
      queryParams.push(end_date);
    }

    if (promo_code_id) {
      whereConditions.push('pcu.promo_code_id = ?');
      queryParams.push(promo_code_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const usageReport = await executeQuery(`
      SELECT 
        pc.code, pc.title_en, pc.discount_type, pc.discount_value,
        pcu.used_at, pcu.discount_amount,
        u.first_name, u.last_name, u.email, u.phone,
        o.order_number, o.total_amount, o.order_status
      FROM promo_code_usages pcu
      JOIN promo_codes pc ON pcu.promo_code_id = pc.id
      JOIN users u ON pcu.user_id = u.id
      JOIN orders o ON pcu.order_id = o.id
      ${whereClause}
      ORDER BY pcu.used_at DESC
    `, queryParams);

    const summary = await executeQuery(`
      SELECT 
        COUNT(*) as total_usages,
        COUNT(DISTINCT pcu.promo_code_id) as unique_codes_used,
        COUNT(DISTINCT pcu.user_id) as unique_users,
        SUM(pcu.discount_amount) as total_discount_given,
        AVG(pcu.discount_amount) as avg_discount_amount
      FROM promo_code_usages pcu
      JOIN promo_codes pc ON pcu.promo_code_id = pc.id
      JOIN orders o ON pcu.order_id = o.id
      ${whereClause}
    `, queryParams);

    if (format === 'csv') {
      // Convert to CSV format
      const csv = [
        'Code,Title,Type,Value,Used At,Discount Amount,Customer Name,Customer Email,Order Number,Order Total,Order Status',
        ...usageReport.map(row => 
          `${row.code},${row.title_en},${row.discount_type},${row.discount_value},${row.used_at},${row.discount_amount},"${row.first_name} ${row.last_name}",${row.email},${row.order_number},${row.total_amount},${row.order_status}`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="promo-usage-report.csv"');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: {
        summary: summary[0],
        usage_details: usageReport
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
