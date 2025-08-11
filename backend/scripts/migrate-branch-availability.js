#!/usr/bin/env node

/**
 * Simple Migration Runner for Branch Availability
 * This script adds the missing is_available column to branch_inventory table
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Database configuration from environment or defaults
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fecs_db',
  charset: 'utf8mb4',
  multipleStatements: true
};

async function runMigration() {
  let connection = null;

  try {
    console.log('🔄 Connecting to database...');
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Check if column already exists
    console.log('\n🔄 Checking if is_available column exists...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'branch_inventory' AND COLUMN_NAME = 'is_available'
    `, [dbConfig.database]);

    if (columns.length > 0) {
      console.log('✅ is_available column already exists - no migration needed');
      return true;
    }

    console.log('🔄 Adding is_available column to branch_inventory table...');
    
    // Add the column
    await connection.execute(`
      ALTER TABLE branch_inventory 
      ADD COLUMN is_available TINYINT(1) NOT NULL DEFAULT 1 
      COMMENT 'Whether product is available in this branch (1=available, 0=unavailable)' 
      AFTER price_override
    `);

    // Add index
    console.log('🔄 Adding index for is_available column...');
    await connection.execute(`
      ALTER TABLE branch_inventory 
      ADD INDEX idx_branch_inventory_available (is_available)
    `);

    console.log('✅ Migration completed successfully!');
    
    // Verify the migration
    console.log('\n🔄 Verifying migration...');
    const [newColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'branch_inventory'
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);

    console.log('\n📊 Current branch_inventory table structure:');
    newColumns.forEach(col => {
      const marker = col.COLUMN_NAME === 'is_available' ? '✨ ' : '   ';
      console.log(`${marker}${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULLABLE'}) ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
    });

    // Check if we have any data to work with
    const [dataCount] = await connection.execute('SELECT COUNT(*) as count FROM branch_inventory');
    console.log(`\n📦 Found ${dataCount[0].count} branch inventory records`);

    if (dataCount[0].count > 0) {
      const [sampleData] = await connection.execute(`
        SELECT id, branch_id, product_id, stock_quantity, is_available 
        FROM branch_inventory 
        LIMIT 3
      `);
      
      console.log('\n📋 Sample data:');
      sampleData.forEach(row => {
        console.log(`   ID: ${row.id}, Branch: ${row.branch_id}, Product: ${row.product_id}, Stock: ${row.stock_quantity}, Available: ${row.is_available ? 'Yes' : 'No'}`);
      });
    }

    console.log('\n🎉 SUCCESS!');
    console.log('The bulk activate/deactivate functionality should now work correctly.');
    console.log('Please restart your backend server and test the functionality.');

    return true;

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Database access denied. Please check:');
      console.log('   - Your .env file has correct DB_USER and DB_PASSWORD');
      console.log('   - The database user has ALTER privileges');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log(`\n💡 Database "${dbConfig.database}" not found. Please check:`)
      console.log('   - Your .env file has correct DB_NAME');
      console.log('   - The database exists');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused. Please check:');
      console.log('   - MySQL/MariaDB is running');
      console.log('   - Host and port are correct in .env file');
    }

    return false;

  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔚 Database connection closed');
    }
  }
}

// Command line interface
if (require.main === module) {
  console.log('🚀 FECS Branch Availability Migration');
  console.log('=====================================');
  
  runMigration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error.message);
      process.exit(1);
    });
}

module.exports = { runMigration };
