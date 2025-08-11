#!/usr/bin/env node

/**
 * Direct Database Phone Test
 * Test phone number saving directly in the database
 */

const mysql = require('mysql2/promise');

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

async function testPhoneSaving() {
  console.log('🔍 Testing phone number saving to database...\n');
  
  let connection;
  
  try {
    // Create database connection
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully\n');
    
    // Check current table structure
    console.log('🔍 Checking user_addresses table structure...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_addresses' 
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);
    
    console.log('📋 Table columns:');
    columns.forEach(col => {
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${nullable} ${defaultVal}`);
    });
    
    // Check if phone column exists
    const phoneColumn = columns.find(col => col.COLUMN_NAME === 'phone');
    if (!phoneColumn) {
      console.log('❌ Phone column does not exist!');
      return;
    }
    console.log('✅ Phone column exists\n');
    
    // Test 1: Create a test address with phone
    console.log('📝 Test 1: Creating address with phone number...');
    const testPhone = '+962791234567';
    const [insertResult] = await connection.execute(`
      INSERT INTO user_addresses (
        user_id, name, phone, city_id, area_id, building_no, details, is_default, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `, [1, 'Test Address', testPhone, 1, 1, '123', 'Test details', 0]);
    
    const addressId = insertResult.insertId;
    console.log(`✅ Address created with ID: ${addressId}`);
    
    // Test 2: Retrieve the address and check phone
    console.log('📖 Test 2: Retrieving address to verify phone...');
    const [addresses] = await connection.execute(
      'SELECT id, name, phone, building_no, details FROM user_addresses WHERE id = ?',
      [addressId]
    );
    
    if (addresses.length > 0) {
      const address = addresses[0];
      console.log('📄 Retrieved address:');
      console.log(`   ID: ${address.id}`);
      console.log(`   Name: ${address.name}`);
      console.log(`   Phone: "${address.phone}"`);
      console.log(`   Building: ${address.building_no}`);
      console.log(`   Details: ${address.details}`);
      
      if (address.phone === testPhone) {
        console.log('✅ Phone number saved correctly!');
      } else {
        console.log(`❌ Phone number mismatch! Expected: "${testPhone}", Got: "${address.phone}"`);
      }
    } else {
      console.log('❌ Address not found after creation');
    }
    
    // Test 3: Update the phone number
    console.log('\n📝 Test 3: Updating phone number...');
    const newPhone = '+962799876543';
    await connection.execute(
      'UPDATE user_addresses SET phone = ?, updated_at = NOW() WHERE id = ?',
      [newPhone, addressId]
    );
    console.log('✅ Phone update query executed');
    
    // Test 4: Verify the update
    console.log('📖 Test 4: Verifying phone update...');
    const [updatedAddresses] = await connection.execute(
      'SELECT id, name, phone FROM user_addresses WHERE id = ?',
      [addressId]
    );
    
    if (updatedAddresses.length > 0) {
      const updatedAddress = updatedAddresses[0];
      console.log(`📱 Updated phone: "${updatedAddress.phone}"`);
      
      if (updatedAddress.phone === newPhone) {
        console.log('✅ Phone number updated correctly!');
      } else {
        console.log(`❌ Phone update failed! Expected: "${newPhone}", Got: "${updatedAddress.phone}"`);
      }
    }
    
    // Clean up: Delete test address
    console.log('\n🧹 Cleaning up test data...');
    await connection.execute('DELETE FROM user_addresses WHERE id = ?', [addressId]);
    console.log('✅ Test address deleted');
    
    console.log('\n🎉 Phone number database test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run the test
if (require.main === module) {
  testPhoneSaving().catch(console.error);
}

module.exports = { testPhoneSaving };
