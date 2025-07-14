const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { authenticate } = require('../middleware/auth');

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

// Get settings by category
router.get('/category/:category', authenticate, async (req, res) => {
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
    
    // Start transaction
    await executeQuery('START TRANSACTION');
    
    try {
      for (const setting of settings) {
        const { setting_key, setting_value, category } = setting;
        
        const updateQuery = `
          UPDATE settings 
          SET setting_value = ?, updated_at = NOW()
          WHERE setting_key = ? AND category = ?
        `;
        
        await executeQuery(updateQuery, [setting_value, setting_key, category]);
      }
      
      // Commit transaction
      await executeQuery('COMMIT');
      
      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
      
    } catch (error) {
      // Rollback transaction
      await executeQuery('ROLLBACK');
      throw error;
    }
    
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

module.exports = router;
