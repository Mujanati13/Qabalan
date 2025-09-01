const express = require('express');
const request = require('supertest');
const app = require('./app'); // Import your main app

async function testSMSVerification() {
  console.log('🧪 Testing SMS Verification Flow...\n');

  try {
    // Test 1: Send SMS verification
    console.log('📱 Test 1: Sending SMS verification code...');
    const smsResponse = await request(app)
      .post('/api/auth/send-sms-verification')
      .send({
        phone: '962795555555', // Test Jordan phone number
        language: 'en'
      });

    console.log(`Status: ${smsResponse.status}`);
    console.log(`Response:`, smsResponse.body);

    if (smsResponse.status === 200) {
      console.log('✅ SMS verification endpoint working!');
    } else {
      console.log('❌ SMS verification endpoint failed');
    }

    // Test 2: Verify if verification code was stored in database
    console.log('\n📋 Test 2: Checking database for verification code...');
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'fecs_db'
    });

    const [rows] = await connection.execute(`
      SELECT * FROM verification_codes 
      WHERE phone = ? AND type = 'sms_verification' 
      ORDER BY created_at DESC LIMIT 1
    `, ['962795555555']);

    if (rows.length > 0) {
      console.log('✅ Verification code stored in database:');
      console.table(rows);
    } else {
      console.log('❌ No verification code found in database');
    }

    await connection.end();

    console.log('\n🧪 SMS Verification Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Start the server and run tests
const PORT = 3015;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  setTimeout(() => {
    testSMSVerification().finally(() => {
      server.close();
      console.log('\n✅ Test server closed');
      process.exit(0);
    });
  }, 1000);
});
