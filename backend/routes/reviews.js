const express = require('express');
const multer = require('multer');
const path = require('path');
const { executeQuery, executeTransaction } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');
const { body, validationResult, query } = require('express-validator');

const router = express.Router();

// Configure multer for review image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/reviews/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 images per review
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

const validateReviewData = [
  body('product_id')
    .isInt({ min: 1 })
    .withMessage('Valid product ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  body('review_text')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Review text must not exceed 2000 characters'),
  body('pros')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Pros must not exceed 1000 characters'),
  body('cons')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Cons must not exceed 1000 characters'),
  body('order_item_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid order item ID is required'),
];

const validateVoteData = [
  body('vote_type')
    .isIn(['helpful', 'not_helpful'])
    .withMessage('Vote type must be either helpful or not_helpful'),
];

const validateReviewFilters = [
  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating filter must be between 1 and 5'),
  query('verified_only')
    .optional()
    .isBoolean()
    .withMessage('Verified only must be a boolean'),
  query('sort_by')
    .optional()
    .isIn(['newest', 'oldest', 'highest_rated', 'lowest_rated', 'most_helpful'])
    .withMessage('Invalid sort option'),
];

// =============================================================================
// PRODUCT REVIEW ROUTES
// =============================================================================

/**
 * @route   GET /api/reviews/products/:productId
 * @desc    Get reviews for a specific product
 * @access  Public
 */
