const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const fcmService = require('../services/fcmService');

const router = express.Router();

// Admin routes will be implemented here
router.get('/dashboard', (req, res) => {
  res.json({ message: 'Admin dashboard route - coming soon' });
});

/**
 * Send test notification
 * @route   POST /api/admin/test-notification
 * @desc    Send a test push notification
 * @access  Private (authenticated users)
 */
router.post('/test-notification', authenticate, async (req, res, next) => {
  try {
    const { title, body, data, token } = req.body;

    if (!title || !body || !token) {
      return res.status(400).json({
        success: false,
        message: 'Title, body, and token are required'
      });
    }

    // Send notification
    const result = await fcmService.sendToToken(token, {
      title,
      body,
      data: data || {}
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Test notification sent successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send test notification error:', error);
    next(error);
  }
});

module.exports = router;
