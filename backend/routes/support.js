const express = require('express');
const router = express.Router();
const supportService = require('../services/supportService');
const { authenticate } = require('../middleware/auth');
const { 
  validateSupportTicket, 
  validateFeedback, 
  validateReply, 
  validateTicketStatus, 
  validateTicketAssignment, 
  validateFeedbackResponse 
} = require('../middleware/supportValidation');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || 'uploads/support/';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'support-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 
                         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Client Routes

// Get support categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await supportService.getSupportCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching support categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support categories',
      error: error.message
    });
  }
});

// Submit new support ticket
router.post('/tickets', authenticate, upload.array('attachments', 5), ...validateSupportTicket, async (req, res) => {
  try {
    const { order_id, subject, message, category, priority } = req.body;
    const user_id = req.user.id;
    const attachments = req.files || [];

    console.log(`🎫 Creating new support ticket from mobile app - User: ${user_id}, Subject: ${subject}`);

    const ticket = await supportService.createTicket({
      user_id,
      order_id: order_id || null,
      subject,
      message,
      category,
      priority,
      attachments
    });

    console.log(`✅ Support ticket created successfully - ID: ${ticket.id}, Number: ${ticket.ticket_number}`);

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket',
      error: error.message
    });
  }
});

// Get client's tickets
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { page = 1, limit = 10, status, category } = req.query;

    const result = await supportService.getClientTickets(user_id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      category
    });

    res.json({
      success: true,
      data: result.tickets,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching client tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
});

// Get specific ticket details
router.get('/tickets/:id', authenticate, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const user_id = req.user.id;

    const ticketDetails = await supportService.getTicketDetails(ticketId, user_id);

    res.json({
      success: true,
      data: ticketDetails
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket details',
      error: error.message
    });
  }
});

// Add reply to ticket
router.post('/tickets/:id/replies', authenticate, upload.array('attachments', 3), ...validateReply, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const user_id = req.user.id;
    const { message } = req.body;
    const attachments = req.files || [];

    console.log(`💬 Adding reply from mobile app - Ticket: ${ticketId}, User: ${user_id}, Message: ${message.substring(0, 50)}...`);

    const reply = await supportService.addReply(ticketId, {
      user_id,
      message,
      attachments
    });

    console.log(`✅ Reply added successfully from mobile app - Reply ID: ${reply.id}`);

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: reply
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reply',
      error: error.message
    });
  }
});

// Submit feedback
router.post('/feedback', authenticate, ...validateFeedback, async (req, res) => {
  try {
    const { order_id, rating, subject, message, category } = req.body;
    const user_id = req.user.id;

    const feedback = await supportService.submitFeedback({
      user_id,
      order_id: order_id || null,
      rating,
      subject,
      message,
      category
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
});

// Admin Routes

// Get all tickets for admin
router.get('/admin/tickets', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      category, 
      assigned_admin_id, 
      search,
      createdAfter,
      createdBefore,
      date_from,
      date_to
    } = req.query;

    // Support both parameter naming conventions
    const startDate = createdAfter || date_from;
    const endDate = createdBefore || date_to;

    // Convert date_from/date_to (YYYY-MM-DD) to proper datetime format for database
    let processedStartDate = startDate;
    let processedEndDate = endDate;

    if (startDate && !startDate.includes('T')) {
      // If it's just a date (YYYY-MM-DD), add time to start of day
      processedStartDate = `${startDate}T00:00:00.000Z`;
    }

    if (endDate && !endDate.includes('T')) {
      // If it's just a date (YYYY-MM-DD), add time to end of day
      processedEndDate = `${endDate}T23:59:59.999Z`;
    }

    const result = await supportService.getAdminTickets({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      priority,
      category,
      assigned_admin_id,
      search,
      createdAfter: processedStartDate,
      createdBefore: processedEndDate
    });

    res.json({
      success: true,
      data: result.tickets,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
});

// Get ticket details for admin
router.get('/admin/tickets/:id', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const ticketId = req.params.id;
    const ticketDetails = await supportService.getTicketDetails(ticketId);

    res.json({
      success: true,
      data: ticketDetails
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket details',
      error: error.message
    });
  }
});

// Add admin reply to ticket
router.post('/admin/tickets/:id/replies', authenticate, upload.array('attachments', 3), ...validateReply, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const ticketId = req.params.id;
    const admin_id = req.user.id;
    const { message, is_internal_note = false } = req.body;
    const attachments = req.files || [];

    // Debug log the incoming request
    console.log(`🎫 Admin reply request for ticket ${ticketId}:`, {
      admin_id,
      message: message?.substring(0, 50) + '...',
      is_internal_note: is_internal_note,
      is_internal_note_type: typeof is_internal_note,
      attachments_count: attachments.length
    });

    const reply = await supportService.addReply(ticketId, {
      admin_id,
      message,
      is_internal_note: is_internal_note === 'true' || is_internal_note === true,
      attachments
    });

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: reply
    });
  } catch (error) {
    console.error('Error adding admin reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reply',
      error: error.message
    });
  }
});