router.get('/products/:productId', 
  validateId, 
  validatePagination, 
  validateReviewFilters,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { productId } = req.params;
      const { 
        page = 1, 
        limit = 10, 
        rating,
        verified_only,
        sort_by = 'newest'
      } = req.query;

      const offset = (page - 1) * limit;

      // Build WHERE conditions
      let whereConditions = ['pr.product_id = ?', 'pr.is_approved = 1'];
      let queryParams = [productId];

      if (rating) {
        whereConditions.push('pr.rating = ?');
        queryParams.push(rating);
      }

      if (verified_only === 'true') {
        whereConditions.push('pr.is_verified_purchase = 1');
      }

      // Build ORDER BY clause
      let orderBy = 'pr.created_at DESC';
      switch (sort_by) {
        case 'oldest':
          orderBy = 'pr.created_at ASC';
          break;
        case 'highest_rated':
          orderBy = 'pr.rating DESC, pr.created_at DESC';
          break;
        case 'lowest_rated':
          orderBy = 'pr.rating ASC, pr.created_at DESC';
          break;
        case 'most_helpful':
          orderBy = 'pr.helpful_count DESC, pr.created_at DESC';
          break;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get reviews with user info and images
      const reviewsQuery = `
        SELECT 
          pr.*,
          u.first_name,
          u.last_name,
          u.avatar,
          GROUP_CONCAT(
            DISTINCT CONCAT(ri.id, ':', ri.image_url, ':', COALESCE(ri.alt_text, ''))
            ORDER BY ri.sort_order
            SEPARATOR '||'
          ) as review_images,
          o.order_number,
          oi.created_at as purchase_date
        FROM product_reviews pr
        LEFT JOIN users u ON pr.user_id = u.id
        LEFT JOIN review_images ri ON pr.id = ri.review_id AND ri.is_active = 1
        LEFT JOIN orders o ON pr.order_id = o.id
        LEFT JOIN order_items oi ON pr.order_item_id = oi.id
        WHERE ${whereClause}
        GROUP BY pr.id
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM product_reviews pr
        WHERE ${whereClause}
      `;

      const [reviews] = await executeQuery(reviewsQuery, [...queryParams, parseInt(limit), offset]);
      const [countResult] = await executeQuery(countQuery, queryParams);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      // Process review images
      const processedReviews = reviews.map(review => {
        const images = [];
        if (review.review_images) {
          review.review_images.split('||').forEach(imageData => {
            const [id, url, altText] = imageData.split(':');
            if (id && url) {
              images.push({
                id: parseInt(id),
                image_url: url,
                alt_text: altText || null
              });
            }
          });
        }

        return {
          ...review,
          review_images: images,
          reviewer_name: `${review.first_name} ${review.last_name}`,
          is_verified_purchase: Boolean(review.is_verified_purchase),
          is_featured: Boolean(review.is_featured)
        };
      });

      res.json({
        success: true,
        data: {
          reviews: processedReviews,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_items: total,
            items_per_page: parseInt(limit),
            has_next_page: page < totalPages,
            has_prev_page: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Get product reviews error:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/reviews/products/:productId/summary
 * @desc    Get rating summary for a product
 * @access  Public
 */
router.get('/products/:productId/summary', validateId, async (req, res, next) => {
  try {
    const { productId } = req.params;

    const query = `
      SELECT 
        prs.*,
        p.title_en as product_title,
        p.average_rating as product_avg_rating,
        p.total_reviews as product_total_reviews
      FROM product_rating_summary prs
      LEFT JOIN products p ON prs.product_id = p.id
      WHERE prs.product_id = ?
    `;

    const [result] = await executeQuery(query, [productId]);

    if (result.length === 0) {
      return res.json({
        success: true,
        data: {
          product_id: parseInt(productId),
          total_reviews: 0,
          average_rating: 0,
          rating_distribution: {
            rating_5: 0,
            rating_4: 0,
            rating_3: 0,
            rating_2: 0,
            rating_1: 0
          },
          verified_purchase_count: 0,
          featured_review_count: 0,
          last_review_at: null
        }
      });
    }

    const summary = result[0];

    res.json({
      success: true,
      data: {
        product_id: summary.product_id,
        total_reviews: summary.total_reviews,
        average_rating: parseFloat(summary.average_rating),
        rating_distribution: {
          rating_5: summary.rating_5_count,
          rating_4: summary.rating_4_count,
          rating_3: summary.rating_3_count,
          rating_2: summary.rating_2_count,
          rating_1: summary.rating_1_count
        },
        verified_purchase_count: summary.verified_purchase_count,
        featured_review_count: summary.featured_review_count,
        last_review_at: summary.last_review_at,
        product_title: summary.product_title
      }
    });

  } catch (error) {
    console.error('Get product rating summary error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/reviews/products/:productId
 * @desc    Create a new product review
 * @access  Private
 */
router.post('/products/:productId', 
  authenticate,
  upload.array('images', 5),
  validateId,
  validateReviewData,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { productId } = req.params;
      const userId = req.user.id;
      const {
        rating,
        title,
        review_text,
        pros,
        cons,
        order_item_id
      } = req.body;

      // Check if product exists
      const [productCheck] = await executeQuery(
        'SELECT id FROM products WHERE id = ? AND is_active = 1',
        [productId]
      );

      if (productCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Check if user already reviewed this product (for this order item if specified)
      let existingReviewQuery = 'SELECT id FROM product_reviews WHERE user_id = ? AND product_id = ?';
      let existingReviewParams = [userId, productId];

      if (order_item_id) {
        existingReviewQuery += ' AND order_item_id = ?';
        existingReviewParams.push(order_item_id);
      }

      const [existingReview] = await executeQuery(existingReviewQuery, existingReviewParams);

      if (existingReview.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You have already reviewed this product'
        });
      }

      // Verify purchase if order_item_id is provided
      let orderId = null;
      let isVerifiedPurchase = false;

      if (order_item_id) {
        const [orderItemCheck] = await executeQuery(`
          SELECT oi.order_id, o.user_id, o.order_status
          FROM order_items oi
          LEFT JOIN orders o ON oi.order_id = o.id
          WHERE oi.id = ? AND oi.product_id = ? AND o.user_id = ?
        `, [order_item_id, productId, userId]);

        if (orderItemCheck.length > 0) {
          orderId = orderItemCheck[0].order_id;
          isVerifiedPurchase = ['delivered', 'completed'].includes(orderItemCheck[0].order_status);
        }
      }

      await executeTransaction(async (connection) => {
        // Insert review
        const [reviewResult] = await connection.execute(`
          INSERT INTO product_reviews (
            product_id, user_id, order_id, order_item_id, rating, title, 
            review_text, pros, cons, is_verified_purchase, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          productId, userId, orderId, order_item_id || null, rating,
          title || null, review_text || null, pros || null, cons || null,
          isVerifiedPurchase ? 1 : 0
        ]);

        const reviewId = reviewResult.insertId;

        // Process uploaded images
        if (req.files && req.files.length > 0) {
          for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const imageUrl = `/uploads/reviews/${file.filename}`;
            
            await connection.execute(`
              INSERT INTO review_images (review_id, image_url, sort_order, created_at)
              VALUES (?, ?, ?, NOW())
            `, [reviewId, imageUrl, i]);
          }
        }

        return reviewId;
      });

      res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: {
          review_id: await executeTransaction(async (connection) => {
            const [result] = await connection.execute(
              'SELECT LAST_INSERT_ID() as id'
            );
            return result[0].id;
          })
        }
      });

    } catch (error) {
      console.error('Create product review error:', error);
      next(error);
    }
  }
);

/**
 * @route   PUT /api/reviews/:reviewId
 * @desc    Update a product review
 * @access  Private (review owner only)
 */
router.put('/:reviewId',
  authenticate,
  upload.array('images', 5),
  validateId,
  validateReviewData,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { reviewId } = req.params;
      const userId = req.user.id;
      const {
        rating,
        title,
        review_text,
        pros,
        cons,
        remove_images = []
      } = req.body;

      // Check if review exists and belongs to user
      const [reviewCheck] = await executeQuery(
        'SELECT id, product_id, user_id FROM product_reviews WHERE id = ? AND user_id = ?',
        [reviewId, userId]
      );

      if (reviewCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Review not found or you are not authorized to edit it'
        });
      }

      await executeTransaction(async (connection) => {
        // Update review
        await connection.execute(`
          UPDATE product_reviews 
          SET rating = ?, title = ?, review_text = ?, pros = ?, cons = ?, updated_at = NOW()
          WHERE id = ?
        `, [rating, title || null, review_text || null, pros || null, cons || null, reviewId]);

        // Remove specified images
        if (remove_images.length > 0) {
          const placeholders = remove_images.map(() => '?').join(',');
          await connection.execute(
            `DELETE FROM review_images WHERE review_id = ? AND id IN (${placeholders})`,
            [reviewId, ...remove_images]
          );
        }

        // Add new images
        if (req.files && req.files.length > 0) {
          // Get current max sort_order
          const [maxSort] = await connection.execute(
            'SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM review_images WHERE review_id = ?',
            [reviewId]
          );
          
          let sortOrder = maxSort[0].max_sort + 1;

          for (const file of req.files) {
            const imageUrl = `/uploads/reviews/${file.filename}`;
            
            await connection.execute(`
              INSERT INTO review_images (review_id, image_url, sort_order, created_at)
              VALUES (?, ?, ?, NOW())
            `, [reviewId, imageUrl, sortOrder++]);
          }
        }
      });

      res.json({
        success: true,
        message: 'Review updated successfully'
      });

    } catch (error) {
      console.error('Update product review error:', error);
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/reviews/:reviewId
 * @desc    Delete a product review
 * @access  Private (review owner or admin)
 */
router.delete('/:reviewId', authenticate, validateId, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const userType = req.user.user_type;

    // Check if review exists and user has permission
    let checkQuery = 'SELECT id, user_id FROM product_reviews WHERE id = ?';
    let checkParams = [reviewId];

    if (userType !== 'admin') {
      checkQuery += ' AND user_id = ?';
      checkParams.push(userId);
    }

    const [reviewCheck] = await executeQuery(checkQuery, checkParams);

    if (reviewCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you are not authorized to delete it'
      });
    }

    // Delete review (cascade will handle related data)
    await executeQuery('DELETE FROM product_reviews WHERE id = ?', [reviewId]);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete product review error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/reviews/:reviewId/vote
 * @desc    Vote on review helpfulness
 * @access  Private
 */
router.post('/:reviewId/vote',
  authenticate,
  validateId,
  validateVoteData,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { reviewId } = req.params;
      const userId = req.user.id;
      const { vote_type } = req.body;

      // Check if review exists
      const [reviewCheck] = await executeQuery(
        'SELECT id, user_id FROM product_reviews WHERE id = ?',
        [reviewId]
      );

      if (reviewCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      // Don't allow voting on own review
      if (reviewCheck[0].user_id === userId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot vote on your own review'
        });
      }

      // Insert or update vote
      await executeQuery(`
        INSERT INTO review_votes (review_id, user_id, vote_type, created_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type)
      `, [reviewId, userId, vote_type]);

      res.json({
        success: true,
        message: 'Vote recorded successfully'
      });

    } catch (error) {
      console.error('Vote on review error:', error);
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/reviews/:reviewId/vote
 * @desc    Remove vote from review
 * @access  Private
 */
router.delete('/:reviewId/vote', authenticate, validateId, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    await executeQuery(
      'DELETE FROM review_votes WHERE review_id = ? AND user_id = ?',
      [reviewId, userId]
    );

    res.json({
      success: true,
      message: 'Vote removed successfully'
    });

  } catch (error) {
    console.error('Remove vote error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/reviews/user/my-reviews
 * @desc    Get current user's reviews
 * @access  Private
 */
router.get('/user/my-reviews', 
  authenticate, 
  validatePagination,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const query = `
        SELECT 
          pr.*,
          p.title_en as product_title,
          p.title_ar as product_title_ar,
          p.main_image as product_image,
          p.slug as product_slug,
          GROUP_CONCAT(
            DISTINCT CONCAT(ri.id, ':', ri.image_url, ':', COALESCE(ri.alt_text, ''))
            ORDER BY ri.sort_order
            SEPARATOR '||'
          ) as review_images
        FROM product_reviews pr
        LEFT JOIN products p ON pr.product_id = p.id
        LEFT JOIN review_images ri ON pr.id = ri.review_id AND ri.is_active = 1
        WHERE pr.user_id = ?
        GROUP BY pr.id
        ORDER BY pr.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [reviews] = await executeQuery(query, [userId, parseInt(limit), offset]);

      // Get total count
      const [countResult] = await executeQuery(
        'SELECT COUNT(*) as total FROM product_reviews WHERE user_id = ?',
        [userId]
      );

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      // Process review images
      const processedReviews = reviews.map(review => {
        const images = [];
        if (review.review_images) {
          review.review_images.split('||').forEach(imageData => {
            const [id, url, altText] = imageData.split(':');
            if (id && url) {
              images.push({
                id: parseInt(id),
                image_url: url,
                alt_text: altText || null
              });
            }
          });
        }

        return {
          ...review,
          review_images: images,
          is_verified_purchase: Boolean(review.is_verified_purchase),
          is_featured: Boolean(review.is_featured)
        };
      });

      res.json({
        success: true,
        data: {
          reviews: processedReviews,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_items: total,
            items_per_page: parseInt(limit),
            has_next_page: page < totalPages,
            has_prev_page: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Get user reviews error:', error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/reviews/user/reviewable-orders
 * @desc    Get user's delivered orders that can be reviewed
 * @access  Private
 */
router.get('/user/reviewable-orders', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        oi.id as order_item_id,
        oi.order_id,
        oi.product_id,
        oi.quantity,
        oi.unit_price,
        o.order_number,
        o.delivered_at,
        p.title_en as product_title,
        p.title_ar as product_title_ar,
        p.main_image as product_image,
        p.slug as product_slug,
        pr.id as existing_review_id
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_reviews pr ON pr.order_item_id = oi.id AND pr.user_id = ?
      WHERE o.user_id = ? 
        AND o.order_status IN ('delivered', 'completed')
        AND pr.id IS NULL
        AND p.is_active = 1
      ORDER BY o.delivered_at DESC, oi.id DESC
    `;

    const [orderItems] = await executeQuery(query, [userId, userId]);

    res.json({
      success: true,
      data: {
        reviewable_items: orderItems
      }
    });

  } catch (error) {
    console.error('Get reviewable orders error:', error);
    next(error);
  }
});

module.exports = router;
