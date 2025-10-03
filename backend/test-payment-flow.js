// Test script to demonstrate the PHP-equivalent payment flow
const express = require('express');
const mysql = require('mysql2');

// Database connection (adjust credentials as needed)
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fecs_db'
});

async function createTestOrder() {
  const orderId = Math.floor(Math.random() * 10000) + 1000;
  const totalAmount = '25.50';
  const currency = 'JOD';
  
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO orders (id, total_amount, currency, status, created_at) VALUES (?, ?, ?, 'pending', NOW())`;
    db.query(sql, [orderId, totalAmount, currency], (err, result) => {
      if (err) reject(err);
      else resolve({ id: orderId, total_amount: totalAmount, currency });
    });
  });
}

async function testPaymentFlow() {
  try {
    console.log('🧪 Testing PHP-equivalent payment flow...\n');
    
    // Create test order
    const order = await createTestOrder();
    console.log('✅ Created test order:', order);
    
    // Show the URLs to test
    const baseUrl = 'http://localhost:3000/api/payments';
    console.log('\n🔗 Test URLs:');
    console.log(`Payment page: ${baseUrl}/mpgs/payment/view?orders_id=${order.id}`);
    console.log(`Payment page (Arabic): ${baseUrl}/mpgs/payment/view?orders_id=${order.id}&lang=ar`);
    console.log(`Order details: ${baseUrl}/mpgs/order/${order.id}`);
    
    console.log('\n📋 Test Instructions:');
    console.log('1. Start your backend server: npm start');
    console.log('2. Open the payment page URL in your browser');
    console.log('3. Click "Pay Now" to see the MPGS hosted checkout');
    console.log('4. Use test card: 5123456789012346, expiry: 01/39, CVV: 100');
    console.log('5. Complete payment to test success callback');
    
  console.log('\n⚙️  Environment Variables Needed:');
  console.log('- MPGS_MERCHANT_ID (default: TESTNITEST2)');
  console.log('- MPGS_API_USERNAME (default: merchant.TESTNITEST2)');
  console.log('- MPGS_API_PASSWORD (bundled sandbox password available)');
  console.log('- MPGS_GATEWAY (default: https://test-network.mtf.gateway.mastercard.com)');
    console.log('- MPGS_RETURN_BASE_URL (for success callbacks)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    db.end();
  }
}

// Run if called directly
if (require.main === module) {
  testPaymentFlow();
}

module.exports = { createTestOrder, testPaymentFlow };
