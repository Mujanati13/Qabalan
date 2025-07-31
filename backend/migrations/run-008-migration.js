const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../config/database');

async function runBXGYMigration() {
  try {
    console.log('Starting BXGY migration...');
    
    // Step 1: Update enum
    console.log('Updating discount_type enum...');
    await executeQuery(`
      ALTER TABLE promo_codes 
      MODIFY COLUMN discount_type ENUM('percentage', 'fixed_amount', 'free_shipping', 'bxgy') 
      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    `);
    console.log('✓ Enum updated successfully');
    
    // Step 2: Create BXGY conditions table
    console.log('Creating promo_bxgy_conditions table...');
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS promo_bxgy_conditions (
        id INT NOT NULL AUTO_INCREMENT,
        promo_code_id INT NOT NULL,
        buy_quantity INT NOT NULL DEFAULT 1,
        get_quantity INT NOT NULL DEFAULT 1,
        buy_type ENUM('any', 'specific_products', 'specific_categories', 'mixed') 
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'any',
        get_type ENUM('same_product', 'specific_products', 'specific_categories', 'cheapest_from_buy', 'customer_choice') 
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'same_product',
        buy_product_ids JSON NULL COMMENT 'Array of product IDs that qualify for buy condition',
        buy_category_ids JSON NULL COMMENT 'Array of category IDs that qualify for buy condition',
        get_product_ids JSON NULL COMMENT 'Array of product IDs that can be received free',
        get_category_ids JSON NULL COMMENT 'Array of category IDs that can be received free',
        max_applications_per_order INT NULL COMMENT 'Maximum times this BXGY can be applied in a single order',
        max_applications_per_customer INT NULL COMMENT 'Maximum times per customer lifetime',
        apply_to_cheapest TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Apply discount to cheapest qualifying items',
        customer_chooses_free_item TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Allow customer to choose free item',
        min_buy_amount DECIMAL(10,2) NULL COMMENT 'Minimum amount required for buy items',
        max_get_amount DECIMAL(10,2) NULL COMMENT 'Maximum value of free items',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY fk_bxgy_conditions_promo (promo_code_id),
        KEY idx_buy_type (buy_type),
        KEY idx_get_type (get_type),
        KEY idx_bxgy_active (is_active),
        CONSTRAINT fk_bxgy_conditions_promo 
          FOREIGN KEY (promo_code_id) REFERENCES promo_codes (id) 
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ BXGY conditions table created successfully');
    
    // Step 3: Create BXGY combinations table
    console.log('Creating promo_bxgy_combinations table...');
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS promo_bxgy_combinations (
        id INT NOT NULL AUTO_INCREMENT,
        bxgy_condition_id INT NOT NULL,
        combination_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        buy_items JSON NOT NULL COMMENT 'Specific buy items configuration',
        get_items JSON NOT NULL COMMENT 'Specific get items configuration',
        priority INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY fk_bxgy_combinations_condition (bxgy_condition_id),
        KEY idx_priority (priority),
        CONSTRAINT fk_bxgy_combinations_condition 
          FOREIGN KEY (bxgy_condition_id) REFERENCES promo_bxgy_conditions (id) 
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ BXGY combinations table created successfully');
    
    // Step 4: Add sample BXGY promo codes
    console.log('Adding sample BXGY promo codes...');
    try {
      await executeQuery(`
        INSERT IGNORE INTO promo_codes (
          code, title_en, title_ar, description_en, description_ar,
          discount_type, discount_value, min_order_amount, usage_limit, 
          valid_from, valid_until, is_active
        ) VALUES
        (
          'BOGO50', 
          'Buy One Get One 50% Off', 
          'اشتر واحد واحصل على الثاني بخصم 50%', 
          'Buy any item and get the second one at 50% off', 
          'اشتر أي منتج واحصل على الثاني بخصم 50%', 
          'bxgy', 
          50.00, 
          NULL, 
          NULL, 
          NOW(), 
          DATE_ADD(NOW(), INTERVAL 30 DAY), 
          1
        )
      `);
      
      await executeQuery(`
        INSERT IGNORE INTO promo_codes (
          code, title_en, title_ar, description_en, description_ar,
          discount_type, discount_value, min_order_amount, usage_limit, 
          valid_from, valid_until, is_active
        ) VALUES
        (
          'BOGOFREE', 
          'Buy One Get One Free', 
          'اشتر واحد واحصل على الثاني مجاناً', 
          'Buy any item and get the second one absolutely free', 
          'اشتر أي منتج واحصل على الثاني مجاناً تماماً', 
          'bxgy', 
          100.00, 
          NULL, 
          100, 
          NOW(), 
          DATE_ADD(NOW(), INTERVAL 30 DAY), 
          1
        )
      `);
      console.log('✓ Sample promo codes added successfully');
    } catch (error) {
      console.log('⚠ Sample data already exists or failed to insert:', error.message);
    }
    
    console.log('✅ BXGY migration completed successfully!');
    
    // Verify the changes
    console.log('\nVerifying migration...');
    
    // Check if discount_type enum was updated
    const [enumResult] = await executeQuery(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'promo_codes' 
      AND COLUMN_NAME = 'discount_type'
    `);
    
    if (enumResult.length > 0) {
      console.log('✓ Discount type enum:', enumResult[0].COLUMN_TYPE);
    }
    
    // Check if BXGY tables were created
    const tablesResult = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('promo_bxgy_conditions', 'promo_bxgy_combinations')
    `);
    
    console.log('✓ BXGY tables created:', tablesResult.map(t => t.TABLE_NAME).join(', '));
    
    // Check sample data
    const [promoCount] = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM promo_codes 
      WHERE discount_type = 'bxgy'
    `);
    
    console.log(`✓ BXGY promo codes: ${promoCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runBXGYMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runBXGYMigration };
