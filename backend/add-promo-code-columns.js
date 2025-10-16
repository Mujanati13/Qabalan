const mysql = require('mysql2/promise');
require('dotenv').config();

async function addPromoColumns() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bakery_db'
    });

    console.log('Connected to database');

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME IN ('promo_code', 'promo_discount_amount')
    `, [process.env.DB_NAME || 'bakery_db']);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    if (existingColumns.includes('promo_code') && existingColumns.includes('promo_discount_amount')) {
      console.log('✓ Promo columns already exist in orders table');
      return;
    }

    console.log('Adding promo code columns to orders table...');

    // Add promo_code column if it doesn't exist
    if (!existingColumns.includes('promo_code')) {
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN promo_code VARCHAR(50) DEFAULT NULL COMMENT 'Applied promo code' 
        AFTER discount_amount
      `);
      console.log('✓ Added promo_code column');
    }

    // Add promo_discount_amount column if it doesn't exist
    if (!existingColumns.includes('promo_discount_amount')) {
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN promo_discount_amount DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Discount amount from promo code' 
        AFTER promo_code
      `);
      console.log('✓ Added promo_discount_amount column');
    }

    // Add index for faster promo code lookups
    try {
      await connection.query('CREATE INDEX idx_promo_code ON orders(promo_code)');
      console.log('✓ Added index on promo_code');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('✓ Index already exists');
      } else {
        throw error;
      }
    }

    // Verify the columns were added
    const [tableStructure] = await connection.query('DESCRIBE orders');
    const promoFields = tableStructure.filter(field => 
      field.Field === 'promo_code' || field.Field === 'promo_discount_amount'
    );

    console.log('\n✓ Migration completed successfully!');
    console.log('\nPromo code fields in orders table:');
    console.table(promoFields);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

// Run the migration
addPromoColumns();
