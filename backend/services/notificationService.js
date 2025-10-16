const { executeQuery, executeTransaction } = require('../config/database');
const fcmService = require('./fcmService');

class NotificationService {
  
  /**
   * Create a notification in the database
   */
  async createNotification({
    user_id = null,
    title_ar,
    title_en,
    message_ar,
    message_en,
    type = 'general',
    data = null
  }) {
    try {
      const result = await executeQuery(`
        INSERT INTO notifications (user_id, title_ar, title_en, message_ar, message_en, type, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user_id,
        title_ar,
        title_en,
        message_ar,
        message_en,
        type,
        data ? JSON.stringify(data) : null
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to a single user
   */
  async sendToUser(userId, notification, data = {}, saveToDb = true) {
    try {
      let notificationId = null;

      // Save notification to database if requested
      if (saveToDb) {
        notificationId = await this.createNotification({
          user_id: userId,
          ...notification,
          data
        });
      }

      // Get user's active FCM tokens
      const tokens = await executeQuery(`
        SELECT token, device_type 
        FROM user_fcm_tokens 
        WHERE user_id = ? AND is_active = 1
      `, [userId]);

      if (!tokens.length) {
        console.log(`No active FCM tokens found for user ${userId}`);
        return {
          success: true,
          notificationId,
          pushResults: []
        };
      }

      // Prepare notification for FCM
      const fcmNotification = {
        title: notification.title_en, // Default to English, can be modified based on user preference
        body: notification.message_en,
        image: notification.image
      };

      const fcmData = {
        ...data,
        notification_id: notificationId?.toString() || '',
        type: notification.type || 'general'
      };

      // Send to all user's tokens
      const tokenList = tokens.map(t => t.token);
      const pushResult = await fcmService.sendToMultipleTokens(tokenList, fcmNotification, fcmData);

      // Log notification delivery
      await this.logNotificationDelivery(notificationId, userId, pushResult, notification);

      // Clean up invalid tokens
      const invalidTokens = pushResult.results?.filter(r => !r.success && 
        r.error?.includes('not a valid FCM registration token')).map(r => r.token) || [];
      
      if (invalidTokens.length) {
        await fcmService.cleanupInvalidTokens(invalidTokens);
      }

      return {
        success: true,
        notificationId,
        pushResults: pushResult.results
      };

    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw error;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds, notification, data = {}, saveToDb = true) {
    try {
      const results = [];

      for (const userId of userIds) {
        const result = await this.sendToUser(userId, notification, data, saveToDb);
        results.push({
          userId,
          ...result
        });
      }

      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Error sending notifications to users:', error);
      throw error;
    }
  }

  /**
   * Broadcast notification to all users
   */
  async broadcast(notification, data = {}, saveToDb = true) {
    try {
      let notificationId = null;

      // Save notification to database if requested (as a general broadcast)
      if (saveToDb) {
        notificationId = await this.createNotification({
          user_id: null, // null for broadcast
          ...notification,
          data
        });
      }

      // Get all active FCM tokens
      const tokens = await executeQuery(`
        SELECT DISTINCT token 
        FROM user_fcm_tokens 
        WHERE is_active = 1
      `);

      if (!tokens.length) {
        console.log('No active FCM tokens found for broadcast');
        return {
          success: true,
          notificationId,
          pushResults: []
        };
      }

      // Prepare notification for FCM
      const fcmNotification = {
        title: notification.title_en,
        body: notification.message_en,
        image: notification.image
      };

      const fcmData = {
        ...data,
        notification_id: notificationId?.toString() || '',
        type: notification.type || 'general',
        is_broadcast: 'true'
      };

      // Send to all tokens in batches (FCM has a limit of 500 tokens per request)
      const batchSize = 500;
      const tokenList = tokens.map(t => t.token);
      const pushResults = [];

      for (let i = 0; i < tokenList.length; i += batchSize) {
        const batch = tokenList.slice(i, i + batchSize);
        const batchResult = await fcmService.sendToMultipleTokens(batch, fcmNotification, fcmData);
        pushResults.push(...(batchResult.results || []));
      }

      // Log notification delivery for broadcast
      await this.logBroadcastDelivery(notificationId, pushResults, notification);

      // Clean up invalid tokens
      const invalidTokens = pushResults.filter(r => !r.success && 
        r.error?.includes('not a valid FCM registration token')).map(r => r.token);
      
      if (invalidTokens.length) {
        await fcmService.cleanupInvalidTokens(invalidTokens);
      }

      return {
        success: true,
        notificationId,
        pushResults,
        totalSent: pushResults.filter(r => r.success).length,
        totalFailed: pushResults.filter(r => !r.success).length
      };

    } catch (error) {
      console.error('Error broadcasting notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(topic, notification, data = {}, saveToDb = true) {
    try {
      let notificationId = null;

      // Save notification to database if requested
      if (saveToDb) {
        notificationId = await this.createNotification({
          user_id: null,
          ...notification,
          data: { ...data, topic }
        });
      }

      // Prepare notification for FCM
      const fcmNotification = {
        title: notification.title_en,
        body: notification.message_en,
        image: notification.image
      };

      const fcmData = {
        ...data,
        notification_id: notificationId?.toString() || '',
        type: notification.type || 'general',
        topic
      };

      // Send to topic
      const pushResult = await fcmService.sendToTopic(topic, fcmNotification, fcmData);

      // Log topic notification
      await this.logTopicDelivery(notificationId, topic, pushResult, notification);

      return {
        success: true,
        notificationId,
        pushResult
      };

    } catch (error) {
      console.error('Error sending notification to topic:', error);
      throw error;
    }
  }

  /**
   * Log notification delivery to database
   */
  async logNotificationDelivery(notificationId, userId, pushResult, notification) {
    try {
      if (!pushResult.results) return;

      const logs = pushResult.results.map(result => [
        notificationId,
        userId,
        result.token,
        notification.title_ar,
        notification.title_en,
        notification.message_ar,
        notification.message_en,
        'push',
        result.success ? 'sent' : 'failed',
        result.messageId || null,
        result.error || null,
        null, // data
        result.success ? new Date() : null
      ]);

      if (logs.length > 0) {
        const placeholders = logs.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
        const flatValues = logs.flat();

        await executeQuery(`
          INSERT INTO notification_logs (
            notification_id, user_id, fcm_token, title_ar, title_en, 
            message_ar, message_en, type, delivery_status, fcm_message_id, 
            error_message, data, sent_at
          ) VALUES ${placeholders}
        `, flatValues);
      }
    } catch (error) {
      console.error('Error logging notification delivery:', error);
    }
  }

  /**
   * Log broadcast delivery
   */
  async logBroadcastDelivery(notificationId, pushResults, notification) {
    try {
      const logs = pushResults.map(result => [
        notificationId,
        null, // user_id is null for broadcast
        result.token,
        notification.title_ar,
        notification.title_en,
        notification.message_ar,
        notification.message_en,
        'push',
        result.success ? 'sent' : 'failed',
        result.messageId || null,
        result.error || null,
        JSON.stringify({ is_broadcast: true }),
        result.success ? new Date() : null
      ]);

      if (logs.length > 0) {
        // Insert in batches to avoid query size limits
        const batchSize = 100;
        for (let i = 0; i < logs.length; i += batchSize) {
          const batch = logs.slice(i, i + batchSize);
          const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
          const flatValues = batch.flat();

          await executeQuery(`
            INSERT INTO notification_logs (
              notification_id, user_id, fcm_token, title_ar, title_en, 
              message_ar, message_en, type, delivery_status, fcm_message_id, 
              error_message, data, sent_at
            ) VALUES ${placeholders}
          `, flatValues);
        }
      }
    } catch (error) {
      console.error('Error logging broadcast delivery:', error);
    }
  }

  /**
   * Log topic delivery
   */
  async logTopicDelivery(notificationId, topic, pushResult, notification) {
    try {
      await executeQuery(`
        INSERT INTO notification_logs (
          notification_id, user_id, fcm_token, title_ar, title_en, 
          message_ar, message_en, type, delivery_status, fcm_message_id, 
          error_message, data, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        notificationId,
        null,
        topic,
        notification.title_ar,
        notification.title_en,
        notification.message_ar,
        notification.message_en,
        'push',
        pushResult.success ? 'sent' : 'failed',
        pushResult.messageId || null,
        pushResult.error || null,
        JSON.stringify({ topic, is_topic: true }),
        pushResult.success ? new Date() : null
      ]);
    } catch (error) {
      console.error('Error logging topic delivery:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      // For admin notifications (user_id IS NULL), we allow marking without user_id check
      // For user notifications, we check user_id to ensure users can only mark their own notifications
      const query = userId ? `
        UPDATE notifications 
        SET is_read = 1, read_at = NOW() 
        WHERE id = ? AND (user_id = ? OR user_id IS NULL)
      ` : `
        UPDATE notifications 
        SET is_read = 1, read_at = NOW() 
        WHERE id = ?
      `;

      const params = userId ? [notificationId, userId] : [notificationId];
      
      console.log(`[NOTIF_SERVICE] Marking notification as read:`, {
        notificationId,
        userId: userId || 'admin',
        query,
        params
      });
      
      const result = await executeQuery(query, params);
      
      console.log(`[NOTIF_SERVICE] Mark as read result:`, result);
      console.log(`[NOTIF_SERVICE] Rows affected: ${result.affectedRows || 0}`);

      if (result.affectedRows === 0) {
        console.warn(`[NOTIF_SERVICE] ⚠️ No rows were updated! Notification ${notificationId} may not exist or is already read.`);
      } else {
        console.log(`[NOTIF_SERVICE] ✅ Successfully marked notification ${notificationId} as read`);
      }
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    try {
      await executeQuery(`
        UPDATE notifications 
        SET is_read = 1, read_at = NOW() 
        WHERE user_id = ? AND is_read = 0
      `, [userId]);

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(userId, page = 1, limit = 20) {
    try {
      const sanitizedPage = Math.max(1, parseInt(page) || 1);
      const sanitizedLimit = Math.max(1, Math.min(1000, parseInt(limit) || 20));
      const offset = (sanitizedPage - 1) * sanitizedLimit;

      // Only get user-specific notifications, not global ones
      const [total] = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = ?
      `, [userId]);

      // Using string interpolation for LIMIT/OFFSET to avoid MySQL parameter issues
      const notifications = await executeQuery(`
        SELECT * FROM notifications 
        WHERE user_id = ?
        ORDER BY created_at DESC 
        LIMIT ${sanitizedLimit} OFFSET ${offset}
      `, [userId]);

      console.log(`[NOTIF_SERVICE] Retrieved ${notifications.length} notifications for user ${userId}`);

      return {
        notifications,
        pagination: {
          page: sanitizedPage,
          limit: sanitizedLimit,
          total: total.count,
          pages: Math.ceil(total.count / sanitizedLimit)
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Get admin notifications with pagination
   */
  async getAdminNotifications(page = 1, limit = 20, type = null, unreadOnly = false) {
    try {
      const sanitizedPage = Math.max(1, parseInt(page) || 1);
      const sanitizedLimit = Math.max(1, Math.min(1000, parseInt(limit) || 20));
      const offset = (sanitizedPage - 1) * sanitizedLimit;

      // Build WHERE clause
      let whereClause = 'WHERE user_id IS NULL';
      let queryParams = [];
      
      if (type) {
        whereClause += ' AND type = ?';
        queryParams.push(type);
      }

      // Filter for unread notifications if requested
      if (unreadOnly) {
        whereClause += ' AND is_read = 0';
      }

      console.log(`[NOTIF_SERVICE] Query parameters:`, {
        page: sanitizedPage,
        limit: sanitizedLimit,
        type,
        unreadOnly,
        whereClause,
        queryParams
      });

      // Get total count for the specific query
      const [total] = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM notifications 
        ${whereClause}
      `, queryParams);

      console.log(`[NOTIF_SERVICE] Total count result:`, total);

      // Also get diagnostic counts for debugging
      const [allAdminCount] = await executeQuery(`
        SELECT COUNT(*) as count FROM notifications WHERE user_id IS NULL
      `);
      const [allAdminUnreadCount] = await executeQuery(`
        SELECT COUNT(*) as count FROM notifications WHERE user_id IS NULL AND is_read = 0
      `);
      const [allAdminReadCount] = await executeQuery(`
        SELECT COUNT(*) as count FROM notifications WHERE user_id IS NULL AND is_read = 1
      `);

      console.log(`[NOTIF_SERVICE] 📊 Diagnostic Counts:`, {
        totalAdminNotifications: allAdminCount.count,
        unreadAdminNotifications: allAdminUnreadCount.count,
        readAdminNotifications: allAdminReadCount.count,
        queriedCount: total.count,
        difference: allAdminUnreadCount.count - total.count
      });

      // Get notifications
      const notifications = await executeQuery(`
        SELECT * FROM notifications 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ${sanitizedLimit} OFFSET ${offset}
      `, queryParams);

      console.log(`[NOTIF_SERVICE] Retrieved ${notifications.length} admin notifications (unreadOnly: ${unreadOnly}, total: ${total.count})`);

      return {
        notifications,
        pagination: {
          page: sanitizedPage,
          limit: sanitizedLimit,
          total: total.count,
          pages: Math.ceil(total.count / sanitizedLimit)
        }
      };
    } catch (error) {
      console.error('Error getting admin notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(days = 7) {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN is_read = 1 THEN 1 END) as read_notifications,
          COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread_notifications,
          COUNT(CASE WHEN type = 'order' THEN 1 END) as order_notifications,
          COUNT(CASE WHEN type = 'promotion' THEN 1 END) as promotion_notifications,
          COUNT(CASE WHEN type = 'general' THEN 1 END) as general_notifications,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) as recent_notifications
        FROM notifications
      `, [days]);

      const deliveryStats = await executeQuery(`
        SELECT 
          COUNT(*) as total_sent,
          COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) as successful_deliveries,
          COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed_deliveries,
          COUNT(CASE WHEN delivery_status = 'clicked' THEN 1 END) as clicked_notifications
        FROM notification_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [days]);

      return {
        ...stats[0],
        ...deliveryStats[0]
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
