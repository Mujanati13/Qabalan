const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateId, validatePagination } = require('../middleware/validation');
const { 
  validateNotification, 
  validateFCMToken, 
  validateTopic, 
  validateNotificationFilters 
} = require('../middleware/notificationValidation');
const notificationService = require('../services/notificationService');
const fcmService = require('../services/fcmService');

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications with pagination
 * @access  Private
 */
router.get('/', authenticate, validatePagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, admin = false, type, unread_only = false } = req.query;
    const userId = req.user.id;

    let result;
    
    if (admin === 'true' && req.user.user_type === 'admin') {
      // Get admin notifications (user_id IS NULL)
      const unreadOnly = unread_only === 'true';
      result = await notificationService.getAdminNotifications(page, limit, type, unreadOnly);
    } else {
      // Get user-specific notifications
      result = await notificationService.getUserNotifications(userId, page, limit);
    }

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications for user
 * @access  Private
 */
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Only count user-specific notifications, not global ones
    // Global notifications (user_id IS NULL) are system announcements
    // and should be handled separately if needed
    const [result] = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `, [userId]);

    console.log(`[NOTIF] Unread count for user ${userId}: ${result.count}`);

    res.json({
      success: true,
      data: {
        unread_count: result.count
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.post('/:id/read', authenticate, validateId, async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    await notificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      message: 'Notification marked as read',
      message_ar: 'تم وضع علامة مقروء على الإشعار'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/notifications/read-all
 * @desc    Mark all notifications as read for user
 * @access  Private
 */
router.post('/read-all', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      message_ar: 'تم وضع علامة مقروء على جميع الإشعارات'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/notifications/register-token
 * @desc    Register FCM token for user
 * @access  Private
 */
router.post('/register-token', authenticate, validateFCMToken, async (req, res, next) => {
  try {
    const {
      token,
      device_type,
      device_id,
      app_version
    } = req.body;

  if (!token || !device_type) {
      return res.status(400).json({
        success: false,
        message: 'Token and device type are required',
        message_ar: 'الرمز المميز ونوع الجهاز مطلوبان'
      });
    }

    const userId = req.user.id;
  const masked = `${token.slice(0, 8)}...${token.slice(-6)}`;
  console.log('[NOTIF][REGISTER]', { userId, device_type, device_id, app_version, tokenMasked: masked });

    // Use INSERT ... ON DUPLICATE KEY UPDATE to handle token registration atomically
    // This prevents race conditions and duplicate key errors
    await executeQuery(`
      INSERT INTO user_fcm_tokens (user_id, token, device_type, device_id, app_version, is_active, last_used_at)
      VALUES (?, ?, ?, ?, ?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        device_type = VALUES(device_type),
        device_id = VALUES(device_id),
        app_version = VALUES(app_version),
        is_active = 1,
        last_used_at = NOW(),
        updated_at = NOW()
    `, [userId, token, device_type, device_id || null, app_version || null]);

    console.log('[NOTIF][REGISTER] ✅ Token registered/updated successfully', { tokenMasked: masked });

    // Subscribe to general topic for broadcasts
    try {
      await fcmService.subscribeToTopic([token], 'all_users');
      console.log('[NOTIF][REGISTER] Subscribed to topic all_users', { tokenMasked: masked });
    } catch (topicError) {
      console.warn('[NOTIF][REGISTER] Topic subscribe failed:', topicError.message);
    }

    res.json({
      success: true,
      message: 'FCM token registered successfully',
      message_ar: 'تم تسجيل رمز FCM بنجاح'
    });

  } catch (error) {
    console.error('[NOTIF][REGISTER] Error:', error);
    
    // Handle specific database errors with user-friendly messages
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Token already registered for another user',
        message_ar: 'الرمز المميز مسجل بالفعل لمستخدم آخر'
      });
    }
    
    // For other errors, pass to error handler
    next(error);
  }
});

/**
 * @route   DELETE /api/notifications/unregister-token
 * @desc    Unregister FCM token
 * @access  Private
 */
router.delete('/unregister-token', authenticate, async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
        message_ar: 'الرمز المميز مطلوب'
      });
    }

  const masked = token ? `${token.slice(0, 8)}...${token.slice(-6)}` : 'N/A';
  console.log('[NOTIF][UNREGISTER] Request:', { tokenMasked: masked });

  // Deactivate token
    await executeQuery(`
      UPDATE user_fcm_tokens 
      SET is_active = 0, updated_at = NOW()
      WHERE token = ?
    `, [token]);

    // Unsubscribe from topics
    try {
      await fcmService.unsubscribeFromTopic([token], 'all_users');
      console.log('[NOTIF][UNREGISTER] Unsubscribed from topic all_users', { tokenMasked: masked });
    } catch (topicError) {
      console.warn('[NOTIF][UNREGISTER] Topic unsubscribe failed:', topicError.message);
    }

    res.json({
      success: true,
      message: 'FCM token unregistered successfully',
      message_ar: 'تم إلغاء تسجيل رمز FCM بنجاح'
    });

  } catch (error) {
  console.error('[NOTIF][UNREGISTER] Error:', error);
  next(error);
  }
});

/**
 * @route   POST /api/notifications/self-test
 * @desc    Send a test push notification to the authenticated user's latest active FCM token
 * @access  Private
 */
router.post('/self-test', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [row] = await executeQuery(
      `SELECT token FROM user_fcm_tokens 
       WHERE user_id = ? AND is_active = 1 
       ORDER BY updated_at DESC, last_used_at DESC, created_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (!row || !row.token) {
      return res.status(400).json({
        success: false,
        message: 'No active FCM token found for this user',
        message_ar: 'لا يوجد رمز FCM نشط لهذا المستخدم'
      });
    }

    const masked = `${row.token.slice(0, 8)}...${row.token.slice(-6)}`;
    console.log('[NOTIF][SELF-TEST] Sending to latest token:', { userId, tokenMasked: masked });

    const result = await fcmService.sendToToken(
      row.token,
      { title: 'FECS Test Notification', body: 'This is a self-test push to your device.' },
      { type: 'test', source: 'self-test' }
    );

    if (result?.success) {
      console.log('[NOTIF][SELF-TEST] Success:', { messageId: result.messageId, tokenMasked: masked });
      return res.json({ success: true, message: 'Test notification sent' });
    }

    console.warn('[NOTIF][SELF-TEST] Failed:', { error: result?.error, tokenMasked: masked });
    return res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: result?.error || 'Unknown error'
    });
  } catch (error) {
    console.error('[NOTIF][SELF-TEST] Error:', error);
    next(error);
  }
});

