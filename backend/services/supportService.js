const { executeQuery } = require('../config/database');
const notificationService = require('./notificationService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

class SupportService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || 'uploads/';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB
  }

  // Create a new support ticket
  async createTicket(ticketData) {
    const {
      user_id,
      order_id = null,
      subject,
      message,
      category = 'inquiry',
      priority = 'medium',
      attachments = []
    } = ticketData;

    try {
      // Generate ticket number
      const ticketNumber = await this.generateTicketNumber();

      // Insert ticket
      const result = await executeQuery(`
        INSERT INTO support_tickets (ticket_number, user_id, order_id, subject, message, category, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
      `, [ticketNumber, user_id, order_id, subject, message, category, priority]);

      const ticketId = result.insertId;

      // Handle attachments if any
      if (attachments && attachments.length > 0) {
        await this.saveAttachments(ticketId, null, attachments, user_id, null);
      }

      // Send notification to admins
      await this.notifyAdmins(ticketId, 'new_ticket');

      // Emit socket event for real-time updates
      if (global.socketManager) {
        global.socketManager.emitToAdmins('newSupportTicket', {
          ticketId,
          ticketNumber,
          subject,
          category,
          priority,
          customerName: `${ticketData.customer_name || 'Unknown Customer'}`,
          timestamp: new Date().toISOString()
        });
      }

      return {
        id: ticketId,
        ticket_number: ticketNumber,
        status: 'open'
      };
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw new Error('Failed to create support ticket');
    }
  }

  // Get tickets for a specific client
  async getClientTickets(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status = null,
      category = null
    } = options;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const queryParams = [userId];
    const whereConditions = ['st.user_id = ?'];

    if (status) {
      whereConditions.push('st.status = ?');
      queryParams.push(status);
    }

    if (category) {
      whereConditions.push('st.category = ?');
      queryParams.push(category);
    }

    const whereClause = whereConditions.join(' AND ');

    try {
      // Get total count
      const [{ total }] = await executeQuery(`
        SELECT COUNT(*) as total 
        FROM support_tickets st 
        WHERE ${whereClause}
      `, queryParams);

      // Get tickets
      const tickets = await executeQuery(`
        SELECT 
          st.*,
          o.order_number as order_number,
          o.created_at as order_date,
          (SELECT COUNT(*) FROM support_replies sr WHERE sr.ticket_id = st.id) as reply_count,
          (SELECT COUNT(*) FROM support_attachments sa WHERE sa.ticket_id = st.id) as attachment_count
        FROM support_tickets st
        LEFT JOIN orders o ON st.order_id = o.id
        WHERE ${whereClause}
        ORDER BY st.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${offset}
      `, queryParams);

      return {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      console.error('Error fetching client tickets:', error);
      throw new Error('Failed to fetch tickets');
    }
  }

  // Get ticket details with replies
  async getTicketDetails(ticketId, userId = null) {
    try {
      const ticketQuery = `
        SELECT 
          st.*,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          u.email as user_email,
          u.phone as user_phone,
          o.order_number as order_number,
          o.created_at as order_date,
          o.total_amount as order_total,
          a.first_name as assigned_admin_first_name,
          a.last_name as assigned_admin_last_name
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        LEFT JOIN orders o ON st.order_id = o.id
        LEFT JOIN users a ON st.assigned_admin_id = a.id
        WHERE st.id = ?
        ${userId ? 'AND st.user_id = ?' : ''}
      `;

      const ticketParams = userId ? [ticketId, userId] : [ticketId];
      const [ticket] = await executeQuery(ticketQuery, ticketParams);

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Get replies (filter internal notes for non-admin users)
      const repliesQuery = `
        SELECT 
          sr.*,
          CONCAT(a.first_name, ' ', a.last_name) as admin_name,
          CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM support_replies sr
        LEFT JOIN users a ON sr.admin_id = a.id
        LEFT JOIN users u ON sr.user_id = u.id
        WHERE sr.ticket_id = ?
        ${userId ? 'AND sr.is_internal_note = false' : ''}
        ORDER BY sr.created_at ASC
      `;
      
      const replies = await executeQuery(repliesQuery, [ticketId]);

      // Get attachments
      const attachments = await executeQuery(`
        SELECT 
          sa.*,
          CONCAT(u.first_name, ' ', u.last_name) as uploaded_by_user_name,
          CONCAT(a.first_name, ' ', a.last_name) as uploaded_by_admin_name
        FROM support_attachments sa
        LEFT JOIN users u ON sa.uploaded_by_user_id = u.id
        LEFT JOIN users a ON sa.uploaded_by_admin_id = a.id
        WHERE sa.ticket_id = ?
        ORDER BY sa.created_at ASC
      `, [ticketId]);

      return {
        ticket,
        replies,
        attachments
      };
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      throw new Error('Failed to fetch ticket details');
    }
  }

  // Add reply to ticket
  async addReply(ticketId, replyData) {
    const {
      admin_id = null,
      user_id = null,
      message,
      is_internal_note = false,
      attachments = []
    } = replyData;

    const is_admin_reply = admin_id !== null;

    try {
      // Insert reply
      const result = await executeQuery(`
        INSERT INTO support_replies (ticket_id, admin_id, user_id, message, is_admin_reply, is_internal_note)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [ticketId, admin_id, user_id, message, is_admin_reply, is_internal_note]);

      const replyId = result.insertId;

      // Handle attachments
      if (attachments && attachments.length > 0) {
        await this.saveAttachments(ticketId, replyId, attachments, user_id, admin_id);
      }

      // Update ticket status if needed
      if (is_admin_reply) {
        await executeQuery(`
          UPDATE support_tickets 
          SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND status = 'open'
        `, [ticketId]);
      }

      // Send notifications
      if (is_admin_reply && !is_internal_note) {
        console.log(`🔔 Admin reply detected - sending notification to client for ticket ${ticketId}`);
        await this.notifyClient(ticketId, 'admin_reply');
      } else if (is_admin_reply && is_internal_note) {
        console.log(`📝 Internal note detected - skipping client notification for ticket ${ticketId}`);
      } else {
        console.log(`👤 User reply detected - sending notification to admins for ticket ${ticketId}`);
        await this.notifyAdmins(ticketId, 'client_reply');
      }

      return { id: replyId };
    } catch (error) {
      console.error('Error adding reply:', error);
      throw new Error('Failed to add reply');
    }
  }

  // Update ticket status
  async updateTicketStatus(ticketId, status, adminId = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date()
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date();
      }

      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);
      values.push(ticketId);

      await executeQuery(`
        UPDATE support_tickets SET ${setClause} WHERE id = ?
      `, values);

      // Log status change
      if (adminId) {
        await this.addReply(ticketId, {
          admin_id: adminId,
          message: `Ticket status changed to: ${status}`,
          is_internal_note: true
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw new Error('Failed to update ticket status');
    }
  }

  // Assign ticket to admin
  async assignTicket(ticketId, adminId, assignedBy = null) {
    try {
      await executeQuery(`
        UPDATE support_tickets 
        SET assigned_admin_id = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [adminId, ticketId]);

      // Log assignment
      if (assignedBy) {
        await this.addReply(ticketId, {
          admin_id: assignedBy,
          message: `Ticket assigned to admin ID: ${adminId}`,
          is_internal_note: true
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw new Error('Failed to assign ticket');
    }
  }

  // Get admin tickets
  async getAdminTickets(options = {}) {
    const {
      page = 1,
      limit = 20,
      status = null,
      priority = null,
      category = null,
      assigned_admin_id = null,
      search = null,
      createdAfter = null,
      createdBefore = null
    } = options;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const queryParams = [];
    const whereConditions = [];

    if (status) {
      whereConditions.push('st.status = ?');
      queryParams.push(status);
    }

    if (priority) {
      whereConditions.push('st.priority = ?');
      queryParams.push(priority);
    }

    if (category) {
      whereConditions.push('st.category = ?');
      queryParams.push(category);
    }

    if (assigned_admin_id) {
      whereConditions.push('st.assigned_admin_id = ?');
      queryParams.push(assigned_admin_id);
    }

    if (createdAfter) {
      whereConditions.push('st.created_at >= ?');
      queryParams.push(new Date(createdAfter));
    }

    if (createdBefore) {
      whereConditions.push('st.created_at <= ?');
      queryParams.push(new Date(createdBefore));
    }

    if (search) {
      whereConditions.push('(st.ticket_number LIKE ? OR st.subject LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    try {
      // Get total count
      const [{ total }] = await executeQuery(`
        SELECT COUNT(*) as total 
        FROM support_tickets st 
        JOIN users u ON st.user_id = u.id 
        ${whereClause}
      `, queryParams);

      // Get tickets
      const tickets = await executeQuery(`
        SELECT 
          st.*,
          CONCAT(u.first_name, ' ', u.last_name) as user_name,
          u.email as user_email,
          u.phone as user_phone,
          o.order_number as order_number,
          CONCAT(a.first_name, ' ', a.last_name) as assigned_admin_name,
          (SELECT COUNT(*) FROM support_replies sr WHERE sr.ticket_id = st.id) as reply_count,
          (SELECT COUNT(*) FROM support_attachments sa WHERE sa.ticket_id = st.id) as attachment_count
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        LEFT JOIN orders o ON st.order_id = o.id
        LEFT JOIN users a ON st.assigned_admin_id = a.id
        ${whereClause}
        ORDER BY 
          CASE st.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END,
          st.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${offset}
      `, queryParams);

      return {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      console.error('Error fetching admin tickets:', error);
      throw new Error('Failed to fetch tickets');
    }
  }

  // Submit feedback
  async submitFeedback(feedbackData) {
    const {
      user_id,
      order_id = null,
      rating,
      subject,
      message,
      category = 'general'
    } = feedbackData;

    try {
      const result = await executeQuery(`
        INSERT INTO feedback (user_id, order_id, rating, subject, message, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [user_id, order_id, rating, subject, message, category]);

      return { id: result.insertId };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback');
    }
  }

  // Get support statistics
  async getStatistics() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_tickets,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tickets,
          AVG(CASE 
            WHEN resolved_at IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
          END) as avg_resolution_time_hours
        FROM support_tickets
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      const categoryStats = await executeQuery(`
        SELECT category, COUNT(*) as count
        FROM support_tickets
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY category
        ORDER BY count DESC
      `);

      const feedbackStats = await executeQuery(`
        SELECT 
          AVG(rating) as avg_rating,
          COUNT(*) as total_feedback,
          COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_feedback,
          COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_feedback
        FROM feedback
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      return {
        tickets: stats[0],
        categories: categoryStats,
        feedback: feedbackStats[0]
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw new Error('Failed to fetch statistics');
    }
  }

  // Save attachments
  async saveAttachments(ticketId, replyId, attachments, userId, adminId) {
    for (const attachment of attachments) {
      try {
        await executeQuery(`
          INSERT INTO support_attachments 
          (ticket_id, reply_id, filename, original_filename, file_path, file_size, mime_type, uploaded_by_user_id, uploaded_by_admin_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          ticketId,
          replyId,
          attachment.filename,
          attachment.originalname,
          attachment.path,
          attachment.size,
          attachment.mimetype,
          userId,
          adminId
        ]);
      } catch (error) {
        console.error('Error saving attachment:', error);
      }
    }
  }

  // Notify admins about new tickets or replies
  async notifyAdmins(ticketId, type) {
    console.log(`🔔 Admin notification: ${type} for ticket ${ticketId}`);
    
    try {
      // Get ticket details for notification
      const [ticket] = await executeQuery(`
        SELECT st.id, st.ticket_number, st.subject, st.category, st.priority, st.status, st.user_id, st.created_at,
               u.first_name, u.last_name
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.id = ?
      `, [ticketId]);

      if (!ticket) {
        console.log(`❌ Ticket ${ticketId} not found for admin notification`);
        return;
      }

      // Create database notification for admins
      let titleAr, titleEn, messageAr, messageEn;

      if (type === 'new_ticket') {
        if (ticket.priority === 'urgent') {
          titleAr = 'تذكرة دعم عاجلة جديدة';
          titleEn = 'New Urgent Support Ticket';
        } else if (ticket.priority === 'high') {
          titleAr = 'تذكرة دعم ذات أولوية عالية';
          titleEn = 'New High Priority Support Ticket';
        } else {
          titleAr = 'تذكرة دعم جديدة';
          titleEn = 'New Support Ticket';
        }
        
        messageAr = `تذكرة رقم #${ticket.ticket_number}: ${ticket.subject} من ${ticket.first_name} ${ticket.last_name}`;
        messageEn = `Ticket #${ticket.ticket_number}: ${ticket.subject} from ${ticket.first_name} ${ticket.last_name}`;
      } else if (type === 'client_reply') {
        titleAr = 'رد جديد على تذكرة الدعم';
        titleEn = 'New Client Reply on Support Ticket';
        messageAr = `رد جديد على التذكرة #${ticket.ticket_number} من ${ticket.first_name} ${ticket.last_name}`;
        messageEn = `New reply on ticket #${ticket.ticket_number} from ${ticket.first_name} ${ticket.last_name}`;
      }

      // Create notification record in database (for all admins, user_id = null)
      await notificationService.createNotification({
        user_id: null, // null means for all admins
        title_ar: titleAr,
        title_en: titleEn,
        message_ar: messageAr,
        message_en: messageEn,
        type: 'support',
        data: {
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          category: ticket.category,
          priority: ticket.priority,
          customer_id: ticket.user_id,
          customer_name: `${ticket.first_name} ${ticket.last_name}`,
          notification_type: type
        }
      });

      console.log(`✅ Database notification created for ${type} on ticket ${ticket.ticket_number}`);

      // Emit socket event for real-time admin notifications
      if (global.socketManager) {
        if (type === 'client_reply') {
          global.socketManager.emitToAdmins('newSupportReply', {
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          customer: `${ticket.first_name} ${ticket.last_name}`,
          timestamp: new Date().toISOString(),
          type: 'client_reply'
        });
          console.log(`📡 Socket event 'newSupportReply' emitted for ticket ${ticket.ticket_number}`);
        } else if (type === 'new_ticket') {
          // Already handled in createTicket method
          console.log(`📡 New ticket socket event already handled for ticket ${ticket.ticket_number}`);
        }
      } else {
        console.log('⚠️ Socket manager not available for admin notifications');
      }
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  }

  // Notify client about admin replies
  async notifyClient(ticketId, type) {
    console.log(`🔔 notifyClient called - ticketId: ${ticketId}, type: ${type}`);
    
    try {
      // Get ticket details to get user_id
      const [ticket] = await executeQuery(`
        SELECT user_id, ticket_number, subject 
        FROM support_tickets 
        WHERE id = ?
      `, [ticketId]);

      if (!ticket) {
        console.log(`❌ Ticket ${ticketId} not found for notification`);
        return;
      }

      console.log(`📋 Found ticket for notification - user_id: ${ticket.user_id}, ticket_number: ${ticket.ticket_number}`);

      // Emit socket event for real-time mobile app notifications
      const socketManager = require('../config/socket');
      socketManager.emitToUser(ticket.user_id, 'supportReply', {
        ticketId: ticketId,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        timestamp: new Date().toISOString(),
        type: 'admin_reply'
      });
      console.log(`📡 Socket event 'supportReply' emitted to user ${ticket.user_id} for ticket ${ticket.ticket_number}`);

      const notificationService = require('./notificationService');
      
      let notification = {};
      
      if (type === 'admin_reply') {
        notification = {
          title_ar: 'رد جديد على تذكرة الدعم',
          title_en: 'New Support Reply',
          message_ar: `تم الرد على تذكرة الدعم رقم ${ticket.ticket_number}`,
          message_en: `Your support ticket ${ticket.ticket_number} has been replied to`,
          type: 'support_reply'
        };
        
        console.log(`📧 Prepared notification:`, {
          title: notification.title_en,
          message: notification.message_en,
          type: notification.type
        });
      }

      // Send notification to the user
      const notificationResult = await notificationService.sendToUser(
        ticket.user_id,
        notification,
        {
          ticket_id: ticketId,
          ticket_number: ticket.ticket_number,
          screen: 'Support',
          action: 'view_ticket'
        }
      );

      console.log(`✅ Support notification sent to user ${ticket.user_id} for ticket ${ticketId}:`, {
        success: notificationResult.success,
        notificationId: notificationResult.notificationId,
        pushResults: notificationResult.pushResults?.length || 0
      });
    } catch (error) {
      console.error('Error sending support notification:', error);
    }
  }

  // Get support categories
  async getSupportCategories() {
    try {
      return await executeQuery(`
        SELECT * FROM support_categories 
        WHERE is_active = true 
        ORDER BY sort_order ASC
      `);
    } catch (error) {
      console.error('Error fetching support categories:', error);
      throw new Error('Failed to fetch support categories');
    }
  }

  // Generate unique ticket number
  async generateTicketNumber() {
    try {
      // Get prefix from settings
      const [setting] = await executeQuery(`
        SELECT setting_value FROM support_settings 
        WHERE setting_key = 'ticket_number_prefix' 
        LIMIT 1
      `);
      
      const prefix = setting ? setting.setting_value : 'TKT';
      
      // Get next counter value
      const [result] = await executeQuery(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number, LENGTH(?) + 2) AS UNSIGNED)), 0) + 1 as counter
        FROM support_tickets 
        WHERE ticket_number LIKE CONCAT(?, '-%')
      `, [prefix, prefix]);
      
      const counter = result ? result.counter : 1;
      
      return `${prefix}-${String(counter).padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating ticket number:', error);
      // Fallback to timestamp-based number
      return `TKT-${Date.now()}`;
    }
  }
}

module.exports = new SupportService();
