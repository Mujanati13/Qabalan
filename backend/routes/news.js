const express = require('express');
const router = express.Router();
const { executeQuery, getPaginatedResults } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');

/**
 * @route   GET /api/news
 * @desc    Get all published news articles with pagination
 * @access  Public
 */
router.get('/', validatePagination, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search,
      featured_only = false
    } = req.query;

    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 50);

    let whereConditions = ['is_published = 1', 'published_at <= NOW()'];
    let queryParams = [];

    // Category filter
    if (category) {
      whereConditions.push('category = ?');
      queryParams.push(category);
    }

    // Search filter
    if (search && search.trim() !== '') {
      whereConditions.push('(title_en LIKE ? OR title_ar LIKE ? OR excerpt_en LIKE ? OR excerpt_ar LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Featured only filter
    if (featured_only === 'true') {
      whereConditions.push('is_featured = 1');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT 
        id, title_ar, title_en, excerpt_ar, excerpt_en, 
        featured_image, category, is_featured, 
        published_at, created_at, slug,
        author_name, reading_time_minutes
      FROM news_articles
      ${whereClause}
      ORDER BY is_featured DESC, published_at DESC
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
 * @route   GET /api/news/featured
 * @desc    Get featured news articles for homepage
 * @access  Public
 */
router.get('/featured', async (req, res, next) => {
  try {
    const { limit = 3 } = req.query;
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 10);

    const featuredNews = await executeQuery(`
      SELECT 
        id, title_ar, title_en, excerpt_ar, excerpt_en, 
        featured_image, category, published_at, slug,
        author_name, reading_time_minutes
      FROM news_articles
      WHERE is_published = 1 AND is_featured = 1 AND published_at <= NOW()
      ORDER BY published_at DESC
      LIMIT ?
    `, [validatedLimit]);

    res.json({
      success: true,
      data: featuredNews
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/news/categories
 * @desc    Get news categories
 * @access  Public
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await executeQuery(`
      SELECT DISTINCT category
      FROM news_articles
      WHERE is_published = 1 AND category IS NOT NULL AND category != ''
      ORDER BY category ASC
    `);

    res.json({
      success: true,
      data: categories.map(cat => cat.category)
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/news/:id
 * @desc    Get single news article by ID or slug
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if ID is numeric (ID) or string (slug)
    const isNumeric = /^\d+$/.test(id);
    const whereClause = isNumeric ? 'id = ?' : 'slug = ?';
    
    const [article] = await executeQuery(`
      SELECT 
        id, title_ar, title_en, excerpt_ar, excerpt_en,
        content_ar, content_en, featured_image, category,
        is_featured, published_at, created_at, updated_at,
        slug, author_name, author_bio, reading_time_minutes,
        tags, meta_description_ar, meta_description_en
      FROM news_articles
      WHERE ${whereClause} AND is_published = 1 AND published_at <= NOW()
    `, [id]);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    // Parse tags if they exist
    if (article.tags) {
      try {
        article.tags = JSON.parse(article.tags);
      } catch (e) {
        article.tags = [];
      }
    } else {
      article.tags = [];
    }

    // Get related articles
    const relatedArticles = await executeQuery(`
      SELECT 
        id, title_ar, title_en, excerpt_ar, excerpt_en,
        featured_image, category, published_at, slug,
        author_name, reading_time_minutes
      FROM news_articles
      WHERE category = ? AND id != ? AND is_published = 1 AND published_at <= NOW()
      ORDER BY published_at DESC
      LIMIT 3
    `, [article.category, article.id]);

    // Increment view count
    await executeQuery(`
      UPDATE news_articles 
      SET view_count = view_count + 1 
      WHERE id = ?
    `, [article.id]);

    res.json({
      success: true,
      data: {
        article,
        related_articles: relatedArticles
      }
    });

  } catch (error) {
    next(error);
  }
});

// =============================================================================
// ADMIN ROUTES
// =============================================================================

/**
 * @route   GET /api/news/admin/all
 * @desc    Get all news articles for admin (including unpublished)
 * @access  Private (Admin/Staff)
 */
router.get('/admin/all', authenticate, authorize('admin', 'staff'), validatePagination, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all',
      category,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(Math.max(1, parseInt(limit)), 100);

    let whereConditions = [];
    let queryParams = [];

    // Status filter
    if (status !== 'all') {
      switch (status) {
        case 'published':
          whereConditions.push('is_published = 1 AND published_at <= NOW()');
          break;
        case 'draft':
          whereConditions.push('is_published = 0');
          break;
        case 'scheduled':
          whereConditions.push('is_published = 1 AND published_at > NOW()');
          break;
      }
    }

    // Category filter
    if (category) {
      whereConditions.push('category = ?');
      queryParams.push(category);
    }

    // Search filter
    if (search && search.trim() !== '') {
      whereConditions.push('(title_en LIKE ? OR title_ar LIKE ? OR content_en LIKE ? OR content_ar LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sort parameters
    const validSortFields = ['created_at', 'published_at', 'title_en', 'category', 'view_count'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT 
        id, title_ar, title_en, excerpt_ar, excerpt_en,
        featured_image, category, is_published, is_featured,
        published_at, created_at, updated_at, slug,
        author_name, reading_time_minutes, view_count
      FROM news_articles
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
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
 * @route   POST /api/news/admin
 * @desc    Create new news article
 * @access  Private (Admin/Staff)
 */
router.post('/admin', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const {
      title_ar,
      title_en,
      excerpt_ar,
      excerpt_en,
      content_ar,
      content_en,
      featured_image,
      category,
      is_published = false,
      is_featured = false,
      published_at,
      slug,
      author_name,
      author_bio,
      tags = [],
      meta_description_ar,
      meta_description_en,
      reading_time_minutes = 5
    } = req.body;

    // Validate required fields
    if (!title_en || !content_en) {
      return res.status(400).json({
        success: false,
        message: 'Title and content in English are required'
      });
    }

    // Generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = title_en.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100);
      
      // Check if slug exists and make it unique
      const [existingSlug] = await executeQuery('SELECT id FROM news_articles WHERE slug = ?', [finalSlug]);
      if (existingSlug) {
        finalSlug = `${finalSlug}-${Date.now()}`;
      }
    }

    // Set published_at if publishing now
    let finalPublishedAt = published_at;
    if (is_published && !finalPublishedAt) {
      finalPublishedAt = new Date();
    }

    const result = await executeQuery(`
      INSERT INTO news_articles (
        title_ar, title_en, excerpt_ar, excerpt_en,
        content_ar, content_en, featured_image, category,
        is_published, is_featured, published_at, slug,
        author_name, author_bio, tags, meta_description_ar,
        meta_description_en, reading_time_minutes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      title_ar || null,
      title_en,
      excerpt_ar || null,
      excerpt_en || null,
      content_ar || null,
      content_en,
      featured_image || null,
      category || null,
      is_published ? 1 : 0,
      is_featured ? 1 : 0,
      finalPublishedAt || null,
      finalSlug,
      author_name || req.user.first_name + ' ' + req.user.last_name,
      author_bio || null,
      JSON.stringify(tags),
      meta_description_ar || null,
      meta_description_en || null,
      reading_time_minutes
    ]);

    const [newArticle] = await executeQuery('SELECT * FROM news_articles WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'News article created successfully',
      data: newArticle
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Slug already exists. Please choose a different slug.'
      });
    }
    next(error);
  }
});

/**
 * @route   PUT /api/news/admin/:id
 * @desc    Update news article
 * @access  Private (Admin/Staff)
 */
router.put('/admin/:id', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title_ar,
      title_en,
      excerpt_ar,
      excerpt_en,
      content_ar,
      content_en,
      featured_image,
      category,
      is_published,
      is_featured,
      published_at,
      slug,
      author_name,
      author_bio,
      tags,
      meta_description_ar,
      meta_description_en,
      reading_time_minutes
    } = req.body;

    // Check if article exists
    const [existingArticle] = await executeQuery('SELECT * FROM news_articles WHERE id = ?', [id]);
    if (!existingArticle) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    // Handle slug update
    let finalSlug = slug;
    if (slug && slug !== existingArticle.slug) {
      const [existingSlug] = await executeQuery('SELECT id FROM news_articles WHERE slug = ? AND id != ?', [slug, id]);
      if (existingSlug) {
        return res.status(400).json({
          success: false,
          message: 'Slug already exists. Please choose a different slug.'
        });
      }
    }

    await executeQuery(`
      UPDATE news_articles SET
        title_ar = COALESCE(?, title_ar),
        title_en = COALESCE(?, title_en),
        excerpt_ar = COALESCE(?, excerpt_ar),
        excerpt_en = COALESCE(?, excerpt_en),
        content_ar = COALESCE(?, content_ar),
        content_en = COALESCE(?, content_en),
        featured_image = COALESCE(?, featured_image),
        category = COALESCE(?, category),
        is_published = COALESCE(?, is_published),
        is_featured = COALESCE(?, is_featured),
        published_at = COALESCE(?, published_at),
        slug = COALESCE(?, slug),
        author_name = COALESCE(?, author_name),
        author_bio = COALESCE(?, author_bio),
        tags = COALESCE(?, tags),
        meta_description_ar = COALESCE(?, meta_description_ar),
        meta_description_en = COALESCE(?, meta_description_en),
        reading_time_minutes = COALESCE(?, reading_time_minutes),
        updated_at = NOW()
      WHERE id = ?
    `, [
      title_ar || null,
      title_en || null,
      excerpt_ar || null,
      excerpt_en || null,
      content_ar || null,
      content_en || null,
      featured_image || null,
      category || null,
      is_published !== undefined ? (is_published ? 1 : 0) : null,
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      published_at || null,
      finalSlug || null,
      author_name || null,
      author_bio || null,
      tags ? JSON.stringify(tags) : null,
      meta_description_ar || null,
      meta_description_en || null,
      reading_time_minutes || null,
      id
    ]);

    const [updatedArticle] = await executeQuery('SELECT * FROM news_articles WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'News article updated successfully',
      data: updatedArticle
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/news/admin/:id
 * @desc    Delete news article
 * @access  Private (Admin/Staff)
 */
router.delete('/admin/:id', authenticate, authorize('admin', 'staff'), validateId, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existingArticle] = await executeQuery('SELECT id FROM news_articles WHERE id = ?', [id]);
    if (!existingArticle) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    await executeQuery('DELETE FROM news_articles WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'News article deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/news/admin/stats
 * @desc    Get news statistics
 * @access  Private (Admin/Staff)
 */
router.get('/admin/stats', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const [stats] = await executeQuery(`
      SELECT 
        COUNT(*) as total_articles,
        COUNT(CASE WHEN is_published = 1 THEN 1 END) as published_articles,
        COUNT(CASE WHEN is_published = 0 THEN 1 END) as draft_articles,
        COUNT(CASE WHEN is_featured = 1 THEN 1 END) as featured_articles,
        SUM(view_count) as total_views,
        AVG(view_count) as avg_views_per_article
      FROM news_articles
    `);

    const categoriesStats = await executeQuery(`
      SELECT 
        category,
        COUNT(*) as article_count,
        SUM(view_count) as total_views
      FROM news_articles
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY article_count DESC
    `);

    const recentArticles = await executeQuery(`
      SELECT id, title_en, published_at, view_count, is_published
      FROM news_articles
      ORDER BY created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        overview: stats,
        categories: categoriesStats,
        recent_articles: recentArticles
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
