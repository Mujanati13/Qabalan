#!/usr/bin/env node

/**
 * Migration Script: Add phone column to user_addresses table
 * This script adds the missing phone column to the user_addresses table
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fecs_db',
  charset: 'utf8mb4'
};

async function runMigration() {
  console.log('🚀 Starting phone column migration...\n');
  
  let connection;
  
  try {
    // Create database connection
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully\n');
    
    // Read migration file
    const migrationFile = path.join(__dirname, '..', 'migrations', 'add_phone_to_addresses.sql');
    console.log('📄 Reading migration file:', migrationFile);
    
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    console.log('✅ Migration file loaded\n');
    
    // Check if phone column already exists
    console.log('🔍 Checking if phone column already exists...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_addresses' AND COLUMN_NAME = 'phone'
    `, [dbConfig.database]);
    
    if (columns.length > 0) {
      console.log('⚠️ Phone column already exists. Migration not needed.');
      console.log('✅ Migration completed successfully!\n');
      return;
    }
    
    console.log('➡️ Phone column does not exist. Proceeding with migration...\n');
    
    // Split SQL commands by semicolon and execute each one
    const sqlCommands = migrationSQL
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('--'))
      .join('\n')
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    console.log(`📋 Found ${sqlCommands.length} SQL commands to execute:\n`);
    
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      console.log(`${i + 1}. Executing: ${command.substring(0, 60)}...`);
      
      try {
        await connection.execute(command);
        console.log('   ✅ Success\n');
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        
        // If it's just a duplicate index error, continue
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log('   ℹ️ Index already exists, continuing...\n');
          continue;
        }
        
        throw error;
      }
    }
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const [verifyColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_addresses' 
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);
    
    console.log('📋 Current user_addresses table structure:');
    verifyColumns.forEach(col => {
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${nullable} ${defaultVal}`);
    });
    
    // Check specifically for phone column
    const phoneColumn = verifyColumns.find(col => col.COLUMN_NAME === 'phone');
    if (phoneColumn) {
      console.log('\n✅ Phone column successfully added!');
      console.log(`   Type: ${phoneColumn.DATA_TYPE}`);
      console.log(`   Nullable: ${phoneColumn.IS_NULLABLE}`);
    } else {
      throw new Error('Phone column was not added successfully');
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📱 Phone numbers can now be saved to user addresses.');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run the migration
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };
