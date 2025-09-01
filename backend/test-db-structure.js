const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseStructure() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'fecs_db',
      charset: 'utf8mb4'
    });

    console.log('✅ Database connection successful');

    // Check verification_codes table structure
    const [rows] = await connection.execute('DESCRIBE verification_codes');
    console.log('\n📋 verification_codes table structure:');
    console.table(rows);

    // Check if phone column exists
    const phoneColumn = rows.find(col => col.Field === 'phone');
    if (phoneColumn) {
      console.log('\n✅ Phone column exists in verification_codes table');
      console.log('Phone column details:', phoneColumn);
    } else {
      console.log('\n❌ Phone column missing - need to run migration 007');
    }

    // Check if users table has phone column
    const [userRows] = await connection.execute('DESCRIBE users');
    const userPhoneColumn = userRows.find(col => col.Field === 'phone');
    if (userPhoneColumn) {
      console.log('\n✅ Phone column exists in users table');
    } else {
      console.log('\n❌ Phone column missing in users table');
    }

    // Test SMS verification endpoint availability
    console.log('\n🔍 Checking if SMS verification functions exist...');
    const smsUtils = require('./utils/sms');
    if (smsUtils.sendSMS && smsUtils.sendVerificationSMS) {
      console.log('✅ SMS utility functions are available');
    } else {
      console.log('❌ SMS utility functions are missing');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabaseStructure();
