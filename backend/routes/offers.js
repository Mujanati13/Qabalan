const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');
const { uploadOfferImage } = require('../middleware/upload');

/**
 * @route   GET /api/offers
 * @desc    Get all offers with filtering and pagination
 * @access  Public
 */
router.get('/', validatePagination, async (req, res, next) => {
  console.log('🔄 Offers endpoint hit at:', new Date().toISOString());
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'active',
      type = 'all',
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereConditions = [];
    let queryParams = [];

    // Only show active offers for public access
    whereConditions.push('o.is_active = ?');
    whereConditions.push('o.valid_from <= NOW()');
    whereConditions.push('o.valid_until >= NOW()');
    queryParams.push(1); // For o.is_active = ?

    // Search filter
    if (search && search.trim() !== '') {
      whereConditions.push('(o.title LIKE ? OR o.description LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    // Type filter
    if (type !== 'all') {
      whereConditions.push('o.offer_type = ?');
      queryParams.push(type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate sort fields
    const allowedSortFields = ['created_at', 'title', 'discount_value', 'valid_until'];
    const sortField = allowedSortFields.includes(sort) ? `o.${sort}` : 'o.created_at';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM offers o
      ${whereClause}
    `;
    
    const [{ total }] = await executeQuery(countQuery, queryParams);

    // Get offers
    const limitParam = Number.isInteger(parseInt(limit)) ? parseInt(limit) : 10;
    const offsetParam = Number.isInteger(parseInt(offset)) ? parseInt(offset) : 0;
    const offersQuery = `
      SELECT 
        o.id, o.title, o.description, o.offer_type, o.discount_type,
        o.discount_value, o.min_order_amount, o.max_discount_amount,
        o.valid_from, o.valid_until, o.is_active, o.featured_image,
        o.usage_count, o.created_at, o.updated_at
      FROM offers o
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const offers = await executeQuery(offersQuery, queryParams);

    // Format offers with product information
    const formattedOffers = await Promise.all(offers.map(async (offer) => {
      let products = [];
      
      if (offer.product_ids) {
        const productIds = offer.product_ids.split(',');
        const productsQuery = `
          SELECT id, title_en as name, base_price as price, main_image as image_url
          FROM products 
          WHERE id IN (${productIds.map(() => '?').join(',')}) AND is_active = 1
        `;
        products = await executeQuery(productsQuery, productIds);
      }

      return {
        ...offer,
        product_ids: undefined,
        products: products || []
      };
    }));

    res.json({
      success: true,
      data: {
        offers: formattedOffers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/offers/admin
 * @desc    Get all offers for admin with filtering and pagination (includes inactive)
 * @access  Private (Admin/Staff)
 */
router.get('/admin', authenticate, authorize('admin', 'staff'), validatePagination, async (req, res, next) => {
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
    
    let whereConditions = [];
    let queryParams = [];

    // Search filter
    if (search && search.trim() !== '') {
      whereConditions.push('(o.title LIKE ? OR o.description LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    // Status filter (admin can see all statuses)
    if (status !== 'all') {
      switch (status) {
        case 'active':
          whereConditions.push('o.is_active = 1 AND o.valid_from <= NOW() AND o.valid_until >= NOW()');
          break;
        case 'inactive':
          whereConditions.push('o.is_active = 0');
          break;
        case 'expired':
          whereConditions.push('o.valid_until < NOW()');
          break;
        case 'upcoming':
          whereConditions.push('o.valid_from > NOW()');
          break;
      }
    }

    // Type filter
    if (type !== 'all') {
      whereConditions.push('o.offer_type = ?');
      queryParams.push(type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate sort fields
    const validSortFields = ['id', 'title', 'created_at', 'valid_from', 'valid_until', 'usage_count'];
    const validOrders = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM offers o ${whereClause}`;
    const [{ total }] = await executeQuery(countQuery, queryParams);

    // Get offers
    const limitParam = Number.isInteger(parseInt(limit)) ? parseInt(limit) : 10;
    const offsetParam = Number.isInteger(parseInt(offset)) ? parseInt(offset) : 0;
    const offersQuery = `
      SELECT 
        o.id, o.title, o.description, o.offer_type, o.discount_type,
        o.discount_value, o.min_order_amount, o.max_discount_amount,
        o.valid_from, o.valid_until, o.is_active, o.featured_image,
        o.usage_count, o.created_at, o.updated_at
      FROM offers o
      ${whereClause}
      ORDER BY o.${sortField} ${sortOrder}
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    // Always add limit and offset as the last parameters
    const offers = await executeQuery(offersQuery, queryParams);

    // Format offers with product information
    const formattedOffers = await Promise.all(offers.map(async (offer) => {
      let products = [];
      
      // Get products for this offer from offer_products table
      const productsQuery = `
        SELECT p.id, p.title_en, p.title_ar, p.base_price, p.sale_price,
               COALESCE(p.sale_price, p.base_price) as final_price, p.main_image
        FROM products p
        INNER JOIN offer_products op ON p.id = op.product_id
        WHERE op.offer_id = ? AND p.is_active = 1
      `;
      products = await executeQuery(productsQuery, [offer.id]);

      return {
        ...offer,
        products: products || []
      };
    }));

    res.json({
      success: true,
      data: formattedOffers,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/offers/:id
 * @desc    Get specific offer by ID
 * @access  Public
 */
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get offer details
    const offerQuery = `
      SELECT 
        o.id, o.title, o.description, o.offer_type, o.discount_type,
        o.discount_value, o.min_order_amount, o.max_discount_amount,
        o.valid_from, o.valid_until, o.is_active, o.featured_image,
        o.usage_count, o.created_at, o.updated_at
      FROM offers o
      WHERE o.id = ? AND o.is_active = 1
    `;

    const [offer] = await executeQuery(offerQuery, [id]);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or inactive'
      });
    }

    // Check if offer is still valid
    const now = new Date();
    const validFrom = new Date(offer.valid_from);
    const validUntil = new Date(offer.valid_until);

    if (now < validFrom || now > validUntil) {
      return res.status(410).json({
        success: false,
        message: 'Offer has expired or not yet active'
      });
    }

    // Get associated products
    const productsQuery = `
      SELECT 
        p.id, p.title_en as name, p.description_en as description,
        p.base_price as price, p.main_image as image_url,
        ROUND(p.base_price * (1 - o.discount_value / 100), 2) as offer_price
      FROM products p
      INNER JOIN offer_products op ON p.id = op.product_id
      INNER JOIN offers o ON op.offer_id = o.id
      WHERE o.id = ? AND p.is_active = 1
    `;

    const products = await executeQuery(productsQuery, [id]);

    // Get offer features and terms (if stored in separate tables)
    const featuresQuery = `
      SELECT feature_text
      FROM offer_features
      WHERE offer_id = ?
      ORDER BY sort_order
    `;

    const termsQuery = `
      SELECT term_text
      FROM offer_terms
      WHERE offer_id = ?
      ORDER BY sort_order
    `;

    let features = [];
    let terms = [];

    try {
      features = await executeQuery(featuresQuery, [id]);
      terms = await executeQuery(termsQuery, [id]);
    } catch (error) {
      // Tables might not exist yet, use default values
      features = [
        { feature_text: 'Premium quality ingredients' },
        { feature_text: 'Handcrafted by expert bakers' },
        { feature_text: 'Fresh daily preparation' },
        { feature_text: 'Free delivery on orders over $50' }
      ];
      terms = [
        { term_text: 'Offer valid for limited time only' },
        { term_text: 'Cannot be combined with other offers' },
        { term_text: 'Subject to availability' },
        { term_text: 'Free delivery within city limits' }
      ];
    }

    // Format the response
    const formattedOffer = {
      ...offer,
      products: products || [],
      features: features.map(f => f.feature_text),
      terms: terms.map(t => t.term_text),
      // Calculate savings
      originalPrice: products.reduce((sum, p) => sum + parseFloat(p.price), 0),
      offerPrice: products.reduce((sum, p) => sum + parseFloat(p.offer_price || p.price), 0)
    };

    // Track offer view
    try {
      await executeQuery(
        'UPDATE offers SET usage_count = usage_count + 1 WHERE id = ?',
        [id]
      );
    } catch (error) {
      console.error('Error updating usage count:', error);
    }

    res.json({
      success: true,
      data: formattedOffer
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/offers
 * @desc    Create new offer
 * @access  Private (Admin/Staff)
 */
router.post('/', authenticate, authorize('admin', 'staff'), uploadOfferImage, async (req, res, next) => {
  try {
    let {
      title,
      description,
      offer_type,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      valid_from,
      valid_until,
      products = [],
      features = [],
      terms = []
    } = req.body;

    console.log('🔄 Creating offer with data:', req.body);
    console.log('📦 Products received:', products, 'Type:', typeof products);

    // Parse JSON strings if they come from FormData
    if (typeof products === 'string') {
      try {
        products = JSON.parse(products);
        console.log('📦 Products parsed from JSON:', products);
      } catch (e) {
        console.log('❌ Failed to parse products JSON:', e);
        products = [];
      }
    }
    if (typeof features === 'string') {
      try {
        features = JSON.parse(features);
      } catch (e) {
        features = [];
      }
    }
    if (typeof terms === 'string') {
      try {
        terms = JSON.parse(terms);
      } catch (e) {
        terms = [];
      }
    }

    console.log('📦 Final products array:', products, 'Length:', products.length);

    // Handle uploaded image
    let featured_image = null;
    if (req.uploadedImage) {
      featured_image = req.uploadedImage.url;
    }

    // Validate required fields
    if (!title || !description || !discount_type || !discount_value || !valid_from || !valid_until) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Ensure undefined values are converted to null for MySQL
    const safeOfferType = offer_type || null;
    const safeMinOrderAmount = min_order_amount !== undefined ? min_order_amount : null;
    const safeMaxDiscountAmount = max_discount_amount !== undefined ? max_discount_amount : null;

    // Create offer
    const insertQuery = `
      INSERT INTO offers (
        title, description, offer_type, discount_type, discount_value,
        min_order_amount, max_discount_amount, valid_from, valid_until,
        featured_image, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `;

    const result = await executeQuery(insertQuery, [
      title, description, safeOfferType, discount_type, discount_value,
      safeMinOrderAmount, safeMaxDiscountAmount, valid_from, valid_until, featured_image
    ]);

    const offerId = result.insertId;
    console.log('✅ Offer created with ID:', offerId);

    // Add associated products
    if (products.length > 0) {
      console.log('📦 Inserting products:', products);
      const productInserts = products.map(productId => [offerId, productId]);
      console.log('📦 Product inserts array:', productInserts);
      const placeholders = productInserts.map(() => '(?, ?)').join(', ');
      const productQuery = `
        INSERT INTO offer_products (offer_id, product_id) VALUES ${placeholders}
      `;
      console.log('📦 Product query:', productQuery);
      const flatValues = productInserts.flat();
      console.log('📦 Flat values:', flatValues);
      const productResult = await executeQuery(productQuery, flatValues);
      console.log('✅ Products inserted successfully:', productResult);
    } else {
      console.log('⚠️ No products to insert');
    }

    // Add features
    if (features.length > 0) {
      const featureInserts = features.map((feature, index) => [offerId, feature, index]);
      const placeholders = featureInserts.map(() => '(?, ?, ?)').join(', ');
      const featureQuery = `
        INSERT INTO offer_features (offer_id, feature_text, sort_order) VALUES ${placeholders}
      `;
      const flatValues = featureInserts.flat();
      await executeQuery(featureQuery, flatValues);
    }

    // Add terms
    if (terms.length > 0) {
      const termInserts = terms.map((term, index) => [offerId, term, index]);
      const placeholders = termInserts.map(() => '(?, ?, ?)').join(', ');
      const termQuery = `
        INSERT INTO offer_terms (offer_id, term_text, sort_order) VALUES ${placeholders}
      `;
      const flatValues = termInserts.flat();
      await executeQuery(termQuery, flatValues);
    }

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: { id: offerId }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/offers/:id
 * @desc    Update existing offer
 * @access  Private (Admin/Staff)
 */
router.put('/:id', authenticate, authorize('admin', 'staff'), validateId, uploadOfferImage, async (req, res, next) => {
  try {
    const { id } = req.params;
    let {
      title,
      description,
      offer_type,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      valid_from,
      valid_until,
      is_active,
      products = [],
      features = [],
      terms = []
    } = req.body;

    // Parse JSON strings if they come from FormData
    if (typeof products === 'string') {
      try {
        products = JSON.parse(products);
      } catch (e) {
        products = [];
      }
    }
    if (typeof features === 'string') {
      try {
        features = JSON.parse(features);
      } catch (e) {
        features = [];
      }
    }
    if (typeof terms === 'string') {
      try {
        terms = JSON.parse(terms);
      } catch (e) {
        terms = [];
      }
    }

    // Check if offer exists
    const [existingOffer] = await executeQuery('SELECT id, featured_image FROM offers WHERE id = ?', [id]);
    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Handle uploaded image
    let featured_image = existingOffer.featured_image; // Keep existing image by default
    if (req.uploadedImage) {
      featured_image = req.uploadedImage.url;
    }

    // Ensure undefined values are converted to null for MySQL
    const safeOfferType = offer_type || null;
    const safeMinOrderAmount = min_order_amount !== undefined ? min_order_amount : null;
    const safeMaxDiscountAmount = max_discount_amount !== undefined ? max_discount_amount : null;
    const safeIsActive = is_active !== undefined ? is_active : 1;

    // Update offer
    const updateQuery = `
      UPDATE offers SET
        title = ?, description = ?, offer_type = ?, discount_type = ?,
        discount_value = ?, min_order_amount = ?, max_discount_amount = ?,
        valid_from = ?, valid_until = ?, featured_image = ?, is_active = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      title, description, safeOfferType, discount_type, discount_value,
      safeMinOrderAmount, safeMaxDiscountAmount, valid_from, valid_until,
      featured_image, safeIsActive, id
    ]);

    // Update associated products
    await executeQuery('DELETE FROM offer_products WHERE offer_id = ?', [id]);
    if (products.length > 0) {
      const productInserts = products.map(productId => [id, productId]);
      const placeholders = productInserts.map(() => '(?, ?)').join(', ');
      const productQuery = `INSERT INTO offer_products (offer_id, product_id) VALUES ${placeholders}`;
      const flatValues = productInserts.flat();
      await executeQuery(productQuery, flatValues);
    }

    // Update features
    await executeQuery('DELETE FROM offer_features WHERE offer_id = ?', [id]);
    if (features.length > 0) {
      const featureInserts = features.map((feature, index) => [id, feature, index]);
      const placeholders = featureInserts.map(() => '(?, ?, ?)').join(', ');
      const featureQuery = `INSERT INTO offer_features (offer_id, feature_text, sort_order) VALUES ${placeholders}`;
      const flatValues = featureInserts.flat();
      await executeQuery(featureQuery, flatValues);
    }

    // Update terms
    await executeQuery('DELETE FROM offer_terms WHERE offer_id = ?', [id]);
    if (terms.length > 0) {
      const termInserts = terms.map((term, index) => [id, term, index]);
      const placeholders = termInserts.map(() => '(?, ?, ?)').join(', ');
      const termQuery = `INSERT INTO offer_terms (offer_id, term_text, sort_order) VALUES ${placeholders}`;
      const flatValues = termInserts.flat();
      await executeQuery(termQuery, flatValues);
    }

    res.json({
      success: true,
      message: 'Offer updated successfully'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/offers/:id
 * @desc    Delete offer
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, authorize('admin'), validateId, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if offer exists
    const [existingOffer] = await executeQuery('SELECT id FROM offers WHERE id = ?', [id]);
    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Delete associated data
    await executeQuery('DELETE FROM offer_products WHERE offer_id = ?', [id]);
    await executeQuery('DELETE FROM offer_features WHERE offer_id = ?', [id]);
    await executeQuery('DELETE FROM offer_terms WHERE offer_id = ?', [id]);
    
    // Delete offer
    await executeQuery('DELETE FROM offers WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Offer deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
