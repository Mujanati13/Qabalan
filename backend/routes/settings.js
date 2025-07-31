const express = require('express');
const router = express.Router();
const { executeQuery, executeTransaction } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const globalDisableScheduler = require('../services/globalDisableScheduler');

// Get all settings
router.get('/', authenticate, async (req, res) => {
  try {
    const query = `
      SELECT * FROM settings 
      ORDER BY category, setting_key
    `;
    
    const result = await executeQuery(query);
    
    // Group settings by category
    const groupedSettings = result.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: groupedSettings,
      message: 'Settings retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
});

// Get public settings (for web client) - NO AUTHENTICATION REQUIRED
router.get('/public', async (req, res) => {
  try {
    const query = `
      SELECT setting_key, setting_value, category 
      FROM settings 
      WHERE is_public = 1 OR category IN ('app_config', 'home_page', 'theme')
      ORDER BY category, setting_key
    `;
    
    const result = await executeQuery(query);
    
    // Group settings by category
    const groupedSettings = result.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: groupedSettings,
      message: 'Public settings retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public settings',
      error: error.message
    });
  }
});

// Get settings by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const query = `
      SELECT * FROM settings 
      WHERE category = ?
      ORDER BY setting_key
    `;
    
    const result = await executeQuery(query, [category]);
    
    res.json({
      success: true,
      data: result,
      message: `Settings for category '${category}' retrieved successfully`
    });
    
  } catch (error) {
    console.error('Error fetching settings by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
});

// Update multiple settings
router.put('/bulk', authenticate, async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: 'Settings array is required'
      });
    }
    
    // Process each setting individually without transactions
    const results = [];
    let errors = [];
    
    for (const setting of settings) {
      try {
        const { setting_key, setting_value, category } = setting;
        
        const updateQuery = `
          UPDATE settings 
          SET setting_value = ?, updated_at = NOW()
          WHERE setting_key = ? AND category = ?
        `;
        
        const result = await executeQuery(updateQuery, [setting_value, setting_key, category]);
        results.push({ setting_key, category, success: true });
        
      } catch (error) {
        console.error(`Error updating setting ${setting.setting_key}:`, error);
        errors.push({ 
          setting_key: setting.setting_key, 
          category: setting.category, 
          error: error.message 
        });
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some settings failed to update',
        results,
        errors
      });
    }
    
    res.json({
      success: true,
      message: 'All settings updated successfully',
      results
    });
    
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
});

// Update single setting
router.put('/:category/:key', authenticate, async (req, res) => {
  try {
    const { category, key } = req.params;
    const { setting_value } = req.body;
    
    if (setting_value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'setting_value is required'
      });
    }
    
    const query = `
      UPDATE settings 
      SET setting_value = ?, updated_at = NOW()
      WHERE setting_key = ? AND category = ?
    `;
    
    const result = await executeQuery(query, [setting_value, key, category]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Setting updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting',
      error: error.message
    });
  }
});

// Create new setting
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      setting_key,
      setting_value,
      category,
      description,
      setting_type = 'text',
      is_public = false
    } = req.body;
    
    if (!setting_key || !category) {
      return res.status(400).json({
        success: false,
        message: 'setting_key and category are required'
      });
    }
    
    const query = `
      INSERT INTO settings (
        setting_key, setting_value, category, description, 
        setting_type, is_public, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await executeQuery(query, [
      setting_key,
      setting_value || '',
      category,
      description || '',
      setting_type,
      is_public
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Setting created successfully'
    });
    
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Setting with this key and category already exists'
      });
    }
    
    console.error('Error creating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create setting',
      error: error.message
    });
  }
});

// Delete setting
router.delete('/:category/:key', authenticate, async (req, res) => {
  try {
    const { category, key } = req.params;
    
    const query = `
      DELETE FROM settings 
      WHERE setting_key = ? AND category = ?
    `;
    
    const result = await executeQuery(query, [key, category]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete setting',
      error: error.message
    });
  }
});