// Admin routes

/**
 * @route   GET /api/notifications/admin/all
 * @desc    Get all notifications (admin)
 * @access  Private (Admin)
 */
router.get('/admin/all', authenticate, authorize('admin', 'staff'), validatePagination, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type = 'all',
      user_id
    } = req.query;

    const sanitizedPage = Math.max(1, parseInt(page) || 1);
    const sanitizedLimit = Math.max(1, Math.min(1000, parseInt(limit) || 20));
    const offset = (sanitizedPage - 1) * sanitizedLimit;
    let whereConditions = [];
    let queryParams = [];

    if (type !== 'all') {
      whereConditions.push('type = ?');
      queryParams.push(type);
    }

    if (user_id) {
      whereConditions.push('user_id = ?');
      queryParams.push(user_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [{ total }] = await executeQuery(`
      SELECT COUNT(*) as total FROM notifications ${whereClause}
    `, queryParams);

    // Get notifications
    const notifications = await executeQuery(`
      SELECT n.*, u.first_name, u.last_name, u.email
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ${sanitizedLimit} OFFSET ${offset}
    `, queryParams);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        total,
        pages: Math.ceil(total / sanitizedLimit)
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/notifications/admin/send
 * @desc    Send notification (admin)
 * @access  Private (Admin)
 */
router.post('/admin/send', authenticate, authorize('admin', 'staff'), validateNotification, async (req, res, next) => {
  try {
    const {
      recipient_type, // 'user', 'users', 'broadcast', 'topic'
      recipient_ids, // array of user IDs (for 'users' type)
      user_id, // single user ID (for 'user' type)
      topic, // topic name (for 'topic' type)
      title_ar,
      title_en,
      message_ar,
      message_en,
      type = 'general',
      data = {},
      save_to_db = true
    } = req.body;

    console.log('[NOTIF][ADMIN][SEND] Request:', {
      recipient_type,
      user_id,
      recipient_ids_count: Array.isArray(recipient_ids) ? recipient_ids.length : 0,
      topic,
      type,
      save_to_db
    });

    if (!title_ar || !title_en || !message_ar || !message_en) {
      return res.status(400).json({
        success: false,
        message: 'Title and message in both languages are required',
        message_ar: 'العنوان والرسالة بكلا اللغتين مطلوبان'
      });
    }

    const notification = {
      title_ar,
      title_en,
      message_ar,
      message_en,
      type
    };

  let result;

    switch (recipient_type) {
      case 'user':
        if (!user_id) {
          return res.status(400).json({
            success: false,
            message: 'User ID is required for single user notification',
            message_ar: 'معرف المستخدم مطلوب للإشعار الفردي'
          });
        }
  result = await notificationService.sendToUser(user_id, notification, data, save_to_db);
        break;

      case 'users':
        if (!recipient_ids || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Recipient IDs array is required for multiple users notification',
            message_ar: 'مصفوفة معرفات المستلمين مطلوبة للإشعار متعدد المستخدمين'
          });
        }
  result = await notificationService.sendToUsers(recipient_ids, notification, data, save_to_db);
        break;

      case 'broadcast':
  result = await notificationService.broadcast(notification, data, save_to_db);
        break;

      case 'topic':
        if (!topic) {
          return res.status(400).json({
            success: false,
            message: 'Topic name is required for topic notification',
            message_ar: 'اسم الموضوع مطلوب للإشعار الموضوعي'
          });
        }
  result = await notificationService.sendToTopic(topic, notification, data, save_to_db);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid recipient type. Must be: user, users, broadcast, or topic',
          message_ar: 'نوع مستلم غير صالح. يجب أن يكون: مستخدم، مستخدمون، بث، أو موضوع'
        });
    }

    // Summarize result for logs without dumping large arrays
    const summary = result && typeof result === 'object' ? {
      success: !!result.success,
      notificationId: result.notificationId,
      totalSent: result.totalSent ?? (Array.isArray(result.pushResults) ? result.pushResults.filter(r => r.success).length : undefined),
      totalFailed: result.totalFailed ?? (Array.isArray(result.pushResults) ? result.pushResults.filter(r => !r.success).length : undefined)
    } : undefined;
    console.log('[NOTIF][ADMIN][SEND] Result:', summary);

    res.json({
      success: true,
      message: 'Notification sent successfully',
      message_ar: 'تم إرسال الإشعار بنجاح',
      data: result
    });

  } catch (error) {
    console.error('[NOTIF][ADMIN][SEND] Error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/notifications/admin/stats
 * @desc    Get notification statistics (admin)
 * @access  Private (Admin)
 */
router.get('/admin/stats', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const { days = 7 } = req.query;

    const stats = await notificationService.getNotificationStats(days);

    // Additional stats
    const deviceStats = await executeQuery(`
      SELECT 
        device_type,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count
      FROM user_fcm_tokens
      GROUP BY device_type
    `);

    const recentLogs = await executeQuery(`
      SELECT 
        delivery_status,
        COUNT(*) as count
      FROM notification_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY delivery_status
    `, [days]);

    res.json({
      success: true,
      data: {
        overview: stats,
        device_distribution: deviceStats,
        delivery_status: recentLogs
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/notifications/admin/logs
 * @desc    Get notification delivery logs (admin)
 * @access  Private (Admin)
 */
router.get('/admin/logs', authenticate, authorize('admin', 'staff'), validatePagination, validateNotificationFilters, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      status = 'all',
      type = 'all',
      notification_id
    } = req.query;

    const sanitizedPage = Math.max(1, parseInt(page) || 1);
    const sanitizedLimitInput = Math.max(1, Math.min(1000, parseInt(limit) || 50));
    const offset = (sanitizedPage - 1) * sanitizedLimitInput;
    let whereConditions = [];
    let queryParams = [];

    if (status !== 'all') {
      whereConditions.push('delivery_status = ?');
      queryParams.push(status);
    }

    if (type !== 'all') {
      whereConditions.push('type = ?');
      queryParams.push(type);
    }

    if (notification_id) {
      whereConditions.push('notification_id = ?');
      queryParams.push(notification_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [{ total }] = await executeQuery(`
      SELECT COUNT(*) as total FROM notification_logs ${whereClause}
    `, queryParams);

    // Get logs - using string interpolation for LIMIT/OFFSET to avoid MySQL parameter issues
    const sanitizedLimit = sanitizedLimitInput;
    const sanitizedOffset = Math.max(0, offset);
    
    const logs = await executeQuery(`
      SELECT nl.*, u.first_name, u.last_name, u.email
      FROM notification_logs nl
      LEFT JOIN users u ON nl.user_id = u.id
      ${whereClause}
      ORDER BY nl.created_at DESC
      LIMIT ${sanitizedLimit} OFFSET ${sanitizedOffset}
    `, queryParams);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimitInput,
        total,
        pages: Math.ceil(total / sanitizedLimitInput)
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/notifications/admin/tokens
 * @desc    Get FCM tokens (admin)
 * @access  Private (Admin)
 */
router.get('/admin/tokens', authenticate, authorize('admin', 'staff'), validatePagination, validateNotificationFilters, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      device_type = 'all',
      active = 'all'
    } = req.query;

    const sanitizedPage = Math.max(1, parseInt(page) || 1);
    const sanitizedLimitInput = Math.max(1, Math.min(1000, parseInt(limit) || 50));
    const offset = (sanitizedPage - 1) * sanitizedLimitInput;
    let whereConditions = [];
    let queryParams = [];

    if (device_type !== 'all') {
      whereConditions.push('device_type = ?');
      queryParams.push(device_type);
    }

    if (active === 'true') {
      whereConditions.push('is_active = 1');
    } else if (active === 'false') {
      whereConditions.push('is_active = 0');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [{ total }] = await executeQuery(`
      SELECT COUNT(*) as total FROM user_fcm_tokens ${whereClause}
    `, queryParams);

    // Get tokens - using string interpolation for LIMIT/OFFSET to avoid MySQL parameter issues
    const sanitizedLimit = sanitizedLimitInput;
    const sanitizedOffset = Math.max(0, offset);
    
    const tokens = await executeQuery(`
      SELECT t.*, u.first_name, u.last_name, u.email
      FROM user_fcm_tokens t
      LEFT JOIN users u ON t.user_id = u.id
      ${whereClause}
      ORDER BY t.last_used_at DESC
      LIMIT ${sanitizedLimit} OFFSET ${sanitizedOffset}
    `, queryParams);

    res.json({
      success: true,
      data: tokens,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimitInput,
        total,
        pages: Math.ceil(total / sanitizedLimitInput)
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
