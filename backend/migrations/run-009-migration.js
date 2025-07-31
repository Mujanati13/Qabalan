const { executeQuery } = require('../config/database');

async function runGlobalDisableTimeMigration() {
  try {
    console.log('Starting Global Disable Time migration...');
    
    // Step 1: Create system_settings table
    console.log('Creating system_settings table...');
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT NOT NULL AUTO_INCREMENT,
        setting_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
        setting_value TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        setting_type ENUM('string', 'number', 'boolean', 'time', 'json') 
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string',
        description_en TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        description_ar TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        is_configurable TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this setting can be changed by admins',
        requires_restart TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether changing this setting requires system restart',
        category VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'general',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_setting_key (setting_key),
        KEY idx_category (category),
        KEY idx_configurable (is_configurable)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ System settings table created successfully');
    
    // Step 2: Insert default settings
    console.log('Inserting default system settings...');
    const settings = [
      {
        key: 'global_disable_time_enabled',
        value: 'false',
        type: 'boolean',
        desc_en: 'Enable global disable time for all products and categories',
        desc_ar: 'تفعيل وقت إيقاف عام لجميع المنتجات والفئات',
        category: 'operations',
        order: 1
      },
      {
        key: 'global_disable_time',
        value: '00:00:00',
        type: 'time',
        desc_en: 'Time when all products and categories will be automatically disabled (24-hour format)',
        desc_ar: 'الوقت الذي سيتم فيه إيقاف جميع المنتجات والفئات تلقائياً (تنسيق 24 ساعة)',
        category: 'operations',
        order: 2
      },
      {
        key: 'global_disable_timezone',
        value: 'UTC',
        type: 'string',
        desc_en: 'Timezone for global disable time',
        desc_ar: 'المنطقة الزمنية لوقت الإيقاف العام',
        category: 'operations',
        order: 3
      },
      {
        key: 'global_disable_action',
        value: 'hide',
        type: 'string',
        desc_en: 'Action to take when disable time is reached: hide or deactivate',
        desc_ar: 'الإجراء المتخذ عند الوصول لوقت الإيقاف: إخفاء أو إلغاء تفعيل',
        category: 'operations',
        order: 4
      },
      {
        key: 'global_disable_message_en',
        value: 'Our store is currently closed. Please check back later.',
        type: 'string',
        desc_en: 'Message to display when store is disabled (English)',
        desc_ar: 'الرسالة التي تظهر عند إغلاق المتجر (بالإنجليزية)',
        category: 'operations',
        order: 5
      },
      {
        key: 'global_disable_message_ar',
        value: 'متجرنا مغلق حالياً. يرجى العودة لاحقاً.',
        type: 'string',
        desc_en: 'Message to display when store is disabled (Arabic)',
        desc_ar: 'الرسالة التي تظهر عند إغلاق المتجر (بالعربية)',
        category: 'operations',
        order: 6
      },
      {
        key: 'global_enable_time',
        value: '06:00:00',
        type: 'time',
        desc_en: 'Time when all products and categories will be automatically re-enabled',
        desc_ar: 'الوقت الذي سيتم فيه إعادة تفعيل جميع المنتجات والفئات تلقائياً',
        category: 'operations',
        order: 7
      },
      {
        key: 'auto_enable_on_restart',
        value: 'true',
        type: 'boolean',
        desc_en: 'Automatically enable all products when system starts',
        desc_ar: 'تفعيل جميع المنتجات تلقائياً عند بدء تشغيل النظام',
        category: 'operations',
        order: 8
      }
    ];

    for (const setting of settings) {
      try {
        await executeQuery(`
          INSERT IGNORE INTO system_settings 
            (setting_key, setting_value, setting_type, description_en, description_ar, category, sort_order) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [setting.key, setting.value, setting.type, setting.desc_en, setting.desc_ar, setting.category, setting.order]);
      } catch (error) {
        console.log(`⚠ Setting ${setting.key} already exists or failed:`, error.message);
      }
    }
    console.log('✓ Default settings inserted successfully');
    
    // Step 3: Create global disable logs table
    console.log('Creating global_disable_logs table...');
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS global_disable_logs (
        id INT NOT NULL AUTO_INCREMENT,
        action ENUM('disabled', 'enabled', 'manual_override') 
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        trigger_type ENUM('scheduled', 'manual', 'system_start') 
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        affected_products INT DEFAULT 0,
        affected_categories INT DEFAULT 0,
        disable_time TIME NULL,
        admin_user_id INT NULL,
        notes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_action (action),
        KEY idx_trigger_type (trigger_type),
        KEY idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Global disable logs table created successfully');
    
    // Step 4: Add original_is_active columns to products and categories
    console.log('Adding original_is_active columns...');
    try {
      await executeQuery(`
        ALTER TABLE products 
        ADD COLUMN original_is_active TINYINT(1) NULL 
        COMMENT 'Original active state before global disable'
      `);
      console.log('✓ Added original_is_active to products table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠ original_is_active column already exists in products table');
      } else {
        throw error;
      }
    }
    
    try {
      await executeQuery(`
        ALTER TABLE categories 
        ADD COLUMN original_is_active TINYINT(1) NULL 
        COMMENT 'Original active state before global disable'
      `);
      console.log('✓ Added original_is_active to categories table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠ original_is_active column already exists in categories table');
      } else {
        throw error;
      }
    }
    
    // Step 5: Create additional indexes
    console.log('Creating performance indexes...');
    try {
      await executeQuery(`
        CREATE INDEX idx_system_settings_category_order 
        ON system_settings (category, sort_order)
      `);
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠ Index already exists');
      } else {
        console.log('⚠ Index creation failed:', error.message);
      }
    }
    
    console.log('✅ Global Disable Time migration completed successfully!');
    
    // Verification
    console.log('\nVerifying migration...');
    const settingsCount = await executeQuery(`
      SELECT COUNT(*) as count FROM system_settings WHERE category = 'operations'
    `);
    console.log(`✓ System settings created: ${settingsCount[0].count}`);
    
    const tablesResult = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('system_settings', 'global_disable_logs')
    `);
    console.log('✓ Tables created:', tablesResult.map(t => t.TABLE_NAME).join(', '));
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runGlobalDisableTimeMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runGlobalDisableTimeMigration };