// Reset settings to default for a category
router.post('/reset/:category', authenticate, async (req, res) => {
  try {
    const { category } = req.params;
    
    // Define default settings by category
    const defaultSettings = {
      general: {
        site_name: 'FECS Admin',
        site_description: 'Food E-Commerce System',
        timezone: 'UTC',
        date_format: 'YYYY-MM-DD',
        currency: 'USD',
        currency_symbol: '$'
      },
      email: {
        smtp_host: '',
        smtp_port: '587',
        smtp_user: '',
        smtp_password: '',
        smtp_encryption: 'tls',
        from_email: '',
        from_name: 'FECS System'
      },
      notification: {
        enable_email_notifications: 'true',
        enable_push_notifications: 'true',
        enable_sms_notifications: 'false',
        order_notifications: 'true',
        admin_notifications: 'true'
      },
      order: {
        default_order_status: 'pending',
        auto_accept_orders: 'false',
        order_timeout_minutes: '30',
        max_order_items: '50'
      },
      payment: {
        enable_cash_payment: 'true',
        enable_card_payment: 'true',
        enable_online_payment: 'false',
        tax_rate: '0.00',
        delivery_fee: '0.00'
      }
    };
    
    if (!defaultSettings[category]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }
    
    // Start transaction
    await executeQuery('START TRANSACTION');
    
    try {
      // Delete existing settings for category
      await executeQuery('DELETE FROM settings WHERE category = ?', [category]);
      
      // Insert default settings
      const defaults = defaultSettings[category];
      for (const [key, value] of Object.entries(defaults)) {
        const insertQuery = `
          INSERT INTO settings (
            setting_key, setting_value, category, 
            setting_type, is_public, created_at, updated_at
          ) VALUES (?, ?, ?, 'text', false, NOW(), NOW())
        `;
        
        await executeQuery(insertQuery, [key, value, category]);
      }
      
      // Commit transaction
      await executeQuery('COMMIT');
      
      res.json({
        success: true,
        message: `Settings for category '${category}' reset to defaults`
      });
      
    } catch (error) {
      // Rollback transaction
      await executeQuery('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/settings/global-disable
 * @desc    Manually trigger global disable/enable
 * @access  Admin only
 */
router.post('/global-disable', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { action, notes } = req.body; // action: 'disable' or 'enable'
    
    if (!['disable', 'enable'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "disable" or "enable"'
      });
    }
    
    // Use the scheduler service for manual triggers
    await globalDisableScheduler.manualTrigger(action, req.user.id, notes || null);
    
    res.json({
      success: true,
      message: `Global ${action} completed successfully`,
      data: {
        action,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/settings/global-disable/status
 * @desc    Get global disable scheduler status
 * @access  Admin/Staff only
 */
router.get('/global-disable/status', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const status = globalDisableScheduler.getStatus();
    const settings = await globalDisableScheduler.getSettings();
    
    res.json({
      success: true,
      data: {
        scheduler: status,
        settings: settings
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/settings/global-disable/logs
 * @desc    Get global disable/enable logs
 * @access  Admin, Staff
 */
router.get('/global-disable/logs', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit) || 50)); // Ensure reasonable limits
    const pageNum = Math.max(1, parseInt(page) || 1);
    const offset = (pageNum - 1) * limitNum;
    
    // Use string interpolation for LIMIT/OFFSET as MySQL has issues with prepared statements for these
    const logs = await executeQuery(`
      SELECT 
        gdl.*,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as admin_username
      FROM global_disable_logs gdl
      LEFT JOIN users u ON gdl.admin_user_id = u.id
      ORDER BY gdl.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `);
    
    const totalCount = await executeQuery(`
      SELECT COUNT(*) as count FROM global_disable_logs
    `);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        total: totalCount[0].count,
        limit: limitNum,
        page: pageNum,
        totalPages: Math.ceil(totalCount[0].count / limitNum)
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/settings/system
 * @desc    Get system settings (global disable time, etc.)
 * @access  Admin, Staff
 */
router.get('/system', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT 
        id,
        setting_key,
        setting_value,
        setting_type,
        description_en,
        description_ar,
        is_configurable,
        requires_restart,
        category,
        sort_order,
        updated_at
      FROM system_settings
      WHERE 1=1
    `;
    const params = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category, sort_order, setting_key';
    
    const settings = await executeQuery(query, params);
    
    // Group by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        settings: settings,
        grouped: groupedSettings,
        categories: [...new Set(settings.map(s => s.category))]
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/settings/system/:key
 * @desc    Update a system setting
 * @access  Admin only
 */
router.put('/system/:key', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { key } = req.params;
    const { setting_value } = req.body;
    
    if (setting_value === undefined || setting_value === null) {
      return res.status(400).json({
        success: false,
        message: 'Setting value is required'
      });
    }
    
    // Check if setting exists and is configurable
    const [existing] = await executeQuery(`
      SELECT * FROM system_settings WHERE setting_key = ?
    `, [key]);
    
    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }
    
    if (!existing[0].is_configurable) {
      return res.status(403).json({
        success: false,
        message: 'This setting is not configurable'
      });
    }
    
    // Validate value based on type
    const setting = existing[0];
    let validatedValue = setting_value;
    
    switch (setting.setting_type) {
      case 'boolean':
        if (typeof setting_value === 'string') {
          validatedValue = setting_value.toLowerCase() === 'true';
        }
        validatedValue = validatedValue ? 'true' : 'false';
        break;
        
      case 'number':
        const numValue = parseFloat(setting_value);
        if (isNaN(numValue)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid number value'
          });
        }
        validatedValue = numValue.toString();
        break;
        
      case 'time':
        // Validate time format (HH:mm:ss)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
        if (!timeRegex.test(setting_value)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid time format. Use HH:mm:ss (24-hour format)'
          });
        }
        break;
        
      case 'json':
        try {
          JSON.parse(setting_value);
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid JSON format'
          });
        }
        break;
    }
    
    // Update the setting
    await executeQuery(`
      UPDATE system_settings 
      SET setting_value = ?, updated_at = NOW() 
      WHERE setting_key = ?
    `, [validatedValue, key]);
    
    // If this is a global disable setting, update the scheduler
    const globalDisableKeys = [
      'global_disable_time_enabled',
      'global_disable_time',
      'global_enable_time',
      'global_disable_timezone'
    ];
    
    if (globalDisableKeys.includes(key)) {
      try {
        await globalDisableScheduler.updateSchedule();
        console.log('✓ Global disable scheduler updated after setting change');
      } catch (error) {
        console.error('⚠️ Failed to update scheduler:', error.message);
        // Don't fail the request, just log the warning
      }
    }
    
    // Get updated setting
    const [updated] = await executeQuery(`
      SELECT * FROM system_settings WHERE setting_key = ?
    `, [key]);
    
    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: updated[0],
      requires_restart: setting.requires_restart
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// Contact form submission endpoint
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message, recipientEmail } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Create contact_messages table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        recipient_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await executeQuery(createTableQuery);

    // Insert the contact message
    const insertQuery = `
      INSERT INTO contact_messages (name, email, subject, message, recipient_email, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;

    await executeQuery(insertQuery, [
      name, 
      email, 
      subject, 
      message, 
      recipientEmail || 'admin@qabalan.com'
    ]);

    // TODO: Implement email sending logic here
    // Example using nodemailer:
    // await sendContactEmail({ name, email, subject, message, recipientEmail });

    res.json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});
