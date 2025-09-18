const mysql = require('mysql2/promise');
require('dotenv').config();

async function addStockQuantityColumn() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'fecs_db'
    });

    console.log('✅ Connected to database');

    // Check if stock_quantity column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'fecs_db'}' 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'stock_quantity'
    `);

    if (columns.length > 0) {
      console.log('⚠️ stock_quantity column already exists in products table');
      return;
    }

    // Add stock_quantity column to products table
    await connection.execute(`
      ALTER TABLE products 
      ADD COLUMN stock_quantity INT NOT NULL DEFAULT 0 AFTER stock_status
    `);

    console.log('✅ Successfully added stock_quantity column to products table');

    // Add index for better performance
    await connection.execute(`
      CREATE INDEX idx_products_stock_quantity ON products(stock_quantity)
    `);

    console.log('✅ Successfully added index for stock_quantity column');

    // Show updated table structure
    const [tableStructure] = await connection.execute('DESCRIBE products');
    console.log('\n📋 Updated products table structure:');
    
    // Find the stock_quantity row
    const stockQuantityRow = tableStructure.find(row => row.Field === 'stock_quantity');
    if (stockQuantityRow) {
      console.log('✅ stock_quantity column details:', stockQuantityRow);
    }

  } catch (error) {
    console.error('❌ Error adding stock_quantity column:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  addStockQuantityColumn()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addStockQuantityColumn;