// Update ticket status
router.patch('/admin/tickets/:id/status', authenticate, ...validateTicketStatus, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const ticketId = req.params.id;
    const { status } = req.body;
    const admin_id = req.user.id;

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    await supportService.updateTicketStatus(ticketId, status, admin_id);

    res.json({
      success: true,
      message: 'Ticket status updated successfully'
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket status',
      error: error.message
    });
  }
});

// Assign ticket to admin
router.patch('/admin/tickets/:id/assign', authenticate, ...validateTicketAssignment, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const ticketId = req.params.id;
    const { admin_id } = req.body;
    const assignedBy = req.user.id;

    await supportService.assignTicket(ticketId, admin_id, assignedBy);

    res.json({
      success: true,
      message: 'Ticket assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign ticket',
      error: error.message
    });
  }
});

// Get support statistics
router.get('/admin/statistics', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const stats = await supportService.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Debug endpoint to check notification system status
router.get('/admin/notification-debug', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { executeQuery } = require('../config/database');
    const fcmService = require('../services/fcmService');
    
    // Get recent admin replies and their notification status
    const recentReplies = await executeQuery(`
      SELECT 
        sr.id as reply_id,
        sr.ticket_id,
        sr.message,
        sr.is_internal_note,
        sr.created_at as reply_created,
        st.ticket_number,
        st.user_id,
        COUNT(ut.token) as user_fcm_tokens
      FROM support_replies sr
      JOIN support_tickets st ON sr.ticket_id = st.id
      LEFT JOIN user_fcm_tokens ut ON st.user_id = ut.user_id AND ut.is_active = 1
      WHERE sr.is_admin_reply = 1 
      AND sr.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY sr.id, sr.ticket_id, sr.message, sr.is_internal_note, sr.created_at, st.ticket_number, st.user_id
      ORDER BY sr.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        fcm_service_initialized: fcmService.isInitialized,
        recent_admin_replies: recentReplies,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in notification debug:', error);
    res.status(500).json({
      success: false,
      message: 'Debug check failed',
      error: error.message
    });
  }
});

// Get all feedback for admin
router.get('/admin/feedback', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { page = 1, limit = 20, rating, category, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const queryParams = [];
    const whereConditions = [];

    if (rating) {
      whereConditions.push('f.rating = ?');
      queryParams.push(rating);
    }

    if (category) {
      whereConditions.push('f.category = ?');
      queryParams.push(category);
    }

    if (status) {
      whereConditions.push('f.status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const { executeQuery } = require('../config/database');
    const [{ total }] = await executeQuery(`
      SELECT COUNT(*) as total FROM feedback f ${whereClause}
    `, queryParams);

    // Get feedback
    const feedback = await executeQuery(`
      SELECT 
        f.*,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email,
        o.order_number as order_number,
        CONCAT(a.first_name, ' ', a.last_name) as admin_name
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN orders o ON f.order_id = o.id
      LEFT JOIN users a ON f.responded_by_admin_id = a.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `, queryParams);

    res.json({
      success: true,
      data: feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message
    });
  }
});

// Respond to feedback
router.post('/admin/feedback/:id/respond', authenticate, ...validateFeedbackResponse, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const feedbackId = req.params.id;
    const { response, status = 'approved' } = req.body;
    const admin_id = req.user.id;

    const { executeQuery } = require('../config/database');
    await executeQuery(`
      UPDATE feedback 
      SET admin_response = ?, responded_by_admin_id = ?, responded_at = CURRENT_TIMESTAMP, status = ?
      WHERE id = ?
    `, [response, admin_id, status, feedbackId]);

    res.json({
      success: true,
      message: 'Feedback response added successfully'
    });
  } catch (error) {
    console.error('Error responding to feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to feedback',
      error: error.message
    });
  }
});

module.exports = router;
